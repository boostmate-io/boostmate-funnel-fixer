// =============================================================================
// Scope-specific CoachContext builders.
// Add a new builder here when a new module plugs into the Coach engine.
// =============================================================================

import type { BlueprintRow } from "@/components/business-blueprint/types";
import type { CoachContext, CoachTarget } from "./types";

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
    },
  };
}
