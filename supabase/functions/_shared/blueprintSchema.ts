// =============================================================================
// Blueprint Schema — SINGLE SOURCE OF TRUTH
// -----------------------------------------------------------------------------
// Every Business Blueprint field the app knows about is defined here ONCE.
// Consumed by:
//   - Frontend UI configs (src/components/business-blueprint/clarityConfig.ts …)
//   - AI Coach edge function (supabase/functions/coach-chat/index.ts)
//
// This file must stay PURE DATA — no framework imports, no icons, no React —
// so it can be imported from both Vite (frontend) and Deno (edge functions).
// UI-only extras like icons or per-business-type copy layer on top in the
// frontend config that consumes this schema.
//
// To add / rename a Blueprint field:
//   1. Edit this file.
//   2. Extend the corresponding TypeScript type (offerDesignTypes.ts etc.).
//   3. Done — UI and AI Coach pick it up automatically.
// =============================================================================

export type BlueprintFieldKind =
  | "text"
  | "textarea"
  | "tags"
  | "chips-single"
  | "chips-multi";

export interface BlueprintFieldDef {
  /** Dot-path into the business_blueprints JSON (e.g. "customer_clarity.avatar_who"). */
  path: string;
  /** Leaf key alone (e.g. "avatar_who"). Convenience for UI lookups. */
  key: string;
  /** Human label, base English. Frontend may override per business type. */
  label: string;
  /** Optional short helper the model uses to understand intent. */
  helper?: string;
  kind: BlueprintFieldKind;
  /** Extra phrases the AI coach can match user intent against ("traits", "mindset", …). */
  aliases: string[];
  /**
   * Whether the AI coach is allowed to write to this field.
   * Set to false for structured builders (framework, core_promise, cards, …)
   * that the coach cannot currently populate correctly.
   */
  aiWritable: boolean;
}

export interface BlueprintSubBlockDef {
  /** Stable id used by the UI as sub-tab id AND by the coach to scope writes. */
  id: string;
  /** Parent Blueprint tab this sub-block belongs to. */
  tabId: string;
  /** Human label. */
  label: string;
  /** Phrases the coach matches to detect "vul <sub-block> in" intent. */
  aliases: string[];
  /** Ordered list of field paths belonging to this sub-block. */
  fieldPaths: string[];
}

// ---------- helpers ---------------------------------------------------------

const leafKey = (path: string) => path.split(".").at(-1) ?? path;

const field = (
  path: string,
  label: string,
  kind: BlueprintFieldKind,
  aliases: string[],
  opts: { aiWritable?: boolean; helper?: string } = {},
): BlueprintFieldDef => ({
  path,
  key: leafKey(path),
  label,
  kind,
  aliases: [leafKey(path), ...aliases],
  aiWritable: opts.aiWritable ?? true,
  helper: opts.helper,
});

// =============================================================================
// FIELD REGISTRY
// =============================================================================

