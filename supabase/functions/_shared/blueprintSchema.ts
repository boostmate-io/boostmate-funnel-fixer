// =============================================================================
// DEPRECATED — thin facade over the Business Blueprint Registry.
// -----------------------------------------------------------------------------
// The Blueprint is now defined in exactly one place:
//     supabase/functions/_shared/blueprintRegistry.ts
//
// This file only re-exports registry-derived values so existing imports keep
// working. Do NOT add Blueprint definitions here — edit the registry instead.
// =============================================================================

export type {
  BlueprintFieldKind,
  RegistryField as BlueprintFieldDef,
  BlueprintSubBlockDef,
} from "./blueprintRegistry.ts";

export {
  BLUEPRINT_FIELDS,
  BLUEPRINT_SUB_BLOCKS,
  BLUEPRINT_FIELD_BY_PATH,
  BLUEPRINT_FIELD_BY_KEY,
  getBlueprintFieldByKey,
  getBlueprintFieldByPath,
  renderBlueprintFieldPathsPrompt,
  renderBlueprintStructurePrompt,
} from "./blueprintRegistry.ts";
