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

export type CoachFocusMode = "field" | "section" | "walkthrough" | "task" | "general";

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

  // Openers stay deliberately minimal: the Coach decides — based on the current
  // Blueprint state — whether to ask questions, give feedback or suggest
  // improvements. The UI never asks it to draft or propose an answer up front.
  switch (focus.mode ?? "general") {
    case "field":
      return nl
        ? `Laten we focussen op het veld "${label}".`
        : `Let's focus on the "${label}" field.`;
    case "section":
      return nl
        ? `Laten we het hebben over "${label}".`
        : `Let's talk about "${label}".`;
    case "walkthrough":
      return nl
        ? `Loop met me door "${label}". Begin bij het eerste veld dat nu nog leeg is in de Blueprint (besproken is niet hetzelfde als ingevuld).`
        : `Walk me through "${label}". Start at the first field that is still empty in the current Blueprint (discussed is not the same as filled in).`;
    case "task":
      return nl
        ? `Laten we werken aan "${label}".`
        : `Let's work on "${label}".`;
    default:
      return nl ? `Laten we focussen op "${label}".` : `Let's focus on "${label}".`;
  }
}


/** Re-entry recap turn, used when the user returns after a long break. */
export function buildResumeTurnText(locale: string | undefined): string {
  const nl = (locale ?? "en").toLowerCase().slice(0, 2) === "nl";
  return nl
    ? "Ik ben er weer. Geef een korte recap van waar we gebleven waren en wat de logische volgende stap is."
    : "I'm back. Give me a short recap of where we left off and what the logical next step is.";
}
