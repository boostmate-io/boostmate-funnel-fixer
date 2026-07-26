// =============================================================================
// BUSINESS BLUEPRINT REGISTRY — SINGLE SOURCE OF TRUTH
// -----------------------------------------------------------------------------
// One declarative description of the complete Business Blueprint:
//   tabs → sub-blocks → fields + repeatable lists
// including labels, helper text, placeholders, field types, options,
// progress participation and AI write permission.
//
// Consumed by BOTH:
//   - the Business Blueprint UI          (via the "@shared/*" Vite/TS alias)
//   - the AI Coach edge function          (Deno, relative import)
//
// Because both runtimes import THIS file, there is no code generation and no
// second definition to keep in sync. Adding / renaming / removing a Blueprint
// field is a single edit here.
//
// RULES
//   - PURE DATA ONLY. No React, no icons, no Supabase, no framework imports.
//     Icons are referenced by `iconKey` and resolved in the UI layer.
//   - Labels that must adapt to the workspace business type use `labelTemplate`
//     with {noun} / {nounSingular} / {Noun} / {NounSingular} / {notFitSuffix}
//     tokens. `label` holds the rendered default (used by the AI Coach).
//   - Progress rules are declared here; weighted legacy rules are referenced by
//     `ruleId` and implemented in the UI layer so behaviour stays identical.
// =============================================================================

export type BlueprintFieldKind =
  | "text"
  | "textarea"
  | "tags"
  | "suggested-tags"
  | "chips-single"
  | "chips-multi"
  | "bullet-list"
  | "colors";

export interface RegistryField {
  /** Dot-path into the business_blueprints JSON. */
  path: string;
  /** Leaf key alone (e.g. "avatar_who"). */
  key: string;
  /** Rendered default label (English, generic business type). */
  label: string;
  /** Optional token template used by the UI to personalize the label. */
  labelTemplate?: string;
  helper?: string;
  placeholder?: string;
  kind: BlueprintFieldKind;
  options?: { value: string; label: string }[];
  suggestions?: string[];
  fullWidth?: boolean;
  rows?: number;
  /** Extra phrases the Coach matches user intent against. */
  aliases: string[];
  aiWritable: boolean;
  countsTowardProgress: boolean;
}

export interface RegistryListItemField {
  key: string;
  label: string;
  kind: "text" | "textarea";
  helper?: string;
}

export interface RegistryList {
  id: string;
  /** Dot-path of the array itself, e.g. "offer_stack.stack.deliverables". */
  basePath: string;
  label: string;
  /** Singular item label used for generated field labels ("Deliverable 1 — Name"). */
  itemLabel: string;
  helper?: string;
  itemFields: RegistryListItemField[];
  aiWritable: boolean;
  countsTowardProgress: boolean;
  /** How many indexed item paths are exposed to the Coach. */
  aiIndexedCount: number;
  suggestedCount?: [number, number];
}

export type ProgressRule =
  /** Every field/list with countsTowardProgress is one equally-weighted unit. */
  | { mode: "units" }
  /** Legacy weighted rule implemented in the UI layer, keyed by ruleId. */
  | { mode: "custom"; ruleId: string };

export interface RegistrySubBlock {
  id: string;
  tabId: string;
  label: string;
  description?: string;
  /** Phrases the Coach matches to detect "fill <sub-block>" intent. */
  aliases: string[];
  /** Lucide icon name, resolved to a component in the UI. */
  iconKey: string;
  fields: RegistryField[];
  lists: RegistryList[];
  progress: ProgressRule;
}

export interface RegistryTab {
  id: string;
  label: string;
  /** business_blueprints JSON column this tab writes into. */
  column: string;
  iconKey: string;
  /** How the tab total is derived from its sub-blocks. */
  progressAggregate: "average" | "pooled";
  subBlocks: RegistrySubBlock[];
}

// -----------------------------------------------------------------------------
// Label tokens
// -----------------------------------------------------------------------------

export interface LabelTokens {
  noun: string;
  nounSingular: string;
  Noun: string;
  NounSingular: string;
  notFitSuffix: string;
}

export const DEFAULT_LABEL_TOKENS: LabelTokens = {
  noun: "clients",
  nounSingular: "client",
  Noun: "Clients",
  NounSingular: "Client",
  notFitSuffix: "to be your client",
};

export function renderLabel(template: string, tokens: Partial<LabelTokens> = {}): string {
  const merged = { ...DEFAULT_LABEL_TOKENS, ...tokens } as Record<string, string>;
  return template.replace(/\{(\w+)\}/g, (m, key) => merged[key] ?? m);
}

// -----------------------------------------------------------------------------
// Authoring helpers
// -----------------------------------------------------------------------------

const leafKey = (path: string) => path.split(".").at(-1) ?? path;

interface FieldOpts {
  labelTemplate?: string;
  helper?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  suggestions?: string[];
  fullWidth?: boolean;
  rows?: number;
  aliases?: string[];
  aiWritable?: boolean;
  countsTowardProgress?: boolean;
}

const f = (
  path: string,
  label: string,
  kind: BlueprintFieldKind,
  opts: FieldOpts = {},
): RegistryField => ({
  path,
  key: leafKey(path),
  label: opts.labelTemplate ? renderLabel(opts.labelTemplate) : label,
  labelTemplate: opts.labelTemplate,
  helper: opts.helper,
  placeholder: opts.placeholder,
  kind,
  options: opts.options,
  suggestions: opts.suggestions,
  fullWidth: opts.fullWidth,
  rows: opts.rows,
  aliases: [leafKey(path), ...(opts.aliases ?? [])],
  aiWritable: opts.aiWritable ?? true,
  countsTowardProgress: opts.countsTowardProgress ?? true,
});

