// Growth Roadmap V2 — Layer-B state effects per task slug.
//
// When a roadmap task's status changes, `useGrowthPlan.updateStatus` mirrors
// that change into `growth_workspace_state.state` via the atomic
// `growth_workspace_state_set` RPC. This map is the single source of truth
// for that mirroring.
//
// Effect kinds:
//   - "boolean" — completion writes `{ [key]: true }`; any other status
//                 deletes the key (idempotent on re-completion).
//   - "none"    — task has no Layer-B side effect. Used for:
//                   * foundation tasks (progress lives elsewhere),
//                   * reassess tasks (status derived from cycle timestamps),
//                   * DECISION tasks — their real values (e.g. chosen channel,
//                     bottleneck, scaling lever) must be written by the UI
//                     that captures the decision (Build Guide / Coach), NOT
//                     by task completion. The roadmap intentionally stays
//                     blocked until a genuine decision value is stored via
//                     `cycleService.setWorkspaceState`.
//
// The `key` is a dotted path relative to `state`, matching the fact addresses
// used in seeded activation/completion conditions (e.g. `attract.chosenChannel`
// corresponds to fact `extras.attract.chosenChannel`).

export type TaskEffect =
  | { kind: "boolean"; key: string }
  | { kind: "none" };

export const TASK_STATE_EFFECTS: Record<string, TaskEffect> = {
  // Foundation
  "foundation-blueprint": { kind: "none" },

  // Validate — decision task: chosenPath (written by decision UI, not here)
  "validate-refine-offer": { kind: "boolean", key: "validate.offerReady" },
  "validate-choose-path": { kind: "none" },
  "validate-setup-tracking": { kind: "boolean", key: "validate.trackingReady" },
  "validate-activate-path": { kind: "boolean", key: "validate.pathActivated" },
  "validate-acquire-clients": { kind: "boolean", key: "validate.paidClientsAttested" },
  "validate-deliver-capture-proof": { kind: "boolean", key: "validate.proofCaptured" },
  "validate-reassess": { kind: "none" },

  // Attract — decision task: chosenChannel
  "attract-choose-channel": { kind: "none" },
  "attract-design-capture-path": { kind: "boolean", key: "attract.capturePathDesigned" },
  "attract-setup-tracking": { kind: "boolean", key: "attract.trackingReady" },
  "attract-build-capture-path": { kind: "boolean", key: "attract.capturePathBuilt" },
  "attract-activate-channel": { kind: "boolean", key: "attract.channelActivated" },
  "attract-reach-lead-volume": { kind: "boolean", key: "attract.leadVolumeAttested" },
  "attract-reassess": { kind: "none" },

  // Optimize — decision task: chosenBottleneck
  "optimize-identify-bottleneck": { kind: "none" },
  "optimize-define-target": { kind: "boolean", key: "optimize.targetDefined" },
  "optimize-strengthen-followup": { kind: "boolean", key: "optimize.followupImproved" },
  "optimize-run-experiment": { kind: "boolean", key: "optimize.experimentShipped" },
  "optimize-reach-target": { kind: "boolean", key: "optimize.targetHitAttested" },
  "optimize-reassess": { kind: "none" },

  // Scale — decision task: chosenLever
  "scale-confirm-economics": { kind: "boolean", key: "scale.economicsConfirmed" },
  "scale-choose-lever": { kind: "none" },
  "scale-prepare-capacity": { kind: "boolean", key: "scale.capacityReady" },
  "scale-activate-lever": { kind: "boolean", key: "scale.leverActivated" },
  "scale-sustain-acquisition": { kind: "boolean", key: "scale.sustainedAttested" },
  "scale-reassess": { kind: "none" },

  // Systemize — decision tasks: chosenProcess, chosenPath
  "systemize-inventory": { kind: "boolean", key: "systemize.processesInventoried" },
  "systemize-choose-process": { kind: "none" },
  "systemize-document": { kind: "boolean", key: "systemize.processDocumented" },
  "systemize-choose-path": { kind: "none" },
  "systemize-handoff": { kind: "boolean", key: "systemize.handoffExecuted" },
  "systemize-verify-reclaim": { kind: "boolean", key: "systemize.handoffVerifiedAttested" },
  "systemize-reassess": { kind: "none" },
};

