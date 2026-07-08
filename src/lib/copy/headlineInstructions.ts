// Generic, DATA-DRIVEN routing helper for Copy Component AI generations.
//
// This file contains NO hardcoded prompt content, NO hardcoded component
// classifications, and NO editorial rules. All headline generation guidance
// lives in the database:
//   - copy_components.headline_purpose             (enum-like, admin-managed)
//   - copy_components.headline_instruction_block_id (FK to ai_instruction_blocks)
//   - copy_components.output_structure[i].role     (marks headline fields)
//
// The editor resolves the linked instruction block server-side and passes
// its content down as `headlineInstructions`. This helper only decides
// WHEN to inject it (full generation vs. per-field regeneration) and
// composes it with the component-level user instructions.

export interface OutputFieldMeta {
  key: string;
  role?: string;
  [k: string]: any;
}

/**
 * Field roles that indicate the field is a headline of some purpose.
 * Kept generic so admin can add new roles without a code change; anything
 * ending in `_headline` is treated as a headline role.
 */
export function isHeadlineField(
  fieldKey: string,
  outputStructure?: OutputFieldMeta[],
): boolean {
  const meta = outputStructure?.find((f) => f.key === fieldKey);
  const role = meta?.role;
  if (role && typeof role === "string" && role.endsWith("_headline")) return true;
  // Backwards-compatible fallback for older components without a `role` marker.
  return ["headline", "section_headline", "intro_headline"].includes(fieldKey);
}

/**
 * Compose the extraInstructions payload for an executeAIAction call.
 *
 * @param headlineInstructions  Content of the instruction block linked to the component's
 *                              headline_purpose. Resolved by the caller (usually the editor).
 * @param componentInstructions Free-form component + global instructions from the document.
 * @param options.focusFieldKey When regenerating a single field, its output key.
 *                              The headline block is only appended when the focus field
 *                              is a headline-role field.
 * @param options.outputStructure The component's output structure (with `role` markers)
 *                                used to decide whether the focus field is a headline.
 */
export function buildCopyExtraInstructions(
  headlineInstructions: string | undefined | null,
  componentInstructions: string | undefined | null,
  options: { focusFieldKey?: string; outputStructure?: OutputFieldMeta[] } = {},
): string | undefined {
  const base = (componentInstructions || "").trim();
  const headline = (headlineInstructions || "").trim();

  if (!headline) return base || undefined;

  if (options.focusFieldKey !== undefined) {
    if (!isHeadlineField(options.focusFieldKey, options.outputStructure)) {
      return base || undefined;
    }
  }

  return base ? `${base}\n\n${headline}` : headline;
}