const list = (
  basePath: string,
  label: string,
  itemLabel: string,
  itemFields: RegistryListItemField[],
  opts: {
    helper?: string;
    aiWritable?: boolean;
    countsTowardProgress?: boolean;
    aiIndexedCount?: number;
    suggestedCount?: [number, number];
  } = {},
): RegistryList => ({
  id: basePath,
  basePath,
  label,
  itemLabel,
  helper: opts.helper,
  itemFields,
  aiWritable: opts.aiWritable ?? true,
  countsTowardProgress: opts.countsTowardProgress ?? true,
  aiIndexedCount: opts.aiIndexedCount ?? 3,
  suggestedCount: opts.suggestedCount,
});

// -----------------------------------------------------------------------------
// Shared option sets
// -----------------------------------------------------------------------------

const TONE_SUGGESTIONS = [
  "Direct", "Friendly", "Professional", "Expert", "Practical", "Honest",
  "Encouraging", "Inspirational", "Educational", "Premium", "Minimal", "Bold",
  "Warm", "Playful", "Serious", "Analytical", "Empathetic", "Energetic",
  "Calm", "No fluff",
];

const VISUAL_STYLE_SUGGESTIONS = [
  "Modern", "Minimal", "Premium", "Bold", "Editorial",
  "Clean", "Friendly", "Luxury", "Corporate", "Playful",
];

export const AUTHORITY_TYPE_OPTIONS = [
  "Results-Driven Expert",
  "Methodology Expert",
  "Experience-Based Mentor",
  "Specialist",
  "Educator",
  "Operator / Practitioner",
  "Premium Authority",
  "Thought Leader",
];

export const CREDIBILITY_FOUNDATION_OPTIONS = [
  "Personal experience",
  "Client results",
  "Certifications",
  "Methodology",
  "Years experience",
  "Specialization",
  "Media recognition",
  "Audience size",
  "Partnerships",
];

// =============================================================================
// TAB 1 — CUSTOMER CLARITY
// =============================================================================

const CUSTOMER_CLARITY_TAB: RegistryTab = {
  id: "customer_clarity",
  label: "Customer Clarity",
  column: "customer_clarity",
  iconKey: "Users",
  progressAggregate: "average",
  subBlocks: [
    {
      id: "avatar",
      tabId: "customer_clarity",
      label: "Ideal {NounSingular} Avatar",
      description: "Define exactly who your ideal {nounSingular} is — the clearer, the better.",
      aliases: ["ideal client avatar", "ideal customer avatar", "avatar", "icp", "ideale klant", "ideale client"],
      iconKey: "User",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("customer_clarity.avatar_who", "", "textarea", {
          labelTemplate: "Who is your ideal {nounSingular}?",
          aliases: ["who is your ideal client", "ideal client", "ideale klant"],
          fullWidth: true,
          rows: 3,
        }),
        f("customer_clarity.avatar_stage", "What stage or situation are they currently in?", "textarea", {
          aliases: ["stage or situation", "situation they are in", "fase", "situatie"],
          fullWidth: true,
          rows: 3,
        }),
        f("customer_clarity.avatar_traits", "Traits or mindset that define them", "tags", {
          helper: "Comma-separated list of short items",
          aliases: [
            "traits or mindset", "traits or mindset that define them", "traits",
            "mindset", "eigenschappen", "mindsets", "kenmerken",
          ],
        }),
        f("customer_clarity.avatar_not_fit", "", "textarea", {
          labelTemplate: "Who is NOT a good fit {notFitSuffix}?",
          aliases: ["who is not a good fit", "not a good fit", "not fit", "geen goede fit"],
          rows: 3,
        }),
      ],
    },
    {
      id: "pain",
      tabId: "customer_clarity",
      label: "Pain & Friction",
      description: "Capture exactly what your {nounSingular} is struggling with right now.",
      aliases: ["pain friction", "pain and friction", "pain en friction", "pain & friction", "friction", "pijnpunten"],
      iconKey: "AlertTriangle",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("customer_clarity.pain_main_problem", "What is the main problem they are dealing with?", "textarea", {
          aliases: ["main problem", "one big problem", "hoofdprobleem", "probleem"],
          fullWidth: true,
          rows: 2,
        }),
        f("customer_clarity.pain_daily_frustrations", "What frustrations do they experience because of this?", "textarea", {
          aliases: ["daily frustrations", "frustrations", "dagelijkse frustraties"],
          rows: 3,
        }),
        f("customer_clarity.pain_already_tried", "What have they already tried?", "textarea", {
          aliases: ["already tried", "what they already tried", "al geprobeerd"],
          rows: 3,
        }),
        f("customer_clarity.pain_consequences", "What happens if they don't solve this?", "textarea", {
          aliases: ["consequences", "not solving", "gevolgen"],
          fullWidth: true,
          rows: 2,
        }),
      ],
    },
    {
      id: "desire",
      tabId: "customer_clarity",
      label: "Desire & Goals",
      description: "Map what your {noun} want, externally and internally.",
      aliases: ["desire goals", "desire and goals", "desire & goals", "desire", "goals", "verlangens", "doelen"],
      iconKey: "Target",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("customer_clarity.desire_main_result", "What result do they want most?", "textarea", {
          aliases: ["main result", "result they want", "resultaat"],
          fullWidth: true,
          rows: 2,
        }),
        f("customer_clarity.desire_success_vision", "What would success look and feel like?", "textarea", {
          aliases: ["success vision", "vision of success", "succesvisie"],
          rows: 4,
        }),
        f("customer_clarity.desire_why_badly", "Why do they want this so badly?", "textarea", {
          aliases: ["why they want it", "why badly", "waarom"],
          rows: 4,
        }),
      ],
    },
    {
      id: "transformation",
      tabId: "customer_clarity",
      label: "Transformation",
      description:
        "The change your work creates: where they start, where they end up, and what has to change for them to get there.",
      aliases: ["transformation", "transformatie", "point a", "point b"],
      iconKey: "ArrowRightLeft",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("customer_clarity.transformation_point_a", "Where are they now?", "textarea", {
          aliases: ["point a", "where they are now", "waar ze nu staan"],
          rows: 4,
        }),
        f("customer_clarity.transformation_point_b", "Where do they want to be?", "textarea", {
          aliases: ["point b", "where they want to be", "waar ze willen zijn"],
          rows: 4,
        }),
        f("customer_clarity.transformation_process", "What needs to change for them to get there?", "textarea", {
          helper:
            "The key shifts, milestones, or problems that need to be solved between their current and desired state.",
          aliases: ["transformation process", "transformatieproces"],
          fullWidth: true,
          rows: 4,
        }),
      ],
    },
  ],
};

