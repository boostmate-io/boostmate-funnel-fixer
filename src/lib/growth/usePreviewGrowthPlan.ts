// Anonymous (pre-signup) Growth Roadmap derivation.
//
// Runs the SAME pure `derivePlan` evaluator the in-app roadmap uses, but
// against an empty signal context: no workspace, no progress rows, no cycle
// writes. The result is the full, ordered task list for the assessment's
// computed stage with nothing completed — exactly what the user will see
// inside the app right after claiming the assessment.

import { useCallback, useEffect, useState } from "react";
import { fetchActiveTasks } from "./tasksApi";
import { buildConditionContext } from "./buildConditionContext";
import { derivePlan, type CycleSnapshot, type DerivedTask } from "./taskTypes";
import type { GrowthAssessmentRow } from "./types";

interface UsePreviewGrowthPlanResult {
  loading: boolean;
  plan: DerivedTask[];
}

/** Synthetic cycle so `derivePlan` can scope stage tasks. Never persisted. */
function previewCycle(assessment: GrowthAssessmentRow): CycleSnapshot {
  return {
    id: "preview",
    stage: assessment.computed_stage,
    cycle_number: 1,
    started_at: assessment.created_at ?? new Date().toISOString(),
    ended_at: null,
    milestone_attested_at: null,
  };
}

export function usePreviewGrowthPlan(
  assessment: GrowthAssessmentRow | null,
): UsePreviewGrowthPlanResult {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DerivedTask[]>([]);

  const load = useCallback(async () => {
    if (!assessment) {
      setPlan([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tasks = await fetchActiveTasks();
      const ctx = buildConditionContext({
        stage: assessment.computed_stage,
        cycle: previewCycle(assessment),
        assessment,
      });
      const derived = derivePlan(tasks, [], ctx);
      // Anonymous users can complete nothing, so the honest preview state is
      // "first actionable task only". Every later task that would only unlock
      // after earlier work is shown locked — mirroring what the in-app
      // roadmap looks like the moment the assessment is claimed.
      let seenAvailable = false;
      const gated: DerivedTask[] = derived.tasks.map((d) => {
        if (d.status !== "available") return d;
        if (!seenAvailable) {
          seenAvailable = true;
          return d;
        }
        return { ...d, status: "locked", isActivated: false };
      });
      setPlan(gated);
    } catch (e) {
      console.error("usePreviewGrowthPlan failed", e);
      setPlan([]);
    } finally {
      setLoading(false);
    }
  }, [assessment]);

  useEffect(() => { load(); }, [load]);

  return { loading, plan };
}
