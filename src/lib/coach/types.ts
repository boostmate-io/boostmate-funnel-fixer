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

export interface CoachTarget {
  id: string;
  label: string;
  kind: CoachTargetKind;
  currentValue: string | null;
  helper?: string;
  placeholder?: string;
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

export type CoachMessagePart =
  | { type: "text"; text: string }
  | { type: "proposal"; value: string; reasoning?: string }
  | { type: "quick_replies"; replies: string[] }
  | { type: "memory_saved"; key: string; value: string }
  | {
      type: "blueprint_writes";
      writes: CoachBlueprintWrite[];
      reasoning?: string;
    };

export interface CoachMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  parts: CoachMessagePart[];
  created_at?: string;
}
