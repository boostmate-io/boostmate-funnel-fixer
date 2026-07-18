// Growth Roadmap V2 — Layer-B state effects per task slug.
//
// When a roadmap task's status changes, `useGrowthPlan.updateStatus` mirrors
// that change into `growth_workspace_state.state` via the atomic
// `growth_workspace_state_set` RPC. This map is the single source of truth
// for that mirroring.
//
// Effect kinds:
//   - "boolean"  — completion writes `{ [key]: true }`; any other status
//                  deletes the key (idempotent on re-completion).
//   - "decision" — decision-type task. Completion writes a placeholder
//                  `"unspecified"` so downstream `truthy` activation resolves;
//                  un-complete deletes. Real decision values will be written
//                  by the Build Guide UI via `cycleService.setWorkspaceState`.
//   - "none"     — task has no Layer-B side effect (foundation task, reassess
//                  tasks whose completion is derived from cycle milestone
//                  timestamps, milestone tasks whose reassess relies on the
//                  cycle row rather than a state key).
//
// The `key` is a dotted path relative to `state`, matching the fact addresses
// used in seeded activation/completion conditions (e.g. `attract.chosenChannel`
// corresponds to fact `extras.attract.chosenChannel`).

export type TaskEffect =
  | { kind: "boolean"; key: string }
  | { kind: "decision"; key: string }
  | { kind: "none" };

export const TASK_STATE_EFFECTS: Record<string, TaskEffect> = {
  // Foundation
  "foundation-blueprint": { kind: "none" },

  // Validate
  "validate-refine-offer": { kind: "boolean", key: "validate.offerReady" },
  "validate-choose-path": { kind: "decision", key: "validate.chosenPath" },
  "validate-setup-tracking": { kind: "boolean", key: "validate.trackingReady" },
  "validate-activate-path": { kind: "boolean", key: "validate.pathActivated" },
  "validate-acquire-clients": { kind: "boolean", key: "validate.paidClientsAttested" },
  "validate-deliver-capture-proof": { kind: "boolean", key: "validate.proofCaptured" },
  "validate-reassess": { kind: "none" },

  // Attract
  "attract-choose-channel": { kind: "decision", key: "attract.chosenChannel" },
  "attract-design-capture-path": { kind: "boolean", key: "attract.capturePathDesigned" },
  "attract-setup-tracking": { kind: "boolean", key: "attract.trackingReady" },
  "attract-build-capture-path": { kind: "boolean", key: "attract.capturePathBuilt" },
  "attract-activate-channel": { kind: "boolean", key: "attract.channelActivated" },
  "attract-reach-lead-volume": { kind: "boolean", key: "attract.leadVolumeAttested" },
  "attract-reassess": { kind: "none" },

  // Optimize
  "optimize-identify-bottleneck": { kind: "decision", key: "optimize.chosenBottleneck" },
  "optimize-define-target": { kind: "boolean", key: "optimize.targetDefined" },
  "optimize-strengthen-followup": { kind: "boolean", key: "optimize.followupImproved" },
  "optimize-run-experiment": { kind: "boolean", key: "optimize.experimentShipped" },
  "optimize-reach-target": { kind: "boolean", key: "optimize.targetHitAttested" },
  "optimize-reassess": { kind: "none" },

  // Scale
  "scale-confirm-economics": { kind: "boolean", key: "scale.economicsConfirmed" },
  "scale-choose-lever": { kind: "decision", key: "scale.chosenLever" },
  "scale-prepare-capacity": { kind: "boolean", key: "scale.capacityReady" },
  "scale-activate-lever": { kind: "boolean", key: "scale.leverActivated" },
  "scale-sustain-acquisition": { kind: "boolean", key: "scale.sustainedAttested" },
  "scale-reassess": { kind: "none" },

  // Systemize
  "systemize-inventory": { kind: "boolean", key: "systemize.processesInventoried" },
  "systemize-choose-process": { kind: "decision", key: "systemize.chosenProcess" },
  "systemize-document": { kind: "boolean", key: "systemize.processDocumented" },
  "systemize-choose-path": { kind: "decision", key: "systemize.chosenPath" },
  "systemize-handoff": { kind: "boolean", key: "systemize.handoffExecuted" },
  "systemize-verify-reclaim": { kind: "boolean", key: "systemize.handoffVerifiedAttested" },
  "systemize-reassess": { kind: "none" },
};

/**
 * Given a task slug and its new status, compute the JSON patch + delete keys
 * to apply to `growth_workspace_state.state`. Returns `null` when there is
 * no effect (foundation/reassess tasks, unknown slugs).
 *
 * A nested key like `"attract.chosenChannel"` is emitted as a nested patch
 * `{ attract: { chosenChannel: true } }` so the RPC's `||` merge preserves
 * sibling keys.
 */
export function effectForStatus(
  slug: string,
  status: "not_started" | "in_progress" | "completed" | "skipped",
): { patch: Record<string, unknown>; deleteKeys: string[] } | null {
  const eff = TASK_STATE_EFFECTS[slug];
  if (!eff || eff.kind === "none") return null;

  const value: unknown = eff.kind === "boolean" ? true : "unspecified";
  const isCompleted = status === "completed";
  const segments = eff.key.split(".");

  if (isCompleted) {
    // Build nested patch { seg1: { seg2: value } }.
    let patch: Record<string, unknown> = { [segments[segments.length - 1]]: value };
    for (let i = segments.length - 2; i >= 0; i--) {
      patch = { [segments[i]]: patch };
    }
    return { patch, deleteKeys: [] };
  }
  // Any non-completed status clears the key. RPC handles dotted deletes.
  return { patch: {}, deleteKeys: [eff.key] };
}
