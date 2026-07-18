// =============================================================================
// Scope-specific CoachContext builders.
// Add a new builder here when a new module plugs into the Coach engine.
// =============================================================================

import i18n from "@/i18n";
import type { BlueprintRow } from "@/components/business-blueprint/types";
import type { CoachContext, CoachTarget } from "./types";

const currentLocale = () => (i18n.language ?? "en").split("-")[0];

interface BlueprintFieldSpec {
  id: string;          // stable field key (e.g. "avatar_who")
  label: string;
  helper?: string;
  placeholder?: string;
  currentValue: string | null;
  kind?: CoachTarget["kind"];
}

export function buildBlueprintFieldContext(
  spec: BlueprintFieldSpec,
  blueprint: BlueprintRow | null,
  subAccountId: string,
): CoachContext {
  return {
    scope: "blueprint.field",
    intent: spec.currentValue?.trim() ? "improve" : "generate",
    target: {
      id: spec.id,
      label: spec.label,
      kind: spec.kind ?? "text",
      currentValue: spec.currentValue,
      helper: spec.helper,
      placeholder: spec.placeholder,
    },
    businessContext: {
      subAccountId,
      blueprintSnapshot: blueprint,
      locale: currentLocale(),
    },
  };
}

/**
 * Section-level Coach entry — covers a full Blueprint section
 * (e.g. "Proof & Authority") instead of one specific field. The engine
 * will NOT propose a replacement value; it acts as a strategist.
 */
export function buildBlueprintSectionContext(
  sectionId: string,
  sectionLabel: string,
  blueprint: BlueprintRow | null,
  subAccountId: string,
): CoachContext {
  return {
    scope: "blueprint.section",
    intent: "freeform",
    target: {
      id: `section:${sectionId}`,
      label: sectionLabel,
      kind: "structured",
      currentValue: null,
    },
    businessContext: {
      subAccountId,
      blueprintSnapshot: blueprint,
      locale: currentLocale(),
    },
  };
}

/**
 * List-section Coach — coach the user on populating a container list
 * (Framework Pillars, Deliverables, Bonuses, …). Renders in the same
 * Coach engine as blueprint.section but with `target.listSection` so the
 * edge function can propose multiple new items in a single turn.
 */
interface BlueprintListSectionSpec {
  id: string;
  label: string;
  helper?: string;
  basePath: string;
  itemFields: { key: string; label: string; kind?: "text" | "textarea"; helper?: string }[];
  currentCount: number;
  suggestedCount?: [number, number];
}

export function buildBlueprintListSectionContext(
  spec: BlueprintListSectionSpec,
  blueprint: BlueprintRow | null,
  subAccountId: string,
): CoachContext {
  return {
    scope: "blueprint.section",
    intent: "generate",
    target: {
      id: `list:${spec.id}`,
      label: spec.label,
      kind: "structured",
      currentValue: null,
      helper: spec.helper,
      listSection: {
        basePath: spec.basePath,
        itemFields: spec.itemFields,
        currentCount: spec.currentCount,
        suggestedCount: spec.suggestedCount,
      },
    },
    businessContext: {
      subAccountId,
      blueprintSnapshot: blueprint,
      locale: currentLocale(),
    },
  };
}

/**
 * Global Growth Strategist — no specific target, full blueprint context.
 * Used by the floating Coach bubble.
 */
/**
 * Global Growth Strategist — no specific target, full blueprint context.
 * Used by the floating Coach bubble. When present, `roadmapSnapshot` grounds
 * the Coach in the workspace's current cycle-aware Growth Plan.
 */
export function buildGlobalContext(
  blueprint: BlueprintRow | null,
  subAccountId: string,
  routeHint?: string,
  roadmapSnapshot?: import("./types").CoachRoadmapSnapshot | null,
): CoachContext {
  return {
    scope: "global",
    intent: "freeform",
    target: null,
    businessContext: {
      subAccountId,
      blueprintSnapshot: blueprint,
      routeHint,
      locale: currentLocale(),
      roadmapSnapshot: roadmapSnapshot ?? null,
    },
  };
}
