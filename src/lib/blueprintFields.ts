// =============================================================================
// Business Blueprint field registry
// -----------------------------------------------------------------------------
// Central source of truth for the "required blueprint fields" system used by
// Copy Components. Each entry defines:
//   - slug:   stable identifier stored in copy_components.required_blueprint_fields
//   - label:  human-readable name (for admin picker + user warnings)
//   - get:    extracts a formatted, non-empty context string from a blueprint
//             row, or returns null when the data is missing/empty.
//
// Slugs are intentionally coarse (semantic groupings, not every leaf field) —
// enough to scope AI context without exploding the registry.
// =============================================================================

export interface BlueprintFieldDef {
  slug: string;
  label: string;
  /** Returns a formatted string when data is present, or null when empty. */
  get: (blueprint: any) => string | null;
}

// ---------- helpers ---------------------------------------------------------

const nonEmpty = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const pickLines = (obj: any, keys: string[]): string | null => {
  if (!obj || typeof obj !== "object") return null;
  const lines = keys
    .map((k) => (nonEmpty(obj[k]) ? `- ${k}: ${obj[k]}` : null))
    .filter((x): x is string => x !== null);
  return lines.length > 0 ? lines.join("\n") : null;
};

const stringifyArray = (arr: any, formatter: (item: any) => string | null): string | null => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const parts = arr.map(formatter).filter((x): x is string => nonEmpty(x));
  return parts.length > 0 ? parts.join("\n") : null;
};

// ---------- registry --------------------------------------------------------

