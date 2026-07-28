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
  previousLabel: string | null,
  locale: string | undefined,
): string {
  if (focus.seed) return focus.seed;
  const nl = (locale ?? "en").toLowerCase().slice(0, 2) === "nl";
  const label = focus.label;

  const lead =
    previousLabel && previousLabel !== label
      ? nl
        ? `We schakelen van **${previousLabel}** naar **${label}**.`
        : `Let's switch from **${previousLabel}** to **${label}**.`
      : nl
        ? `Laten we focussen op **${label}**.`
        : `Let's focus on **${label}**.`;

  const ask = (() => {
    switch (focus.mode ?? "general") {
      case "field":
        return nl
          ? "Help me dit veld scherp te krijgen en stel een concrete waarde voor die ik kan toepassen."
          : "Help me sharpen this field and propose a concrete value I can apply.";
      case "section":
        return nl
          ? "Leg uit waarom dit onderdeel belangrijk is voor mijn business en hoe ik het het beste aanpak."
          : "Explain why this part matters for my business and how I should approach it.";
      case "walkthrough":
        return nl
          ? "Loop veld voor veld met me door deze sectie. Begin bij het eerste veld dat nu nog leeg is in de Blueprint (eerder besproken is niet hetzelfde als ingevuld): stel per veld gerichte vragen, geef feedback op wat er al staat en stel daarna Blueprint-updates voor die ik kan toepassen."
          : "Walk me through this section field by field. Start at the first field that is still empty in the current Blueprint (discussed is not the same as filled in): ask focused questions per field, give feedback on what's already there, then propose Blueprint updates I can apply.";
      case "task":
        return nl
          ? "Help me deze roadmap-taak stap voor stap af te ronden."
          : "Help me work through this roadmap task step by step.";
      default:
        return nl ? "Waar moet ik me nu op richten?" : "What should I focus on here?";
    }
  })();

  const bridge = nl
    ? "Bouw voort op wat we eerder hebben besproken — begin niet opnieuw."
    : "Build on what we already discussed — don't start over.";

  return `${lead} ${ask} ${bridge}`;
}

/** Re-entry recap turn, used when the user returns after a long break. */
export function buildResumeTurnText(locale: string | undefined): string {
  const nl = (locale ?? "en").toLowerCase().slice(0, 2) === "nl";
  return nl
    ? "Ik ben er weer. Geef een korte recap van waar we gebleven waren en wat de logische volgende stap is."
    : "I'm back. Give me a short recap of where we left off and what the logical next step is.";
}