// =============================================================================
// TAB 2 — OFFER DESIGN
// =============================================================================

const OFFER_DESIGN_TAB: RegistryTab = {
  id: "offer_design",
  label: "Offer Design",
  column: "offer_stack",
  iconKey: "Package",
  progressAggregate: "average",
  subBlocks: [
    {
      id: "angle",
      tabId: "offer_design",
      label: "Offer Angle",
      aliases: [
        "offer angle", "offer angle tab", "angle tab", "offer design angle",
        "offer design", "aanbod angle", "offer positioning",
        "signature mechanism", "signature framework", "mechanism framework",
        "framework", "method framework", "methode", "pijlers",
        "core transformation promise", "transformation promise", "core promise",
        "promise builder", "belofte", "transformatiebelofte",
      ],
      iconKey: "Compass",
      progress: { mode: "custom", ruleId: "offer.angle" },
      lists: [
        list(
          "offer_stack.angle.framework.pillars",
          "Framework Pillars",
          "Pillar",
          [
            { key: "name", label: "Name", kind: "text", helper: "Short name for this pillar of the signature framework" },
            { key: "description", label: "Description", kind: "textarea", helper: "What happens in this pillar, 1-2 sentences" },
          ],
          { aiIndexedCount: 3, suggestedCount: [3, 5], countsTowardProgress: false },
        ),
      ],
      fields: [
        f("offer_stack.angle.main_offer_name", "Main Offer Name", "text", {
          helper: "Short, 3-6 words, name only",
          aliases: ["main offer name", "offer name", "flagship name", "naam aanbod"],
        }),
        f("offer_stack.angle.short_description", "Short Offer Description", "textarea", {
          helper: "1-2 sentences",
          aliases: ["short offer description", "offer description", "korte beschrijving"],
        }),
        f("offer_stack.angle.core_outcome", "Core Outcome", "textarea", {
          helper: "Primary transformation result, 1 sentence",
          aliases: ["core outcome", "primary outcome", "main outcome", "hoofdresultaat"],
        }),
        f("offer_stack.angle.angle_new_vehicle", "New Vehicle", "textarea", {
          helper: "What makes the method genuinely NEW",
          aliases: ["new vehicle", "new method", "nieuw voertuig", "nieuwe methode"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.angle_better_results", "Better Results", "textarea", {
          helper: "Why the method produces BETTER results",
          aliases: ["better results", "betere resultaten"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.angle_faster_outcome", "Faster Outcome", "textarea", {
          helper: "How clients get results FASTER",
          aliases: ["faster outcome", "faster results", "sneller resultaat"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.angle_easier_process", "Easier Process", "textarea", {
          helper: "How the process is made EASIER",
          aliases: ["easier process", "eenvoudiger proces", "makkelijker proces"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.framework.name", "Framework / Method Name", "text", {
          helper: "Memorable name for the signature method, 2-5 words",
          aliases: ["framework method name", "method name", "framework naam", "methode naam"],
        }),
        f("offer_stack.angle.framework.description", "Framework — Brief Description", "text", {
          helper: "One line describing what makes the framework unique and why it works",
          aliases: ["framework description", "brief description", "framework beschrijving", "methode beschrijving"],
        }),
        f("offer_stack.angle.core_promise.desired_outcome", "Desired Outcome (Core Promise)", "text", {
          helper: "Specific transformation the client walks away with",
          aliases: ["desired outcome", "promise outcome", "gewenste uitkomst"],
        }),
        f("offer_stack.angle.core_promise.timeframe", "Timeframe (Core Promise)", "text", {
          helper: "Use one of: 7_days, 30_days, 60_days, 90_days, 6_months, 12_months, custom",
          aliases: ["promise timeframe", "timeframe", "termijn", "tijdspanne"],
        }),
        f("offer_stack.angle.core_promise.timeframe_custom", "Timeframe — Custom Label", "text", {
          helper: "Short custom label when timeframe = custom",
          aliases: ["timeframe custom", "custom timeframe", "custom termijn"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.core_promise.guarantee", "Guarantee / Risk Reversal", "text", {
          helper: "Optional risk reversal promise, one sentence",
          aliases: ["guarantee", "risk reversal", "garantie", "risico omkering"],
          countsTowardProgress: false,
        }),
      ],
    },
    {
      id: "stack",
      tabId: "offer_design",
      label: "Offer Stack",
      aliases: [
        "offer stack", "offer stack tab", "stack tab", "tab offer stack",
        "volledige offer stack", "full offer stack", "core deliverables",
        "templates resources", "templates & resources", "support system",
        "bonuses", "delivery timeline", "milestones",
      ],
      iconKey: "Layers",
      progress: { mode: "custom", ruleId: "offer.stack" },
      lists: [
        list(
          "offer_stack.stack.deliverables",
          "Core Deliverables",
          "Deliverable",
          [
            { key: "name", label: "Name", kind: "text", helper: "Short, benefit-driven name for a core deliverable" },
            { key: "description", label: "Description", kind: "textarea", helper: "1-2 sentences describing what the client receives and how it works" },
            { key: "frequency", label: "Frequency", kind: "text", helper: "One of: one_time | daily | weekly | biweekly | monthly | quarterly | ongoing" },
          ],
          { aiIndexedCount: 3, suggestedCount: [3, 5] },
        ),
        list(
          "offer_stack.stack.resources",
          "Templates & Resources",
          "Resource",
          [
            { key: "name", label: "Name", kind: "text", helper: "Clear name for a template, guide, checklist, swipe file or resource" },
            { key: "resource_type", label: "Type", kind: "text", helper: "Template, guide, checklist, swipe file, workbook, calculator, etc." },
            { key: "description", label: "Description", kind: "textarea", helper: "What is inside the resource and how the client uses it" },
          ],
          { aiIndexedCount: 3, suggestedCount: [3, 5] },
        ),
        list(
          "offer_stack.stack.support_channels",
          "Support System",
          "Support Channel",
          [
            { key: "name", label: "Name", kind: "text", helper: "Name of the support channel or access point" },
            { key: "description", label: "Description", kind: "textarea", helper: "What support the client gets and when to use it" },
            { key: "frequency", label: "Frequency", kind: "text", helper: "How often this support is available" },
          ],
          { aiIndexedCount: 2, suggestedCount: [2, 4] },
        ),
        list(
          "offer_stack.stack.bonuses",
          "Bonuses",
          "Bonus",
          [
            { key: "name", label: "Name", kind: "text", helper: "Short, value-driven bonus name" },
            { key: "description", label: "Description", kind: "textarea", helper: "Why this bonus accelerates or simplifies the result" },
            { key: "perceived_value", label: "Perceived Value", kind: "text", helper: "Concrete value signal, e.g. €500 value or saves 10 hours" },
          ],
          { aiIndexedCount: 2, suggestedCount: [2, 4] },
        ),
        list(
          "offer_stack.stack.milestones",
          "Delivery Milestones",
          "Milestone",
          [
            { key: "phase_name", label: "Phase Name", kind: "text", helper: "Short phase or milestone name" },
            { key: "description", label: "Description", kind: "textarea", helper: "What happens in this phase" },
            { key: "expected_outcome", label: "Expected Outcome", kind: "textarea", helper: "What the client can expect to achieve by the end of this phase" },
          ],
          { aiIndexedCount: 3, suggestedCount: [3, 5] },
        ),
      ],
      fields: [
        f("offer_stack.stack.delivery_timeline", "Delivery Timeline", "text", {
          helper: "Use one of: 7_days, 30_days, 60_days, 90_days, 6_months, 12_months, custom",
          aliases: ["delivery timeline", "program timeline", "delivery timeframe", "doorlooptijd"],
        }),
        f("offer_stack.stack.delivery_timeline_custom", "Delivery Timeline — Custom Label", "text", {
          helper: "Short custom label when delivery_timeline = custom",
          aliases: ["delivery timeline custom", "custom delivery timeline", "custom timeline"],
          countsTowardProgress: false,
        }),
      ],
    },
    {
      id: "pricing",
      tabId: "offer_design",
      label: "Pricing",
      aliases: ["pricing", "pricing tab", "prijzen", "prijstab"],
      iconKey: "Euro",
      progress: { mode: "custom", ruleId: "offer.pricing" },
      lists: [
        list(
          "offer_stack.pricing.payment_plans",
          "Payment Plans",
          "Payment Plan",
          [
            { key: "type", label: "Type", kind: "text", helper: "One of: full_pay | split_2 | split_3 | split_6 | monthly | custom" },
            { key: "custom_label", label: "Label", kind: "text", helper: "Short plan name, e.g. 'Pay in Full', '3-Pay'" },
            { key: "amount", label: "Amount", kind: "text", helper: "Numeric amount for this plan in workspace currency, e.g. 997. Numbers only." },
            { key: "duration", label: "Duration", kind: "text", helper: "How long the plan runs, e.g. '3 months', '12 weeks'" },
          ],
          { aiIndexedCount: 3, suggestedCount: [2, 3] },
        ),
      ],
      fields: [
        f("offer_stack.pricing.core_price", "Core Price", "text", {
          helper: "Numeric headline price for the main offer, e.g. 2500. Numbers only.",
          aliases: ["core price", "headline price", "main price", "kernprijs", "hoofdprijs"],
        }),
        f("offer_stack.pricing.guarantee_type", "Guarantee Type", "text", {
          helper: "One of: none | refund | performance | milestone | custom",
          aliases: ["guarantee type", "type garantie", "risk reversal type"],
        }),
        f("offer_stack.pricing.guarantee_custom", "Guarantee — Custom Label", "text", {
          helper: "Short label when guarantee_type = custom",
          aliases: ["guarantee custom label", "custom guarantee label"],
          countsTowardProgress: false,
        }),
        f("offer_stack.pricing.guarantee_details", "Guarantee Details / Terms", "textarea", {
          helper: "Concrete, buyer-friendly terms of the guarantee",
          aliases: ["guarantee details", "guarantee terms", "risk reversal details"],
        }),
      ],
    },
    {
      id: "ecosystem",
      tabId: "offer_design",
      label: "Offer Ecosystem",
      description:
        "Offers are stored as rows in the `offers` table (not in the blueprint JSON). The Coach adds new offers through the virtual offer_ecosystem.<tier>.new_<n>.<field> paths.",
      aliases: ["offer ecosystem", "ecosystem", "offer ladder", "value ladder", "aanbodladder"],
      iconKey: "Network",
      progress: { mode: "custom", ruleId: "offer.ecosystem" },
      lists: [],
      fields: [],
    },
  ],
};

// =============================================================================
// TAB 3 — BRAND STRATEGY
// =============================================================================

const BRAND_STRATEGY_TAB: RegistryTab = {
  id: "brand_strategy",
  label: "Brand Strategy",
  column: "brand_strategy",
  iconKey: "Palette",
  progressAggregate: "average",
  subBlocks: [
    {
      id: "positioning",
      tabId: "brand_strategy",
      label: "Positioning",
      description: "How your business should be positioned in the market.",
      aliases: ["positioning", "brand positioning", "positionering"],
      iconKey: "Compass",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("brand_strategy.positioning_statement", "Positioning Statement", "textarea", {
          helper:
            "The one-line strategic claim your business owns. Template: For {audience}, we are the {category} that {differentiator}, so they can {outcome}.",
          placeholder:
            "For B2B coaches, we are the growth OS that operationalizes the whole business — so they can scale without burnout.",
          aliases: ["positioning statement", "positionering statement"],
          rows: 3,
          fullWidth: true,
        }),
        f("brand_strategy.positioning_promise", "Core Promise", "textarea", {
          helper: "The transformation you consistently deliver, in one sentence.",
          placeholder: "We turn scattered coaching businesses into predictable, repeatable growth engines.",
          aliases: ["brand promise", "merkbelofte"],
          rows: 2,
          fullWidth: true,
        }),
        f("brand_strategy.positioning_differentiators", "Key Differentiators", "tags", {
          helper: "What makes you clearly different from every alternative.",
          placeholder: "Add a differentiator and press Enter…",
          aliases: ["differentiators", "key differentiators", "onderscheidend"],
          fullWidth: true,
        }),
        f("brand_strategy.messaging_pillars", "Messaging Pillars", "tags", {
          helper: "The core topics your brand consistently communicates about.",
          placeholder: "Add a pillar and press Enter…",
          aliases: ["messaging pillars", "content pillars", "boodschapspijlers"],
          fullWidth: true,
        }),
      ],
    },
    {
      id: "voice",
      tabId: "brand_strategy",
      label: "Brand Voice",
      description: "How your brand should communicate.",
      aliases: ["brand voice", "voice", "tone of voice", "merkstem"],
      iconKey: "Mic",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("brand_strategy.voice_tone", "Tone", "suggested-tags", {
          helper: "Pick the adjectives that describe how your brand sounds. Add your own if needed.",
          placeholder: "Add custom tone and press Enter…",
          suggestions: TONE_SUGGESTIONS,
          aliases: ["tone", "brand tone", "toon"],
          fullWidth: true,
        }),
        f("brand_strategy.voice_do", "We Do", "bullet-list", {
          helper: "Voice moves you always make. One per line.",
          placeholder: "Speak plainly",
          aliases: ["voice do", "we do", "wat we wel doen"],
          fullWidth: true,
        }),
        f("brand_strategy.voice_dont", "We Don't", "bullet-list", {
          helper: "Voice moves you never make. One per line.",
          placeholder: "Empty jargon",
          aliases: ["voice dont", "we dont", "wat we niet doen"],
          fullWidth: true,
        }),
      ],
    },
    {
      id: "visual",
      tabId: "brand_strategy",
      label: "Visual Direction",
      description: "Enough visual direction for consistent identity across assets.",
      aliases: ["visual direction", "visual", "visuele richting", "look and feel"],
      iconKey: "Eye",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("brand_strategy.visual_style", "Visual Style", "suggested-tags", {
          helper: "Pick the words that describe your visual style. Add your own if needed.",
          placeholder: "Add custom style and press Enter…",
          suggestions: VISUAL_STYLE_SUGGESTIONS,
          aliases: ["visual style", "visuele stijl"],
          fullWidth: true,
        }),
        f("brand_strategy.visual_colors", "Brand Colors", "colors", {
          helper: "Primary, secondary and accent colors used across your brand.",
          aliases: ["brand colors", "colors", "kleuren"],
          fullWidth: true,
          // Colors are picked in a swatch UI — never AI-written.
          aiWritable: false,
        }),
        f("brand_strategy.visual_references", "Visual Inspiration", "textarea", {
          helper: "Brands, links or short descriptions that capture the aesthetic.",
          placeholder: "Linear · Attio · Framer. Product-first, no stock photography.",
          aliases: ["visual references", "visual inspiration", "inspiratie"],
          rows: 2,
          fullWidth: true,
        }),
      ],
    },
    {
      id: "foundation",
      tabId: "brand_strategy",
      label: "Brand Foundation",
      description: "Basic brand identity.",
      aliases: ["brand foundation", "foundation", "merkfundament"],
      iconKey: "Sparkles",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("brand_strategy.brand_name", "Brand Name", "textarea", {
          helper: "The name customers know you by.",
          placeholder: "Boostmate",
          aliases: ["brand name", "merknaam"],
          rows: 1,
          fullWidth: true,
        }),
        f("brand_strategy.brand_tagline", "Tagline", "textarea", {
          helper: "One short line that captures what you stand for.",
          placeholder: "The Growth OS for coaches and agencies.",
          aliases: ["tagline", "slogan", "pay-off"],
          rows: 2,
          fullWidth: true,
        }),
        f("brand_strategy.brand_mission", "Mission", "textarea", {
          helper: "Why your brand exists — 1–2 sentences.",
          placeholder: "We help experts turn their expertise into a repeatable business — without burning out.",
          aliases: ["mission", "missie", "purpose"],
          rows: 3,
          fullWidth: true,
        }),
      ],
    },
  ],
};

// =============================================================================
// TAB 4 — AUTHORITY & CONTENT (proof_authority column)
// =============================================================================

const PROOF_AUTHORITY_TAB: RegistryTab = {
  id: "proof_authority",
  label: "Authority & Content",
  column: "proof_authority",
  iconKey: "Award",
  progressAggregate: "pooled",
  subBlocks: [
    {
      id: "authority",
      tabId: "proof_authority",
      label: "Authority",
      description: "How your authority is positioned and why people trust you.",
      aliases: ["authority", "authority positioning", "autoriteit", "proof authority", "proof & authority"],
      iconKey: "Award",
      progress: { mode: "units" },
      lists: [],
      fields: [
        f("proof_authority.authority.authority_types", "Authority Types", "chips-multi", {
          helper: "The authority archetypes you lead with.",
          options: AUTHORITY_TYPE_OPTIONS.map((o) => ({ value: o, label: o })),
          aliases: ["authority types", "authority type", "autoriteitstype"],
          // Multi-select chips are chosen from a fixed option list in the UI.
          aiWritable: false,
        }),
        f("proof_authority.authority.credibility_foundations", "Credibility Foundations", "chips-multi", {
          helper: "What your credibility is built on.",
          options: CREDIBILITY_FOUNDATION_OPTIONS.map((o) => ({ value: o, label: o })),
          aliases: ["credibility foundations", "credibility", "geloofwaardigheid"],
          aiWritable: false,
        }),
        f("proof_authority.authority.trust_reason", "Why Clients Trust You", "textarea", {
          helper: "The core reason clients trust you, 1-2 sentences",
          aliases: ["trust reason", "why clients trust you", "why they trust you"],
        }),
        f("proof_authority.authority.signature_proof", "Signature Proof", "textarea", {
          helper: "The single strongest proof point you lead with",
          aliases: ["signature proof", "flagship proof", "hero proof"],
        }),
      ],
    },
    {
      id: "social_proof",
      tabId: "proof_authority",
      label: "Social Proof",
      description: "Metrics, results, testimonials and authority assets.",
      aliases: ["social proof", "proof library", "testimonials", "bewijs", "social proof library"],
      iconKey: "Star",
      progress: { mode: "units" },
      fields: [],
      lists: [
        list(
          "proof_authority.social_proof.metrics",
          "Credibility Metrics",
          "Credibility Metric",
          [
            { key: "metric", label: "Metric", kind: "text", helper: "What is being measured, e.g. 'Clients served'" },
            { key: "value", label: "Value", kind: "text", helper: "The number or figure" },
            { key: "context", label: "Context", kind: "text", helper: "Short context sentence" },
          ],
          { aiIndexedCount: 3, suggestedCount: [3, 5] },
        ),
        list(
          "proof_authority.social_proof.client_results",
          "Client Results",
          "Client Result",
          [
            { key: "client_type", label: "Client Type", kind: "text", helper: "Type of client this result is from" },
            { key: "problem", label: "Problem", kind: "textarea", helper: "The problem they had" },
            { key: "result_achieved", label: "Result Achieved", kind: "textarea", helper: "The concrete result" },
            { key: "timeframe", label: "Timeframe", kind: "text", helper: "In what timeframe" },
            { key: "explanation", label: "Explanation", kind: "textarea", helper: "Why it worked" },
          ],
          { aiIndexedCount: 3, suggestedCount: [2, 4] },
        ),
        list(
          "proof_authority.social_proof.testimonials",
          "Testimonials",
          "Testimonial",
          [
            { key: "client_name", label: "Client Name", kind: "text", helper: "Client's name (first name is fine)" },
            { key: "client_type", label: "Client Type", kind: "text", helper: "Type of client (industry / role)" },
            { key: "quote", label: "Quote", kind: "textarea", helper: "The testimonial quote in the client's voice" },
            { key: "main_outcome", label: "Main Outcome", kind: "text", helper: "The main outcome achieved" },
          ],
          { aiIndexedCount: 3, suggestedCount: [2, 4] },
        ),
        list(
          "proof_authority.social_proof.authority_assets",
          "Authority Assets",
          "Authority Asset",
          [
            { key: "name", label: "Name", kind: "text", helper: "Name of the asset (feature, award, podcast, etc.)" },
            { key: "description", label: "Description", kind: "textarea", helper: "Short description of the asset" },
            { key: "why_it_matters", label: "Why It Matters", kind: "textarea", helper: "Why it establishes authority" },
          ],
          { aiIndexedCount: 2, suggestedCount: [2, 3] },
        ),
      ],
    },
    {
      id: "stories",
      tabId: "proof_authority",
      label: "Stories & Lessons",
      description: "Reusable narrative arcs and value lessons for nurture, VSLs, webinars and content.",
      aliases: ["stories", "stories and lessons", "stories & lessons", "founder story", "lessons", "verhalen", "lessen"],
      iconKey: "BookOpen",
      progress: { mode: "units" },
      fields: [],
      lists: [
        list(
          "proof_authority.authority.founder_stories",
          "Founder Stories",
          "Founder Story",
          [
            { key: "title", label: "Title", kind: "text", helper: "Short story title" },
            { key: "before", label: "Before", kind: "textarea", helper: "Where the founder was before" },
            { key: "challenge", label: "Challenge", kind: "textarea", helper: "The core challenge or turning point" },
            { key: "breakthrough", label: "Breakthrough", kind: "textarea", helper: "The breakthrough moment" },
            { key: "after", label: "After", kind: "textarea", helper: "Where the founder is now" },
            { key: "core_lesson", label: "Core Lesson", kind: "textarea", helper: "The core lesson for the reader" },
          ],
          { aiIndexedCount: 2, suggestedCount: [1, 3] },
        ),
        list(
          "proof_authority.educational.lessons",
          "Value Lessons",
          "Value Lesson",
          [
            { key: "title", label: "Title", kind: "text", helper: "Short lesson title" },
            { key: "main_topic", label: "Main Topic", kind: "text", helper: "The main topic covered" },
            { key: "common_challenge", label: "Common Challenge", kind: "textarea", helper: "The common challenge addressed" },
            { key: "core_insight", label: "Core Insight", kind: "textarea", helper: "The core insight of the lesson" },
            { key: "why_matters", label: "Why It Matters", kind: "textarea", helper: "Why the lesson matters" },
          ],
          { aiIndexedCount: 3, suggestedCount: [3, 5] },
        ),
      ],
    },
  ],
};

// =============================================================================
// THE REGISTRY
// =============================================================================

export const BLUEPRINT_REGISTRY: RegistryTab[] = [
  CUSTOMER_CLARITY_TAB,
  OFFER_DESIGN_TAB,
  BRAND_STRATEGY_TAB,
  PROOF_AUTHORITY_TAB,
];

/** JSON columns of business_blueprints the registry writes into. */
export const BLUEPRINT_COLUMNS: string[] = [...new Set(BLUEPRINT_REGISTRY.map((t) => t.column))];

// =============================================================================
// DERIVED LOOKUPS
// =============================================================================

export const BLUEPRINT_SUB_BLOCK_LIST: RegistrySubBlock[] = BLUEPRINT_REGISTRY.flatMap((t) => t.subBlocks);

export function getRegistryTab(tabId: string): RegistryTab | undefined {
  return BLUEPRINT_REGISTRY.find((t) => t.id === tabId);
}

export function getRegistrySubBlock(tabId: string, subBlockId: string): RegistrySubBlock | undefined {
  return getRegistryTab(tabId)?.subBlocks.find((s) => s.id === subBlockId);
}

/** Expand a repeatable list into the indexed field definitions the Coach may write. */
export function expandListFields(l: RegistryList): RegistryField[] {
  const out: RegistryField[] = [];
  for (let index = 0; index < l.aiIndexedCount; index++) {
    for (const spec of l.itemFields) {
      out.push({
        path: `${l.basePath}.${index}.${spec.key}`,
        key: spec.key,
        label: `${l.itemLabel} ${index + 1} — ${spec.label}`,
        helper: spec.helper,
        kind: spec.kind,
        aliases: [
          spec.key,
          `${l.itemLabel.toLowerCase()} ${index + 1} ${spec.label.toLowerCase()}`,
          `${index + 1} ${l.itemLabel.toLowerCase()} ${spec.label.toLowerCase()}`,
        ],
        aiWritable: l.aiWritable,
        countsTowardProgress: false,
      });
    }
  }
  return out;
}

/** Every field the app knows about — flat fields plus expanded list item fields. */
export const BLUEPRINT_FIELDS: RegistryField[] = BLUEPRINT_SUB_BLOCK_LIST.flatMap((sb) => [
  ...sb.fields,
  ...sb.lists.flatMap(expandListFields),
]);

export const BLUEPRINT_FIELD_BY_PATH: Record<string, RegistryField> = Object.fromEntries(
  BLUEPRINT_FIELDS.map((field) => [field.path, field]),
);

export const BLUEPRINT_FIELD_BY_KEY: Record<string, RegistryField> = Object.fromEntries(
  BLUEPRINT_FIELDS.map((field) => [field.key, field]),
);

export const BLUEPRINT_LISTS: RegistryList[] = BLUEPRINT_SUB_BLOCK_LIST.flatMap((sb) => sb.lists);

export function getBlueprintFieldByPath(path: string): RegistryField | undefined {
  return BLUEPRINT_FIELD_BY_PATH[path];
}

export function getBlueprintFieldByKey(key: string): RegistryField | undefined {
  return BLUEPRINT_FIELD_BY_KEY[key];
}

/** Sub-blocks in the flat shape the Coach uses to scope "fill this section". */
export interface BlueprintSubBlockDef {
  id: string;
  tabId: string;
  label: string;
  aliases: string[];
  fieldPaths: string[];
}

export const BLUEPRINT_SUB_BLOCKS: BlueprintSubBlockDef[] = BLUEPRINT_SUB_BLOCK_LIST.map((sb) => ({
  id: sb.id,
  tabId: sb.tabId,
  label: renderLabel(sb.label),
  aliases: sb.aliases,
  fieldPaths: [...sb.fields, ...sb.lists.flatMap(expandListFields)]
    .filter((field) => field.aiWritable)
    .map((field) => field.path),
}));

// =============================================================================
// PROGRESS
// =============================================================================

const nonEmpty = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  if (typeof v === "boolean") return v;
  return String(v).trim().length > 0;
};

