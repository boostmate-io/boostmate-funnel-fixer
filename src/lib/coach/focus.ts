// =============================================================================
// Coach focus turns.
//
// The AI Coach is ONE conversation per (user, workspace). Every entry point
// (field button, section help, section walkthrough, roadmap task, global
// bubble) does NOT start a new chat — it injects a short "focus turn" into the
// existing conversation so the Coach naturally bridges from the previous topic
// to the new one.
// =============================================================================

import type { CoachBlueprintWrite, CoachContext, CoachScope, CoachTarget } from "./types";
import type { BlueprintRow } from "@/components/business-blueprint/types";

export type CoachFocusMode = "field" | "section" | "explain" | "walkthrough" | "task" | "general";

export interface CoachFocus {
  /** Stable key — the focus turn is injected once per key. */
  key: string;
  /** Human label shown in the panel header and in the focus turn. */
  label: string;
  scope: CoachScope;
  mode?: CoachFocusMode;
  target?: CoachTarget | null;
  intent?: CoachContext["intent"];
  /** Optional local snapshot (e.g. unsaved editor state). */
  blueprintSnapshot?: BlueprintRow | null;
  /** Overrides the generated focus turn text. */
  seed?: string;
  onApply?: (value: string) => void;
  onApplyBlueprintWrites?: (writes: CoachBlueprintWrite[]) => Promise<void> | void;
}

/** Derive a focus from an already-built CoachContext. */
export function focusFromContext(
  context: CoachContext,
  extra: Omit<CoachFocus, "scope" | "target" | "label" | "intent"> & { label?: string },
): CoachFocus {
  return {
    scope: context.scope,
    target: context.target,
    intent: context.intent,
    label: extra.label ?? context.target?.label ?? "Growth Strategist",
    blueprintSnapshot: extra.blueprintSnapshot ?? context.businessContext.blueprintSnapshot ?? null,
    ...extra,
    key: extra.key,
  };
}

/**
 * Build the short user-visible turn that shifts the conversation's focus.
 * Never contains internal instruction-block content.
 */
export function buildFocusTurnText(
  focus: CoachFocus,
  _previousLabel: string | null,
  locale: string | undefined,
): string {
  if (focus.seed) return focus.seed;
  const nl = (locale ?? "en").toLowerCase().slice(0, 2) === "nl";
  const label = focus.label;

  // Openers only express the user's intent. Internal coaching behaviour
  // (where to start, what counts as complete, when to propose) is handled
  // server-side and must never leak into the visible message.
  switch (focus.mode ?? "general") {
    case "field":
      return nl
        ? `Laten we werken aan het veld "${label}".`
        : `Let's work on the "${label}" field.`;
    case "explain":
      return nl
        ? `Kan je de sectie "${label}" uitleggen? Waarom is die belangrijk en hoe pak ik die het beste aan?`
        : `Can you explain the "${label}" section — why it matters and how to approach it?`;
    case "section":
      return nl
        ? `Laten we samen door de sectie "${label}" lopen.`
        : `Let's work through the "${label}" section together.`;
    case "walkthrough":
      return nl
        ? `Laten we samen door de sectie "${label}" lopen en alle velden invullen.`
        : `Let's work through the "${label}" section together and complete all fields.`;
    case "task":
      return nl
        ? `Laten we werken aan "${label}".`
        : `Let's work on "${label}".`;
    default:
      return nl ? `Laten we werken aan "${label}".` : `Let's work on "${label}".`;
  }
}



/** Re-entry recap turn, used when the user returns after a long break. */
export function buildResumeTurnText(locale: string | undefined): string {
  const nl = (locale ?? "en").toLowerCase().slice(0, 2) === "nl";
  return nl
    ? "Ik ben er weer. Geef een korte recap van waar we gebleven waren en wat de logische volgende stap is."
    : "I'm back. Give me a short recap of where we left off and what the logical next step is.";
}