/**
 * Given a task slug and its new status, compute the JSON patch + delete keys
 * to apply to `growth_workspace_state.state`. Returns `null` when there is
 * no effect (foundation/reassess/decision tasks, unknown slugs).
 *
 * A nested key like `"attract.capturePathBuilt"` is emitted as a nested patch
 * `{ attract: { capturePathBuilt: true } }` so the RPC's `||` merge preserves
 * sibling keys.
 */
export function effectForStatus(
  slug: string,
  status: string,
): { patch: Record<string, unknown>; deleteKeys: string[] } | null {
  const eff = TASK_STATE_EFFECTS[slug];
  if (!eff || eff.kind === "none") return null;

  const isCompleted = status === "completed";
  const segments = eff.key.split(".");

  if (isCompleted) {
    // Build nested patch { seg1: { seg2: true } }.
    let patch: Record<string, unknown> = { [segments[segments.length - 1]]: true };
    for (let i = segments.length - 2; i >= 0; i--) {
      patch = { [segments[i]]: patch };
    }
    return { patch, deleteKeys: [] };
  }
  // Any non-completed status clears the key. RPC handles dotted deletes.
  return { patch: {}, deleteKeys: [eff.key] };
}

// ---------------------------------------------------------------------------
// Per-stage cycle-reset map (documentation mirror).
//
// The authoritative reset happens inside the `growth_cycle_transition` RPC
// (action = "restart_cycle") in the same Postgres transaction that closes
// the old cycle and opens the new one — so the workspace never observes a
// partially-reset state.
//
// This TS map is the human-readable spec for what that RPC deletes, kept
// in sync so consumers can reason about durability without reading SQL.
//
// Durable (workspace-level, NEVER cleared on restart_cycle):
//   - Foundation facts (blueprint, ICP, core promise, offer catalog) — live
//     in dedicated tables, not in workspace state.
//   - `roadmap_completed*` — historical terminal record.
//   - Any keys outside the listed cycle namespace for the restarted stage.
//     Explicitly, restarting stage X never touches keys under other stages.
// ---------------------------------------------------------------------------

export const STAGE_CYCLE_RESET_KEYS: Record<
  "validate" | "attract" | "optimize" | "scale" | "systemize",
  string[]
> = {
  // All Validate facts are attempt-specific: a new cycle means the previous
  // validation did not stick, so path/tracking/proof are re-decided.
  validate: [
    "validate.offerReady",
    "validate.chosenPath",
    "validate.trackingReady",
    "validate.pathActivated",
    "validate.paidClientsAttested",
    "validate.proofCaptured",
  ],
  // All Attract facts are attempt-specific: channel choice, capture path
  // design/build, tracking, activation, and volume attestation reset.
  attract: [
    "attract.chosenChannel",
    "attract.capturePathDesigned",
    "attract.trackingReady",
    "attract.capturePathBuilt",
    "attract.channelActivated",
    "attract.leadVolumeAttested",
  ],
  // Optimize is inherently loopable: each cycle picks a new bottleneck,
  // sets a new target, runs a new experiment. Everything clears.
  optimize: [
    "optimize.chosenBottleneck",
    "optimize.targetDefined",
    "optimize.followupImproved",
    "optimize.experimentShipped",
    "optimize.targetHitAttested",
  ],
  // Scale: economics must be re-confirmed for the new push; lever, capacity
  // prep, activation and sustain attestation are all cycle-specific.
  scale: [
    "scale.economicsConfirmed",
    "scale.chosenLever",
    "scale.capacityReady",
    "scale.leverActivated",
    "scale.sustainedAttested",
  ],
  // Systemize preserves the cumulative process inventory (`processesInventoried`)
  // and any long-lived process history. Only the "current process being
  // systemized" branch resets.
  systemize: [
    "systemize.chosenProcess",
    "systemize.processDocumented",
    "systemize.chosenPath",
    "systemize.handoffExecuted",
    "systemize.handoffVerifiedAttested",
  ],
};