export function getDeep(source: unknown, path: string): unknown {
  return path.split(".").reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), source);
}

/**
 * Generic "units" progress: each field or list flagged `countsTowardProgress`
 * is one equally-weighted unit; a field counts when non-empty, a list when it
 * has at least one item. `pathPrefix` strips the JSON-column prefix when the
 * caller passes column-local data (e.g. only the `brand_strategy` object).
 */
export function countSubBlockUnits(
  data: unknown,
  sb: RegistrySubBlock,
  pathPrefix = "",
): { filled: number; total: number } {
  const strip = (p: string) => (pathPrefix && p.startsWith(`${pathPrefix}.`) ? p.slice(pathPrefix.length + 1) : p);
  let filled = 0;
  let total = 0;
  for (const field of sb.fields) {
    if (!field.countsTowardProgress) continue;
    total++;
    if (nonEmpty(getDeep(data, strip(field.path)))) filled++;
  }
  for (const l of sb.lists) {
    if (!l.countsTowardProgress) continue;
    total++;
    if (nonEmpty(getDeep(data, strip(l.basePath)))) filled++;
  }
  return { filled, total };
}

/** Percentage for one sub-block using the generic units rule. */
export function calcSubBlockUnitsProgress(data: unknown, sb: RegistrySubBlock, pathPrefix = ""): number {
  const { filled, total } = countSubBlockUnits(data, sb, pathPrefix);
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

/** Pooled units percentage across every "units" sub-block of a tab. */
export function calcTabPooledUnitsProgress(data: unknown, tab: RegistryTab, pathPrefix = ""): number {
  let filled = 0;
  let total = 0;
  for (const sb of tab.subBlocks) {
    if (sb.progress.mode !== "units") continue;
    const counts = countSubBlockUnits(data, sb, pathPrefix);
    filled += counts.filled;
    total += counts.total;
  }
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

// =============================================================================
// PROMPT RENDERING (AI Coach)
// =============================================================================

export function renderBlueprintFieldPathsPrompt(): string {
  const header = `# Blueprint field paths (use these exact dot-paths in propose_blueprint_writes)
# Format: path — kind — label`;

  const lines = BLUEPRINT_FIELDS.filter((field) => field.aiWritable).map((field) => {
    const kindHint =
      field.kind === "tags" || field.kind === "suggested-tags" || field.kind === "chips-single" || field.kind === "chips-multi"
        ? `${field.kind} (comma-separated list of short items)`
        : field.kind === "bullet-list"
          ? "bullet-list (one short item per line)"
          : field.kind;
    const helper = field.helper ? ` — ${field.helper}` : "";
    return `${field.path} — ${kindHint} — ${field.label}${helper}`;
  });

  const footer = `
NOTE: Only the paths listed above can be written by the Coach. Some structured
builders expose safe writable sub-fields in this list (for example framework
pillars, core_promise and offer stack cards). Other structured areas that are
NOT listed must never be invented or written to.

# Offer Ecosystem (special — stored as rows in the offers table, not JSON)
These paths add NEW offers to the Offer Ecosystem tab. Use them when the user
asks to fill / draft / suggest offers for a specific tier or the whole tab.
Path shape: offer_ecosystem.<tier>.new_<n>.<field>
  - <tier>  ∈ free | low_ticket | mid_ticket | premium | continuity
              (NEVER "core" — the core offer is auto-synced from tabs 1–3)
  - <n>     is a 0-based index within this batch (new_0, new_1, …)
  - <field> ∈ name | description | core_outcome
Every proposed offer MUST include all three fields (name, description, core_outcome).
Suggested count per tier: 2–3 unless the user says otherwise. Label each write
"<Tier> — Offer <n> — <Field>".

Rules:
- Only write to paths the user's request actually implies. If the user asks for one field, write ONLY that path.
- For kind = tags/chips, value MUST be a comma-separated list of short items, not prose.
- Use the current Blueprint JSON to see what already exists and what's empty.`;

  return [header, ...lines, footer].join("\n");
}

/** Compact structural map of the Blueprint so the Coach knows the module shape. */
export function renderBlueprintStructurePrompt(): string {
  const lines: string[] = [
    "# Business Blueprint structure (generated from the Blueprint Registry)",
    "The Business Blueprint module has these tabs and sub-blocks:",
  ];
  for (const tab of BLUEPRINT_REGISTRY) {
    lines.push(`- ${tab.label} (tab id: ${tab.id}, JSON column: ${tab.column})`);
    for (const sb of tab.subBlocks) {
      const listNames = sb.lists.map((l) => l.label).join(", ");
      lines.push(
        `  - ${renderLabel(sb.label)} (${sb.id}) — ${sb.fields.length} field(s)${listNames ? `, lists: ${listNames}` : ""}`,
      );
    }
  }
  return lines.join("\n");
}