export const BLUEPRINT_FIELDS: BlueprintFieldDef[] = [
  // ---------- Customer Clarity → Avatar --------------------------------------
  field(
    "customer_clarity.avatar_who",
    "Who is your ideal client",
    "textarea",
    ["who is your ideal client", "ideal client", "ideale klant"],
  ),
  field(
    "customer_clarity.avatar_stage",
    "Stage or situation they are in",
    "textarea",
    ["stage or situation", "situation they are in", "fase", "situatie"],
  ),
  field(
    "customer_clarity.avatar_traits",
    "Traits or mindset that define them",
    "tags",
    [
      "traits or mindset",
      "traits or mindset that define them",
      "traits",
      "mindset",
      "eigenschappen",
      "mindsets",
      "kenmerken",
    ],
    { helper: "Comma-separated list of short items" },
  ),
  field(
    "customer_clarity.avatar_not_fit",
    "Who is NOT a good fit",
    "textarea",
    ["who is not a good fit", "not a good fit", "not fit", "geen goede fit"],
  ),

  // ---------- Customer Clarity → Pain ----------------------------------------
  field(
    "customer_clarity.pain_main_problem",
    "Main problem",
    "textarea",
    ["main problem", "one big problem", "hoofdprobleem", "probleem"],
  ),
  field(
    "customer_clarity.pain_daily_frustrations",
    "Daily frustrations",
    "textarea",
    ["daily frustrations", "frustrations", "dagelijkse frustraties"],
  ),
  field(
    "customer_clarity.pain_already_tried",
    "What they already tried",
    "textarea",
    ["already tried", "what they already tried", "al geprobeerd"],
  ),
  field(
    "customer_clarity.pain_consequences",
    "Consequences of not solving it",
    "textarea",
    ["consequences", "not solving", "gevolgen"],
  ),

  // ---------- Customer Clarity → Desire --------------------------------------
  field(
    "customer_clarity.desire_main_result",
    "Main result they want",
    "textarea",
    ["main result", "result they want", "resultaat"],
  ),
  field(
    "customer_clarity.desire_success_vision",
    "Vision of success",
    "textarea",
    ["success vision", "vision of success", "succesvisie"],
  ),
  field(
    "customer_clarity.desire_why_badly",
    "Why they want it badly",
    "textarea",
    ["why they want it", "why badly", "waarom"],
  ),

  // ---------- Customer Clarity → Transformation ------------------------------
  field(
    "customer_clarity.transformation_point_a",
    "Where they are now",
    "textarea",
    ["point a", "where they are now", "waar ze nu staan"],
  ),
  field(
    "customer_clarity.transformation_point_b",
    "Where they want to be",
    "textarea",
    ["point b", "where they want to be", "waar ze willen zijn"],
  ),
  field(
    "customer_clarity.transformation_process",
    "Transformation process",
    "textarea",
    ["transformation process", "transformatieproces"],
  ),

  // ---------- Offer Design → Angle -------------------------------------------
  field(
    "offer_stack.angle.main_offer_name",
    "Main Offer Name",
    "text",
    ["main offer name", "offer name", "flagship name", "naam aanbod"],
    { helper: "Short, 3-6 words, name only" },
  ),
  field(
    "offer_stack.angle.short_description",
    "Short Offer Description",
    "textarea",
    ["short offer description", "offer description", "korte beschrijving"],
    { helper: "1-2 sentences" },
  ),
  field(
    "offer_stack.angle.core_outcome",
    "Core Outcome",
    "textarea",
    ["core outcome", "primary outcome", "main outcome", "hoofdresultaat"],
    { helper: "Primary transformation result, 1 sentence" },
  ),
  field(
    "offer_stack.angle.angle_new_vehicle",
    "New Vehicle",
    "textarea",
    ["new vehicle", "new method", "nieuw voertuig", "nieuwe methode"],
    { helper: "What makes the method genuinely NEW" },
  ),
  field(
    "offer_stack.angle.angle_better_results",
    "Better Results",
    "textarea",
    ["better results", "betere resultaten"],
    { helper: "Why the method produces BETTER results" },
  ),
  field(
    "offer_stack.angle.angle_faster_outcome",
    "Faster Outcome",
    "textarea",
    ["faster outcome", "faster results", "sneller resultaat"],
    { helper: "How clients get results FASTER" },
  ),
  field(
    "offer_stack.angle.angle_easier_process",
    "Easier Process",
    "textarea",
    ["easier process", "eenvoudiger proces", "makkelijker proces"],
    { helper: "How the process is made EASIER" },
  ),
];

// =============================================================================
// SUB-BLOCKS (used by the coach to scope "fill this sub-block" intents)
// =============================================================================

