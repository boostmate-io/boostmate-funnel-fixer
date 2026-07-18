// =============================================================================
// AI Coach — universal CoachContext contract.
// Every touchpoint (Blueprint field/section, Copy Component, Funnel node, Global)
// builds one of these and passes it to the same Coach engine. The engine is
// scope-agnostic — it only reads this shape.
// =============================================================================

import type { BlueprintRow } from "@/components/business-blueprint/types";

export type CoachScope =
  | "blueprint.field"
  | "blueprint.section"
  | "copy.component"
  | "funnel.node"
  | "global";

export type CoachTargetKind = "text" | "chips" | "tags" | "structured";

/**
 * Optional metadata declaring that the coach target is a LIST section — a
 * container into which the Coach can propose ONE OR MORE new items at once
 * (e.g. Framework Pillars, Deliverables, Bonuses…). Item paths in
 * `blueprint_writes` will look like `<basePath>.new_<n>.<fieldKey>`.
 */
export interface CoachListSectionMeta {
  basePath: string;
  itemFields: { key: string; label: string; kind?: "text" | "textarea"; helper?: string }[];
  currentCount: number;
  suggestedCount?: [number, number];
}

export interface CoachTarget {
  id: string;
  label: string;
  kind: CoachTargetKind;
  currentValue: string | null;
  helper?: string;
  placeholder?: string;
  listSection?: CoachListSectionMeta;
}

/**
 * Cycle-aware Growth Roadmap snapshot passed to the Coach so it can ground
 * global-scope advice in the user's *actual* current stage, cycle, and
 * focus task — without the server re-deriving the plan. The client is the
 * source of truth: `useGrowthPlan` runs the pure `derivePlan` and this
 * snapshot mirrors its output.
 */
export interface CoachRoadmapDecisionOption {
  value: string;
  label: string;
}
export interface CoachRoadmapFocusTask {
  slug: string;
  title: string;
  description: string;
  stage: string;
  status: string;
  isDecision: boolean;
  decisionStateKey?: string;
  decisionCurrentValue?: string | null;
  decisionFreeText?: boolean;
  decisionOptions?: CoachRoadmapDecisionOption[];
}
export interface CoachRoadmapSnapshot {
  stage: string | null;
  cycleNumber: number | null;
  cycleStartedAt: string | null;
  milestoneAttestedAt: string | null;
  focusTask: CoachRoadmapFocusTask | null;
  upcomingTasks: { slug: string; title: string; status: string }[];
  foundationTasks: { slug: string; title: string; status: string }[];
  workspaceState: Record<string, unknown>;
  roadmapCompleted: boolean;
  canonicalGrowthSystems: { id: string; name: string; summary: string }[];
  /** Canonical decision spec keyed by task slug — server validates writes against this. */
  canonicalDecisions: Record<
    string,
    { stateKey: string; freeText?: boolean; values?: string[] }
  >;
}

export interface CoachContext {
  scope: CoachScope;
  target: CoachTarget | null;
  intent: "help" | "improve" | "generate" | "freeform";
  businessContext: {
    subAccountId: string;
    blueprintSnapshot: BlueprintRow | null;
    activeOfferId?: string;
    routeHint?: string;
    /** UI locale, e.g. "en" or "nl". Coach replies in this language. */
    locale?: string;
    /** Present on global scope when the workspace has an active roadmap. */
    roadmapSnapshot?: CoachRoadmapSnapshot | null;
  };
}

// -----------------------------------------------------------------------------
// Message part shapes (used by client + persisted in ai_coach_messages.parts)
// -----------------------------------------------------------------------------

export interface CoachBlueprintWrite {
  path: string; // dot-path e.g. "customer_clarity.avatar_who"
  label: string;
  value: string;
}

export interface CoachGrowthDecision {
  /** Task slug the decision resolves (e.g. "attract-choose-channel"). */
  taskSlug: string;
  /** Dotted key inside `growth_workspace_state.state`. */
  stateKey: string;
  /** The value to write. For enumerated decisions this MUST match one of the
   *  canonical option values; for free-text decisions any non-empty string. */
  value: string;
  /** Human-readable label shown in the UI card. */
  label: string;
}

export type CoachMessagePart =
  | { type: "text"; text: string }
  | { type: "proposal"; value: string; reasoning?: string }
  | { type: "quick_replies"; replies: string[] }
  | { type: "memory_saved"; key: string; value: string }
  | {
      type: "blueprint_writes";
      writes: CoachBlueprintWrite[];
      reasoning?: string;
    }
  | {
      type: "growth_decision";
      decision: CoachGrowthDecision;
      reasoning?: string;
    };

export interface CoachMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  parts: CoachMessagePart[];
  created_at?: string;
}
