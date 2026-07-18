import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveTasks, fetchProgressForWorkspace, setTaskStatus } from "./tasksApi";
import { buildConditionContext } from "./buildConditionContext";
import { derivePlan, type DerivedTask, type GrowthPlan, type TaskStatus, type CycleSnapshot } from "./taskTypes";
import {
  fetchActiveCycles,
  fetchWorkspaceState,
  startInitialCycle,
  attestMilestone,
  clearMilestone,
  setWorkspaceState,
  type StageCycleRow,
} from "./cycleService";
import { effectForStatus } from "./taskEffects";
import type { GrowthAssessmentRow, GrowthStage } from "./types";

interface UseGrowthPlanResult {
  loading: boolean;
  plan: DerivedTask[];
  activeCycle: CycleSnapshot | null;
  needsCycleBootstrap: boolean;
  refresh: () => Promise<void>;
  updateStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}

/** Slug of the milestone task for each stage. Completing/uncompleting one of
 *  these mirrors to `cycle.milestone_attested_at` via cycleService. Any other
 *  task slug is a normal task-progress write only. */
const MILESTONE_SLUG_BY_STAGE: Record<GrowthStage, string> = {
  validate: "validate-deliver-capture-proof",
  attract: "attract-reach-lead-volume",
  optimize: "optimize-reach-target",
  scale: "scale-sustain-acquisition",
  systemize: "systemize-verify-reclaim",
};

function toSnapshot(row: StageCycleRow | undefined): CycleSnapshot | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    stage: row.stage,
    cycle_number: row.cycle_number,
    started_at: row.started_at,
    ended_at: row.ended_at,
    milestone_attested_at: row.milestone_attested_at,
  };
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

      // Invariant: at most one active cycle per workspace.
      const cycle = toSnapshot(cycles[0]);

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

      if (derived.needsCycleBootstrap && assessment.computed_stage) {
        try {
          await startInitialCycle(subAccountId, assessment.computed_stage, "hook_bootstrap");
        } catch (e) {
          console.error("useGrowthPlan.bootstrap failed", e);
        }
        const cyclesAfter = await fetchActiveCycles(subAccountId);
        const bootstrapped = toSnapshot(cyclesAfter[0]);
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
    const derivedTask = plan.find((d) => d.task.id === taskId);
    if (!derivedTask) return;

    const isFoundation = derivedTask.task.stage === "any";
    const cycleId = isFoundation ? null : (activeCycle?.id ?? null);
    if (!isFoundation && !cycleId) {
      console.warn("updateStatus called for stage task without active cycle");
      return;
    }

    // 1. Persist the task progress row (cycle-scoped for stage tasks).
    await setTaskStatus(subAccountId, taskId, status, cycleId);

    // 2. Mirror to the cycle's milestone attestation when the task being
    //    updated is the active stage's milestone task. Milestone timestamps
    //    NEVER live in workspace_state — they live on the cycle row itself,
    //    so a fresh cycle always starts with milestone_attested_at = NULL.
    if (activeCycle && !isFoundation) {
      const milestoneSlug = MILESTONE_SLUG_BY_STAGE[activeCycle.stage];
      if (derivedTask.task.slug === milestoneSlug) {
        try {
          if (status === "completed") {
            await attestMilestone({
              subAccountId,
              expectedCycleId: activeCycle.id,
              reason: "milestone_task_completed",
            });
          } else {
            // Any non-completed status clears the cycle's milestone attestation.
            // Idempotent server-side: no-op when nothing was attested.
            await clearMilestone({
              subAccountId,
              expectedCycleId: activeCycle.id,
              reason: "milestone_task_uncompleted",
            });
          }
        } catch (e) {
          console.error("useGrowthPlan.milestoneSync failed", e);
        }
      }
    }

    await refresh();
  }, [subAccountId, refresh, plan, activeCycle]);

  return { loading, plan, activeCycle, needsCycleBootstrap, refresh, updateStatus };
}