export const BLUEPRINT_SUB_BLOCKS: BlueprintSubBlockDef[] = [
  {
    id: "avatar",
    tabId: "customer_clarity",
    label: "Ideal Client Avatar",
    aliases: [
      "ideal client avatar",
      "ideal customer avatar",
      "avatar",
      "icp",
      "ideale klant",
      "ideale client",
    ],
    fieldPaths: [
      "customer_clarity.avatar_who",
      "customer_clarity.avatar_stage",
      "customer_clarity.avatar_traits",
      "customer_clarity.avatar_not_fit",
    ],
  },
  {
    id: "pain",
    tabId: "customer_clarity",
    label: "Pain & Friction",
    aliases: [
      "pain friction",
      "pain and friction",
      "pain en friction",
      "pain & friction",
      "friction",
      "pijnpunten",
    ],
    fieldPaths: [
      "customer_clarity.pain_main_problem",
      "customer_clarity.pain_daily_frustrations",
      "customer_clarity.pain_already_tried",
      "customer_clarity.pain_consequences",
    ],
  },
  {
    id: "desire",
    tabId: "customer_clarity",
    label: "Desire & Goals",
    aliases: [
      "desire goals",
      "desire and goals",
      "desire & goals",
      "desire",
      "goals",
      "verlangens",
      "doelen",
    ],
    fieldPaths: [
      "customer_clarity.desire_main_result",
      "customer_clarity.desire_success_vision",
      "customer_clarity.desire_why_badly",
    ],
  },
  {
    id: "transformation",
    tabId: "customer_clarity",
    label: "Transformation",
    aliases: ["transformation", "transformatie", "point a", "point b"],
    fieldPaths: [
      "customer_clarity.transformation_point_a",
      "customer_clarity.transformation_point_b",
      "customer_clarity.transformation_process",
    ],
  },
  {
    id: "offer_angle",
    tabId: "offer_design",
    label: "Offer Angle",
    aliases: [
      "offer angle",
      "offer angle tab",
      "angle tab",
      "offer design angle",
      "offer design",
      "aanbod angle",
      "offer positioning",
    ],
    fieldPaths: [
      "offer_stack.angle.main_offer_name",
      "offer_stack.angle.short_description",
      "offer_stack.angle.core_outcome",
      "offer_stack.angle.angle_new_vehicle",
      "offer_stack.angle.angle_better_results",
      "offer_stack.angle.angle_faster_outcome",
      "offer_stack.angle.angle_easier_process",
    ],
  },
];

// =============================================================================
// DERIVED LOOKUPS (built once, safe to import)
// =============================================================================

export const BLUEPRINT_FIELD_BY_PATH: Record<string, BlueprintFieldDef> = Object.fromEntries(
  BLUEPRINT_FIELDS.map((f) => [f.path, f]),
);

export const BLUEPRINT_FIELD_BY_KEY: Record<string, BlueprintFieldDef> = Object.fromEntries(
  BLUEPRINT_FIELDS.map((f) => [f.key, f]),
);

/** Find a field by its leaf key (e.g. "avatar_who" -> full def). */
export function getBlueprintFieldByKey(key: string): BlueprintFieldDef | undefined {
  return BLUEPRINT_FIELD_BY_KEY[key];
}

/** Find a field by dot-path (e.g. "customer_clarity.avatar_who"). */
export function getBlueprintFieldByPath(path: string): BlueprintFieldDef | undefined {
  return BLUEPRINT_FIELD_BY_PATH[path];
}

/**
 * Render the prompt-facing field-paths list the coach shows to the model.
 * Format: `path — kind — label (helper)`
 */
export function renderBlueprintFieldPathsPrompt(): string {
  const header = `# Blueprint field paths (use these exact dot-paths in propose_blueprint_writes)
# Format: path — kind — label`;

  const lines = BLUEPRINT_FIELDS.filter((f) => f.aiWritable).map((f) => {
    const kindHint =
      f.kind === "tags" || f.kind === "chips-single" || f.kind === "chips-multi"
        ? `${f.kind} (comma-separated list of short items)`
        : f.kind;
    const helper = f.helper ? ` — ${f.helper}` : "";
    return `${f.path} — ${kindHint} — ${f.label}${helper}`;
  });

  const footer = `
NOTE: Only the paths listed above can be written by the Coach. Structured
sub-fields (framework, core_promise, stack cards, pricing plans, proof items,
growth mappings, …) exist in the Blueprint but are NOT in this list — never
invent path names, never propose writes for them.

Rules:
- Only write to paths the user's request actually implies. If the user asks for one field, write ONLY that path.
- For kind = tags/chips, value MUST be a comma-separated list of short items, not prose.
- Use the current Blueprint JSON to see what already exists and what's empty.`;

  return [header, ...lines, footer].join("\n");
}
