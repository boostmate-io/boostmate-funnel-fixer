import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveTasks, fetchProgressForWorkspace, setTaskStatus } from "./tasksApi";
import { buildConditionContext } from "./buildConditionContext";
import { derivePlan, type DerivedTask, type TaskStatus } from "./taskTypes";
import type { GrowthAssessmentRow } from "./types";

interface UseGrowthPlanResult {
  loading: boolean;
  plan: DerivedTask[];
  refresh: () => Promise<void>;
  updateStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}

/**
 * Composes the workspace Growth Plan by fetching the task catalog, workspace
 * progress, blueprint / offer / funnel / analytics signals, and running them
 * through the deterministic evaluator.
 */
export function useGrowthPlan(subAccountId: string | null, assessment: GrowthAssessmentRow | null): UseGrowthPlanResult {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DerivedTask[]>([]);

  const refresh = useCallback(async () => {
    if (!subAccountId || !assessment) {
      setPlan([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tasks, progress, bpRes, offersRes, funnelsRes, analyticsRes] = await Promise.all([
        fetchActiveTasks(),
        fetchProgressForWorkspace(subAccountId),
        supabase.from("business_blueprints").select("*").eq("sub_account_id", subAccountId).maybeSingle(),
        supabase.from("offers").select("tier").eq("sub_account_id", subAccountId),
        supabase.from("funnels").select("share_token").eq("sub_account_id", subAccountId),
        supabase.from("funnel_analytics_entries").select("date").eq("sub_account_id", subAccountId).order("date", { ascending: false }).limit(1),
      ]);

      const ctx = buildConditionContext({
        stage: assessment.computed_stage,
        assessment,
        blueprint: bpRes.data as Record<string, unknown> | null,
        offers: (offersRes.data ?? []) as Array<{ tier?: string | null }>,
        funnels: (funnelsRes.data ?? []) as Array<{ share_token?: string | null }>,
        analyticsEntries: ((analyticsRes.data ?? []) as Array<{ date?: string | null }>).map((e) => ({ entry_date: e.date })),
      });

      setPlan(derivePlan(tasks, progress, ctx));
    } catch (e) {
      console.error("useGrowthPlan.refresh failed", e);
      setPlan([]);
    } finally {
      setLoading(false);
    }
  }, [subAccountId, assessment]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    if (!subAccountId) return;
    await setTaskStatus(subAccountId, taskId, status);
    await refresh();
  }, [subAccountId, refresh]);

  return { loading, plan, refresh, updateStatus };
}
