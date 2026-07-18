import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveTasks, fetchProgressForWorkspace, setTaskStatus } from "./tasksApi";
import { buildConditionContext } from "./buildConditionContext";
import { derivePlan, type DerivedTask, type GrowthPlan, type TaskStatus, type CycleSnapshot } from "./taskTypes";
import { fetchActiveCycles, fetchWorkspaceState, startInitialCycle } from "./cycleService";
import type { GrowthAssessmentRow } from "./types";

interface UseGrowthPlanResult {
  loading: boolean;
  plan: DerivedTask[];
  activeCycle: CycleSnapshot | null;
  needsCycleBootstrap: boolean;
  refresh: () => Promise<void>;
  updateStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}

/**
 * Composes the workspace Growth Plan by fetching the task catalog, cycle-
 * scoped progress, Layer-B workspace state, blueprint / offer / funnel /
 * analytics signals, and running them through the pure `derivePlan` evaluator.
 *
 * If no active cycle exists and the assessment has a computed stage, this
 * hook bootstraps the initial cycle via `cycleService.startInitialCycle`
 * (the ONE side-effectful call permitted here — cycle transitions live in
 * the cycle service, never inside `derivePlan`).
 */
export function useGrowthPlan(subAccountId: string | null, assessment: GrowthAssessmentRow | null): UseGrowthPlanResult {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DerivedTask[]>([]);
  const [activeCycle, setActiveCycle] = useState<CycleSnapshot | null>(null);
  const [needsCycleBootstrap, setNeedsCycleBootstrap] = useState(false);

  const refresh = useCallback(async () => {
    if (!subAccountId || !assessment) {
      setPlan([]);
      setActiveCycle(null);
      setNeedsCycleBootstrap(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tasks, progress, bpRes, offersRes, funnelsRes, analyticsRes, cycles, wsState] =
        await Promise.all([
          fetchActiveTasks(),
          fetchProgressForWorkspace(subAccountId),
          supabase.from("business_blueprints").select("*").eq("sub_account_id", subAccountId).maybeSingle(),
          supabase.from("offers").select("tier").eq("sub_account_id", subAccountId),
          supabase.from("funnels").select("share_token").eq("sub_account_id", subAccountId),
          supabase.from("funnel_analytics_entries").select("date").eq("sub_account_id", subAccountId).order("date", { ascending: false }).limit(1),
          fetchActiveCycles(subAccountId),
          fetchWorkspaceState(subAccountId),
        ]);

      // At most one active cycle per workspace (DB-enforced invariant).
      const cycle: CycleSnapshot | undefined = cycles[0]
        ? {
            id: cycles[0].id,
            stage: cycles[0].stage,
            cycle_number: cycles[0].cycle_number,
            started_at: cycles[0].started_at,
            ended_at: cycles[0].ended_at,
          }
        : undefined;

      const ctx = buildConditionContext({
        stage: cycle?.stage ?? assessment.computed_stage,
        cycle,
        assessment,
        blueprint: bpRes.data as Record<string, unknown> | null,
        offers: (offersRes.data ?? []) as Array<{ tier?: string | null }>,
        funnels: (funnelsRes.data ?? []) as Array<{ share_token?: string | null }>,
        analyticsEntries: ((analyticsRes.data ?? []) as Array<{ date?: string | null }>).map((e) => ({ entry_date: e.date })),
        workspaceState: wsState,
      });

      const derived: GrowthPlan = derivePlan(tasks, progress, ctx);

      // Bootstrap the initial cycle if the workspace has an assessment stage
      // but no active cycle yet. This is the only write-side call in this hook
      // and it is delegated to the cycle service.
      if (derived.needsCycleBootstrap && assessment.computed_stage) {
        try {
          await startInitialCycle(subAccountId, assessment.computed_stage, "hook_bootstrap");
        } catch (e) {
          console.error("useGrowthPlan.bootstrap failed", e);
        }
        // Re-fetch after bootstrap so the plan reflects the new cycle.
        const cyclesAfter = await fetchActiveCycles(subAccountId);
        const bootstrapped: CycleSnapshot | undefined = cyclesAfter[0]
          ? {
              id: cyclesAfter[0].id,
              stage: cyclesAfter[0].stage,
              cycle_number: cyclesAfter[0].cycle_number,
              started_at: cyclesAfter[0].started_at,
              ended_at: cyclesAfter[0].ended_at,
            }
          : undefined;
        const ctx2 = { ...ctx, cycle: bootstrapped, stage: bootstrapped?.stage ?? ctx.stage };
        const derived2 = derivePlan(tasks, progress, ctx2);
        setPlan(derived2.tasks);
        setActiveCycle(bootstrapped ?? null);
        setNeedsCycleBootstrap(derived2.needsCycleBootstrap);
      } else {
        setPlan(derived.tasks);
        setActiveCycle(derived.activeCycle ?? null);
        setNeedsCycleBootstrap(derived.needsCycleBootstrap);
      }
    } catch (e) {
      console.error("useGrowthPlan.refresh failed", e);
      setPlan([]);
      setActiveCycle(null);
      setNeedsCycleBootstrap(false);
    } finally {
      setLoading(false);
    }
  }, [subAccountId, assessment]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    if (!subAccountId) return;
    // Foundation tasks (stage='any') are cycle-less; stage tasks scoped to active cycle.
    const derivedTask = plan.find((d) => d.task.id === taskId);
    const isFoundation = derivedTask?.task.stage === "any";
    const cycleId = isFoundation ? null : (activeCycle?.id ?? null);
    if (!isFoundation && !cycleId) {
      console.warn("updateStatus called for stage task without active cycle");
      return;
    }
    await setTaskStatus(subAccountId, taskId, status, cycleId);
    await refresh();
  }, [subAccountId, refresh, plan, activeCycle]);

  return { loading, plan, activeCycle, needsCycleBootstrap, refresh, updateStatus };
}
