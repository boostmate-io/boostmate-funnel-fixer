// =============================================================================
// buildRoadmapSnapshot — condense the client-derived Growth Plan into a
// compact, cycle-aware payload the Coach edge function can consume without
// re-deriving the plan or hitting the DB again.
//
// Contract:
//   - Reads the SAME `plan` + `activeCycle` + `workspaceState` returned by
//     `useGrowthPlan` (pure derivation). This is the ONLY roadmap source of
//     truth passed to the Coach; the edge function must not fetch the plan.
//   - Includes canonical decision options and the Growth Systems catalog so
//     the server can validate decision writes against a fixed allowlist.
// =============================================================================

import type { DerivedTask, CycleSnapshot, TaskStatus } from "@/lib/growth/taskTypes";
import { DECISION_SPECS, isDecisionTask, readDecisionValue } from "@/lib/growth/decisionOptions";
import { getGrowthSystems } from "@/lib/growth/growthSystems";
import { resolveTaskResources } from "@/lib/growth/resourceResolver";
import type { CoachRoadmapSnapshot, CoachRoadmapResource } from "./types";

const OPEN_STATUSES: TaskStatus[] = ["available", "in_progress"];

function isRoadmapCompleted(state: Record<string, unknown>): boolean {
  return Boolean((state as { roadmap_completed?: unknown }).roadmap_completed);
}

export function buildRoadmapSnapshot(params: {
  plan: DerivedTask[];
  activeCycle: CycleSnapshot | null;
  workspaceState: Record<string, unknown>;
}): CoachRoadmapSnapshot {
  const { plan, activeCycle, workspaceState } = params;

  const foundationTasks = plan
    .filter((d) => d.task.stage === "any")
    .map((d) => ({ slug: d.task.slug, title: d.task.title, status: d.status }));

  const stageTasks = plan.filter((d) => d.task.stage !== "any");
  const openStageTasks = stageTasks.filter((d) => OPEN_STATUSES.includes(d.status));
  const focusDerived = openStageTasks[0] ?? null;

  const focusTask = focusDerived
    ? (() => {
        const slug = focusDerived.task.slug;
        const decisionSpec = isDecisionTask(slug) ? DECISION_SPECS[slug] : undefined;
        return {
          slug,
          title: focusDerived.task.title,
          description: focusDerived.task.description,
          stage: focusDerived.task.stage,
          status: focusDerived.status,
          isDecision: Boolean(decisionSpec),
          decisionStateKey: decisionSpec?.stateKey,
          decisionFreeText: decisionSpec?.freeText,
          decisionOptions: decisionSpec?.options?.map((o) => ({ value: o.value, label: o.label })),
          decisionCurrentValue: decisionSpec
            ? readDecisionValue(workspaceState, slug) ?? null
            : null,
        };
      })()
    : null;

  const upcomingTasks = openStageTasks.slice(1, 5).map((d) => ({
    slug: d.task.slug,
    title: d.task.title,
    status: d.status,
  }));

  const canonicalDecisions: CoachRoadmapSnapshot["canonicalDecisions"] = {};
  for (const [slug, spec] of Object.entries(DECISION_SPECS)) {
    canonicalDecisions[slug] = {
      stateKey: spec.stateKey,
      freeText: spec.freeText,
      values: spec.options?.map((o) => o.value),
    };
  }

  return {
    stage: activeCycle?.stage ?? null,
    cycleNumber: activeCycle?.cycle_number ?? null,
    cycleStartedAt: activeCycle?.started_at ?? null,
    milestoneAttestedAt: activeCycle?.milestone_attested_at ?? null,
    focusTask,
    upcomingTasks,
    foundationTasks,
    workspaceState,
    roadmapCompleted: isRoadmapCompleted(workspaceState),
    canonicalGrowthSystems: getGrowthSystems().map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary,
    })),
    canonicalDecisions,
  };
}
