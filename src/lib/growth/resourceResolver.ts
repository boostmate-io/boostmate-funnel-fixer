// Growth Roadmap V2 — resource dispatch resolver.
//
// Each task row carries a mix of shared resources (no `strategy` tag) and
// per-strategy resources (tagged with a value from the decision spec that
// governs that stage). At runtime the roadmap must only surface the shared
// resources plus the strategy-tagged resources whose tag matches the
// workspace's current decision value for the task's stage.
//
// Contract:
//   - Foundation tasks (`stage === "any"`): only shared resources.
//   - Stage tasks: shared + resources tagged with the active strategy value
//     for that stage. If no strategy has been chosen yet, only shared.
//
// This resolver is the single source of truth used by:
//   - GrowthPlanPanel (roadmap page)
//   - GrowthRoadmapOverview (dashboard focus / up-next)
//   - buildRoadmapSnapshot (AI Coach context)
//   - AdminGrowthRoadmapTasks StrategyPreview (admin preview)

import type { GrowthRoadmapTaskRow, TaskResource, TaskStage } from "./taskTypes";
import type { GrowthStage } from "./types";

/** Dotted key inside `growth_workspace_state.state` that acts as the
 *  strategy discriminator for resources tagged on tasks in that stage. */
export const STAGE_STRATEGY_KEYS: Record<GrowthStage, string> = {
  validate: "validate.chosenPath",
  attract: "attract.chosenChannel",
  optimize: "optimize.chosenBottleneck",
  scale: "scale.chosenLever",
  systemize: "systemize.chosenPath",
};

/** Read a dotted-path string value from the workspace state snapshot. */
export function readStateString(
  state: Record<string, unknown> | null | undefined,
  path: string,
): string | undefined {
  if (!state) return undefined;
  const parts = path.split(".");
  let cur: unknown = state;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" && cur.length > 0 ? cur : undefined;
}

/** Return the active strategy value for the task's stage, or undefined. */
export function activeStrategyForStage(
  stage: TaskStage,
  workspaceState: Record<string, unknown> | null | undefined,
): string | undefined {
  if (stage === "any") return undefined;
  const key = STAGE_STRATEGY_KEYS[stage as GrowthStage];
  if (!key) return undefined;
  return readStateString(workspaceState, key);
}

/**
 * Filter a task's raw `resources` array to only the entries a user should
 * currently see. Shared resources are always kept; strategy-tagged resources
 * are kept only when their `strategy` matches the active decision value for
 * the task's stage.
 */
export function resolveTaskResources(
  task: Pick<GrowthRoadmapTaskRow, "stage" | "resources">,
  workspaceState: Record<string, unknown> | null | undefined,
): TaskResource[] {
  const resources = task.resources ?? [];
  if (task.stage === "any") return resources.filter((r) => !r.strategy);
  const active = activeStrategyForStage(task.stage, workspaceState);
  return resources.filter((r) => !r.strategy || (active != null && r.strategy === active));
}

/** Admin preview helper: resolve resources as if a specific strategy value
 *  were active for this stage. Used by AdminGrowthRoadmapTasks so admins see
 *  the exact runtime list per strategy option. */
export function resolveTaskResourcesForStrategy(
  resources: TaskResource[],
  stage: TaskStage,
  strategyValue: string | undefined,
): TaskResource[] {
  if (stage === "any") return resources.filter((r) => !r.strategy);
  return resources.filter(
    (r) => !r.strategy || (strategyValue != null && r.strategy === strategyValue),
  );
}
