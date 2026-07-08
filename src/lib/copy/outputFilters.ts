/**
 * Shared helpers to filter component outputs at display time.
 *
 * When a component uses `cta_mode === "reuse_hero"`, its CTA-related output
 * fields must not appear in the component's output list or in the preview,
 * because the reader is expected to use the Hero CTA above instead.
 *
 * Kept in a single utility so every UI + the preview share the same rule.
 */

const CTA_FIELD_KEYS = new Set([
  "cta_button_text",
  "cta_subtext",
  "scarcity_line",
  "bottom_social_proof",
]);

export const isCtaFieldHidden = (
  key: string,
  inputs: Record<string, any> | undefined | null,
): boolean => {
  if (!inputs) return false;
  if (inputs.cta_mode !== "reuse_hero") return false;
  return CTA_FIELD_KEYS.has(key) || key.startsWith("cta_");
};

export const filterVisibleOutputKeys = (
  keys: string[],
  inputs: Record<string, any> | undefined | null,
): string[] => keys.filter((k) => !isCtaFieldHidden(k, inputs));