export const BLUEPRINT_FIELDS: BlueprintFieldDef[] = [
  {
    slug: "customer_avatar",
    label: "Customer Avatar",
    get: (bp) =>
      pickLines(bp?.customer_clarity, [
        "avatar_who",
        "avatar_stage",
        "avatar_traits",
        "avatar_not_fit",
      ]),
  },
  {
    slug: "pain_points",
    label: "Pain Points",
    get: (bp) =>
      pickLines(bp?.customer_clarity, [
        "pain_main_problem",
        "pain_daily_frustrations",
        "pain_already_tried",
        "pain_consequences",
      ]),
  },
  {
    slug: "dream_outcome",
    label: "Dream Outcome",
    get: (bp) =>
      pickLines(bp?.customer_clarity, [
        "desire_main_result",
        "desire_success_vision",
        "desire_why_badly",
      ]),
  },
  {
    slug: "transformation",
    label: "Transformation",
    get: (bp) =>
      pickLines(bp?.customer_clarity, [
        "transformation_point_a",
        "transformation_point_b",
        "transformation_process",
      ]),
  },
  {
    slug: "offer_angle",
    label: "Offer Angle",
    get: (bp) =>
      pickLines(bp?.offer_stack?.angle, [
        "main_offer_name",
        "short_description",
        "core_outcome",
        "angle_new_vehicle",
        "angle_better_results",
        "angle_faster_outcome",
        "angle_easier_process",
      ]),
  },
  {
    slug: "signature_method",
    label: "Signature Method / Framework",
    get: (bp) => {
      const fw = bp?.offer_stack?.angle?.framework;
      if (!fw) return null;
      const head = [
        nonEmpty(fw.name) ? `Name: ${fw.name}` : null,
        nonEmpty(fw.description) ? `Description: ${fw.description}` : null,
      ].filter(Boolean);
      const pillars = stringifyArray(fw.pillars, (p) =>
        nonEmpty(p?.name) ? `- ${p.name}${nonEmpty(p?.description) ? `: ${p.description}` : ""}` : null,
      );
      const out = [...head, pillars ? `Pillars:\n${pillars}` : null].filter(Boolean);
      return out.length > 0 ? out.join("\n") : null;
    },
  },
  {
    slug: "core_offer",
    label: "Core Offer / Stack",
    get: (bp) => {
      const stack = bp?.offer_stack?.stack;
      if (!stack) return null;
      const deliverables = stringifyArray(stack.deliverables, (d) =>
        nonEmpty(d?.name) ? `- ${d.name}${nonEmpty(d?.description) ? `: ${d.description}` : ""}` : null,
      );
      const bonuses = stringifyArray(stack.bonuses, (b) =>
        nonEmpty(b?.name) ? `- ${b.name}${nonEmpty(b?.description) ? `: ${b.description}` : ""}` : null,
      );
      const parts = [
        deliverables ? `Deliverables:\n${deliverables}` : null,
        bonuses ? `Bonuses:\n${bonuses}` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join("\n\n") : null;
    },
  },
  {
    slug: "pricing",
    label: "Pricing",
    get: (bp) =>
      pickLines(bp?.offer_stack?.pricing, [
        "price",
        "currency",
        "payment_model",
        "positioning",
      ]),
  },
  {
    slug: "guarantees",
    label: "Guarantees",
    get: (bp) => {
      const g = bp?.offer_stack?.angle?.core_promise?.guarantee;
      return nonEmpty(g) ? `Guarantee: ${g}` : null;
    },
  },
  {
    slug: "proof_authority",
    label: "Proof & Authority",
    get: (bp) =>
      pickLines(bp?.proof_authority, [
        "trust_reason",
        "signature_proof",
      ]),
  },
  {
    slug: "founder_story",
    label: "Founder Story",
    get: (bp) =>
      stringifyArray(bp?.proof_authority?.founder_stories, (s) => {
        const bits = [
          nonEmpty(s?.title) ? `Title: ${s.title}` : null,
          nonEmpty(s?.before) ? `Before: ${s.before}` : null,
          nonEmpty(s?.challenge) ? `Challenge: ${s.challenge}` : null,
          nonEmpty(s?.breakthrough) ? `Breakthrough: ${s.breakthrough}` : null,
          nonEmpty(s?.after) ? `After: ${s.after}` : null,
          nonEmpty(s?.core_lesson) ? `Core lesson: ${s.core_lesson}` : null,
        ].filter(Boolean);
        return bits.length > 0 ? bits.join("\n") : null;
      }),
  },
  {
    slug: "credibility_stats",
    label: "Credibility Stats",
    get: (bp) =>
      stringifyArray(bp?.proof_authority?.credibility_metrics, (m) =>
        nonEmpty(m?.metric) || nonEmpty(m?.value)
          ? `- ${[m?.value, m?.metric].filter(nonEmpty).join(" ")}${nonEmpty(m?.context) ? ` (${m.context})` : ""}`
          : null,
      ),
  },
  {
    slug: "client_results",
    label: "Client Results",
    get: (bp) =>
      stringifyArray(bp?.proof_authority?.client_results, (r) => {
        const bits = [
          nonEmpty(r?.client_type) ? `Client: ${r.client_type}` : null,
          nonEmpty(r?.problem) ? `Problem: ${r.problem}` : null,
          nonEmpty(r?.result_achieved) ? `Result: ${r.result_achieved}` : null,
          nonEmpty(r?.timeframe) ? `Timeframe: ${r.timeframe}` : null,
        ].filter(Boolean);
        return bits.length > 0 ? bits.join(" | ") : null;
      }),
  },
  {
    slug: "brand_strategy",
    label: "Brand Strategy",
    get: (bp) => {
      const bs = bp?.brand_strategy;
      if (!bs || typeof bs !== "object") return null;
      const entries = Object.entries(bs).filter(([, v]) => nonEmpty(v as any));
      if (entries.length === 0) return null;
      return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
    },
  },
  {
    slug: "growth_system",
    label: "Growth System",
    get: (bp) => {
      const gs = bp?.growth_system;
      if (!gs || typeof gs !== "object") return null;
      const entries = Object.entries(gs).filter(([, v]) => nonEmpty(v as any));
      if (entries.length === 0) return null;
      return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
    },
  },
];

const FIELD_BY_SLUG = new Map(BLUEPRINT_FIELDS.map((f) => [f.slug, f]));

export const getBlueprintFieldLabel = (slug: string): string =>
  FIELD_BY_SLUG.get(slug)?.label || slug;

/**
 * Returns the slugs that are declared as required but have no data in the
 * given blueprint row.
 */
export const getMissingBlueprintFields = (
  blueprint: any,
  requiredSlugs: string[] | null | undefined,
): Array<{ slug: string; label: string }> => {
  if (!requiredSlugs || requiredSlugs.length === 0) return [];
  const missing: Array<{ slug: string; label: string }> = [];
  for (const slug of requiredSlugs) {
    const def = FIELD_BY_SLUG.get(slug);
    if (!def) continue;
    if (!def.get(blueprint)) missing.push({ slug, label: def.label });
  }
  return missing;
};

/**
 * Builds a scoped context string containing only the blueprint fields that
 * were declared as required for a given component. Returns an empty string
 * when nothing is available.
 */
export const buildScopedBlueprintContext = (
  blueprint: any,
  requiredSlugs: string[] | null | undefined,
): string => {
  if (!blueprint || !requiredSlugs || requiredSlugs.length === 0) return "";
  const sections: string[] = [];
  for (const slug of requiredSlugs) {
    const def = FIELD_BY_SLUG.get(slug);
    if (!def) continue;
    const value = def.get(blueprint);
    if (value) sections.push(`### ${def.label}\n${value}`);
  }
  if (sections.length === 0) return "";
  return `## BUSINESS BLUEPRINT CONTEXT\n\n${sections.join("\n\n")}`;
};
