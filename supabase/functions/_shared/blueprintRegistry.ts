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

// ---- Offer Editor metadata (optional, additive) ----------------------------
// None of these are read by the AI Coach prompts, write-back validation or
// progress calculations. They describe value semantics for editors.

/** Offer categories (mirrors EcosystemTier in the UI layer). */
export type OfferTier = "free" | "low_ticket" | "mid_ticket" | "core" | "premium" | "continuity";
export const OFFER_TIERS: OfferTier[] = ["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"];

/** Semantic value type of a field. Defaults to "string" when omitted. */
export type FieldValueType = "string" | "number" | "boolean" | "enum" | "string[]";

export interface EnumValue {
  value: string;
  label: string;
}

/**
 * Name of a specialised editor control. The registry only names it; the
 * editor owns the name → component mapping. No UI logic lives here.
 */
export type OfferControlKey =
  | "timeframe"
  | "delivery-frequency"
  | "delivery-types"
  | "currency-amount"
  | "toggle"
  | "payment-plan-type"
  | "guarantee-type"
  | "billing-interval"
  | "offer-format"
  | "premium-mode"
  | "touch-level";

/**
 * Editor presentation copy for the Offer Editor (optional, additive).
 * Strings may use label tokens ({noun}, {Noun}, …). `coach` holds the exact
 * label/helper/placeholder the field's AI Coach button sends as its target —
 * kept separate so editor copy can evolve without changing Coach input.
 * Never read by Coach prompts, write-back validation or progress.
 */
export interface OfferEditorCopy {
  label?: string;
  helper?: string;
  placeholder?: string;
  coach?: { label?: string; helper?: string; placeholder?: string };
  /** Editor display labels for enum options (Coach keeps `enumValues`). */
  options?: EnumValue[];
}

export interface EditorFieldMeta {
  valueType?: FieldValueType;
  enumValues?: EnumValue[];
  control?: OfferControlKey;
  editor?: OfferEditorCopy;
}

export interface RegistryField extends EditorFieldMeta {
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
  /**
   * Editor-only definition: excluded from BLUEPRINT_FIELDS, the Coach prompts,
   * write-back validation and progress. Only lives in `editorFields`.
   */
  editorOnly?: boolean;
}

export interface RegistryListItemField extends EditorFieldMeta {
  key: string;
  label: string;
  kind: "text" | "textarea";
  helper?: string;
  /** Editor-only item fields are declared in `editorItemFields`; defaults true. */
  aiWritable?: boolean;
}

/**
 * Offer Editor copy for a dynamic list (optional, additive; never read by
 * Coach prompts, write-back validation or progress). `coach` is the exact
 * list-Coach target the section button sends; `coachItemFields` keeps the
 * list-Coach item order/wording verbatim.
 */
export interface OfferListEditorCopy {
  title?: string;
  description?: string;
  addLabel?: string;
  emptyText?: string;
  /** Collapsed item fallback title; `{n}` = 1-based position. */
  itemFallbackTitle?: string;
  coach?: { id: string; label?: string; helper?: string };
  coachItemFields?: { key: string; label: string; kind?: "text" | "textarea"; helper?: string }[];
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
  /**
   * Item fields that editors render but the Coach never sees (not expanded
   * into BLUEPRINT_FIELDS, not in prompts).
   */
  editorItemFields?: RegistryListItemField[];
  editor?: OfferListEditorCopy;
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
  /** Offer categories this sub-block applies to (Offer Design only). */
  appliesToTiers?: OfferTier[] | "all";
  /** Editor-only fields (see RegistryField.editorOnly). */
  editorFields?: RegistryField[];
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
  valueType?: FieldValueType;
  enumValues?: EnumValue[];
  control?: OfferControlKey;
  editorOnly?: boolean;
  editor?: OfferEditorCopy;
}

/** Only copy editor metadata keys that are actually set (keeps objects lean). */
const editorMeta = (opts: FieldOpts) => ({
  ...(opts.valueType ? { valueType: opts.valueType } : {}),
  ...(opts.enumValues ? { enumValues: opts.enumValues } : {}),
  ...(opts.control ? { control: opts.control } : {}),
  ...(opts.editorOnly ? { editorOnly: true } : {}),
  ...(opts.editor ? { editor: opts.editor } : {}),
});

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
  ...editorMeta(opts),
});

/** Editor-only field: never Coach-visible, never counts toward progress. */
const ef = (path: string, label: string, kind: BlueprintFieldKind, opts: FieldOpts = {}): RegistryField =>
  f(path, label, kind, { ...opts, aiWritable: false, countsTowardProgress: false, editorOnly: true });

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
    editorItemFields?: RegistryListItemField[];
    editor?: OfferListEditorCopy;
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
  ...(opts.editorItemFields ? { editorItemFields: opts.editorItemFields } : {}),
  ...(opts.editor ? { editor: opts.editor } : {}),
});

// -----------------------------------------------------------------------------
// Offer enum value sets (must match the unions in offerDesignTypes.ts — tested)
// -----------------------------------------------------------------------------

export const TIMEFRAME_VALUES: EnumValue[] = [
  { value: "7_days", label: "7 days" },
  { value: "30_days", label: "30 days" },
  { value: "60_days", label: "60 days" },
  { value: "90_days", label: "90 days" },
  { value: "6_months", label: "6 months" },
  { value: "12_months", label: "12 months" },
  { value: "custom", label: "Custom" },
];

export const DELIVERY_FREQUENCY_VALUES: EnumValue[] = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "ongoing", label: "Ongoing" },
];

export const PAYMENT_PLAN_TYPE_VALUES: EnumValue[] = [
  { value: "full_pay", label: "Pay in Full" },
  { value: "split_2", label: "2 Payments" },
  { value: "split_3", label: "3 Payments" },
  { value: "split_6", label: "6 Payments" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export const GUARANTEE_TYPE_VALUES: EnumValue[] = [
  { value: "none", label: "None" },
  { value: "refund", label: "Refund" },
  { value: "performance", label: "Performance" },
  { value: "milestone", label: "Milestone" },
  { value: "custom", label: "Custom" },
];

/** Editor display labels (Pricing tab wording); Coach keeps the *_VALUES labels. */
export const PAYMENT_PLAN_EDITOR_OPTIONS: EnumValue[] = [
  { value: "full_pay", label: "Full Pay" },
  { value: "split_2", label: "2 Pay" },
  { value: "split_3", label: "3 Pay" },
  { value: "split_6", label: "6 Pay" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export const GUARANTEE_EDITOR_OPTIONS: EnumValue[] = [
  { value: "none", label: "No Guarantee" },
  { value: "refund", label: "Refund Guarantee" },
  { value: "performance", label: "Performance Guarantee" },
  { value: "milestone", label: "Milestone Guarantee" },
  { value: "custom", label: "Custom" },
];

/** Free-offer formats (configurable here only). */
export const OFFER_FORMAT_VALUES: EnumValue[] = [
  { value: "pdf", label: "PDF" },
  { value: "assessment", label: "Assessment" },
  { value: "webinar", label: "Webinar" },
  { value: "challenge", label: "Challenge" },
  { value: "consultation", label: "Consultation" },
  { value: "mini_course", label: "Mini-Course" },
  { value: "other", label: "Other" },
];

export const PREMIUM_MODE_VALUES: EnumValue[] = [
  { value: "standalone", label: "Standalone premium offer" },
  { value: "upgrade", label: "Upgrade of a Core Offer" },
];

export const TOUCH_LEVEL_VALUES: EnumValue[] = [
  { value: "one_on_one", label: "1:1" },
  { value: "done_with_you", label: "Done-with-you" },
  { value: "done_for_you", label: "Done-for-you" },
  { value: "vip_day", label: "VIP day" },
  { value: "priority_access", label: "Priority access" },
];

export const BILLING_INTERVAL_VALUES: EnumValue[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const DELIVERY_TYPES_ITEM: RegistryListItemField = {
  key: "delivery_types",
  label: "Delivery Types",
  kind: "text",
  valueType: "string[]",
  control: "delivery-types",
  aiWritable: false,
};

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
      appliesToTiers: ["core"],
      // Category editor fields (non-Core tiers). Editor-only: hidden from Coach prompts/write-backs.
      editorFields: [
        ef("offer_stack.angle.offer_format", "Offer Format", "text", {
          valueType: "enum", enumValues: OFFER_FORMAT_VALUES, control: "offer-format",
          editor: { helper: "What kind of offer is this?" },
        }),
        ef("offer_stack.angle.problem_solved", "Problem Solved", "textarea", {
          editor: { helper: "The specific problem this offer solves.", placeholder: "e.g. Not knowing which leads are worth following up" },
        }),
        ef("offer_stack.angle.quick_win", "Quick Win / Immediate Value", "textarea", {
          editor: { helper: "The fast, tangible result buyers get right away.", placeholder: "e.g. A ready-to-use follow-up script in 10 minutes" },
        }),
        ef("offer_stack.angle.next_step_cta", "Next-Step CTA", "text", {
          editor: { helper: "What should people do after this offer?", placeholder: "e.g. Book a free strategy call" },
        }),
        ef("offer_stack.angle.premium_mode", "Premium Type", "text", {
          valueType: "enum", enumValues: PREMIUM_MODE_VALUES, control: "premium-mode",
          editor: { helper: "A standalone premium offer, or an upgrade of an existing Core Offer." },
        }),
      ],
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
          editor: {label:"Main Offer Name",helper:"What is your flagship offer called?",placeholder:"e.g. The Confidence Reset, Lead Engine 90, Scale Sprint…",coach:{label:"Main Offer Name",helper:"Short, 3–6 words. Just the name of your flagship offer.",placeholder:"e.g. The Confidence Reset, Lead Engine 90…"}},
          helper: "Short, 3-6 words, name only",
          aliases: ["main offer name", "offer name", "flagship name", "naam aanbod"],
        }),
        f("offer_stack.angle.short_description", "Short Offer Description", "textarea", {
          editor: {label:"Short Offer Description",helper:"1–2 sentences explaining what the offer actually is.",placeholder:"e.g. A 90-day coaching program that helps {noun} rebuild confidence after toxic relationships.",coach:{label:"Short Offer Description",helper:"1–2 sentences explaining what the offer actually is.",placeholder:"e.g. A 90-day coaching program that helps {noun}…"}},
          helper: "1-2 sentences",
          aliases: ["short offer description", "offer description", "korte beschrijving"],
        }),
        f("offer_stack.angle.core_outcome", "Core Outcome", "textarea", {
          editor: {label:"Core Outcome",helper:"The primary transformation result.",placeholder:"e.g. Rebuild self-trust and confidently attract healthy relationships.",coach:{label:"Core Outcome",helper:"The primary transformation result in 1 sentence.",placeholder:"e.g. Rebuild self-trust and confidently attract healthy relationships."}},
          helper: "Primary transformation result, 1 sentence",
          aliases: ["core outcome", "primary outcome", "main outcome", "hoofdresultaat"],
        }),
        f("offer_stack.angle.angle_new_vehicle", "New Vehicle", "textarea", {
          editor: {label:"New Vehicle",helper:"What makes your method genuinely new compared to what they already tried?",placeholder:"e.g. The first 90-day program that combines somatic work with strategic positioning…",coach:{label:"New Vehicle",helper:"What makes your method genuinely new compared to what they already tried?"}},
          helper: "What makes the method genuinely NEW",
          aliases: ["new vehicle", "new method", "nieuw voertuig", "nieuwe methode"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.angle_better_results", "Better Results", "textarea", {
          editor: {label:"Better Results",helper:"Why does your method produce better results?",placeholder:"e.g. Because we combine strategy with implementation in the same week…",coach:{label:"Better Results",helper:"Why does your method produce better results?"}},
          helper: "Why the method produces BETTER results",
          aliases: ["better results", "betere resultaten"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.angle_faster_outcome", "Faster Outcome", "textarea", {
          editor: {label:"Faster Outcome",helper:"How do clients get results faster?",placeholder:"e.g. We compress 6 months of trial-and-error into 30 days of guided execution…",coach:{label:"Faster Outcome",helper:"How do clients get results faster?"}},
          helper: "How clients get results FASTER",
          aliases: ["faster outcome", "faster results", "sneller resultaat"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.angle_easier_process", "Easier Process", "textarea", {
          editor: {label:"Easier Process",helper:"How do you make the process feel easier?",placeholder:"e.g. Done-with-you templates, weekly accountability, no guesswork…",coach:{label:"Easier Process",helper:"How do you make the process feel easier?"}},
          helper: "How the process is made EASIER",
          aliases: ["easier process", "eenvoudiger proces", "makkelijker proces"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.framework.name", "Framework / Method Name", "text", {
          editor: {label:"Framework Name",placeholder:"e.g. The Confidence Reset Method",coach:{label:"Framework Name",helper:"A memorable name for your signature method. 2–5 words. Ownable.",placeholder:"e.g. The Confidence Reset Method"}},
          helper: "Memorable name for the signature method, 2-5 words",
          aliases: ["framework method name", "method name", "framework naam", "methode naam"],
        }),
        f("offer_stack.angle.framework.description", "Framework — Brief Description", "text", {
          editor: {label:"Brief Description",placeholder:"What makes it unique and why it works",coach:{label:"Framework — Brief Description",helper:"One line describing what makes the framework unique and why it works.",placeholder:"What makes it unique and why it works"}},
          helper: "One line describing what makes the framework unique and why it works",
          aliases: ["framework description", "brief description", "framework beschrijving", "methode beschrijving"],
        }),
        f("offer_stack.angle.core_promise.desired_outcome", "Desired Outcome (Core Promise)", "text", {
          editor: {label:"Desired Outcome",placeholder:"e.g. Rebuild confidence and self-trust",coach:{label:"Desired Outcome (Core Promise)",helper:"The specific transformation the client walks away with. Short and concrete.",placeholder:"e.g. Rebuild confidence and self-trust"}},
          helper: "Specific transformation the client walks away with",
          aliases: ["desired outcome", "promise outcome", "gewenste uitkomst"],
        }),
        f("offer_stack.angle.core_promise.timeframe", "Timeframe (Core Promise)", "text", {
          helper: "Use one of: 7_days, 30_days, 60_days, 90_days, 6_months, 12_months, custom",
          aliases: ["promise timeframe", "timeframe", "termijn", "tijdspanne"],
          valueType: "enum", enumValues: TIMEFRAME_VALUES, control: "timeframe",
        }),
        f("offer_stack.angle.core_promise.timeframe_custom", "Timeframe — Custom Label", "text", {
          helper: "Short custom label when timeframe = custom",
          aliases: ["timeframe custom", "custom timeframe", "custom termijn"],
          countsTowardProgress: false,
        }),
        f("offer_stack.angle.core_promise.guarantee", "Guarantee / Risk Reversal", "text", {
          editor: {label:"Guarantee / Risk Reversal",placeholder:"e.g. Final payment waived if no progress",coach:{label:"Guarantee / Risk Reversal",helper:"A concrete promise that removes the buyer's risk. One sentence.",placeholder:"e.g. Final payment waived if no progress"}},
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
      appliesToTiers: ["core"],
      editorFields: [
        ef("offer_stack.stack.delivery_types", "Delivery Type", "text", {
          valueType: "string[]", control: "delivery-types",
          editor: { placeholder: "How is it delivered?" },
        }),
        ef("offer_stack.stack.touch_level", "High-Touch Level", "text", {
          valueType: "string[]", enumValues: TOUCH_LEVEL_VALUES, control: "touch-level",
          editor: { helper: "How hands-on is this offer?" },
        }),
      ],
      lists: [
        list(
          "offer_stack.stack.deliverables",
          "Core Deliverables",
          "Deliverable",
          [
            { key: "name", editor: {"label": "Deliverable Name", "placeholder": "Deliverable name (e.g. Weekly 1:1 Coaching Calls)", "coach": {"label": "Deliverable {n} — Name", "helper": "A short, benefit-driven name for this deliverable.", "placeholder": "e.g. Weekly 1:1 Coaching Calls"}}, label: "Name", kind: "text", helper: "Short, benefit-driven name for a core deliverable" },
            { key: "description", editor: {"label": "Description", "placeholder": "Short description…", "coach": {"label": "Deliverable {n} — Description", "helper": "1–2 sentences describing what the client gets and how it works.", "placeholder": "Short description…"}}, label: "Description", kind: "textarea", helper: "1-2 sentences describing what the client receives and how it works" },
            { key: "frequency", editor: {"label": "Frequency", "placeholder": "Frequency"}, label: "Frequency", kind: "text", helper: "One of: one_time | daily | weekly | biweekly | monthly | quarterly | ongoing", valueType: "enum", enumValues: DELIVERY_FREQUENCY_VALUES, control: "delivery-frequency" },
          ],
          { editor: {"title": "Core Deliverables", "description": "Main service, coaching or program components.", "addLabel": "Add Deliverable", "emptyText": "No deliverables yet. Start with your most valuable component.", "itemFallbackTitle": "Deliverable {n}", "coach": {"id": "stack_deliverables", "label": "Core Deliverables", "helper": "Main service, coaching or program components clients receive."}, "coachItemFields": [{"key": "name", "label": "Name", "kind": "text", "helper": "Short, benefit-driven deliverable name."}, {"key": "description", "label": "Description", "kind": "textarea", "helper": "1–2 sentences on what the client gets."}]}, aiIndexedCount: 3, suggestedCount: [3, 5], editorItemFields: [DELIVERY_TYPES_ITEM] },
        ),
        list(
          "offer_stack.stack.resources",
          "Templates & Resources",
          "Resource",
          [
            { key: "name", editor: {"label": "Resource Name", "placeholder": "Resource name", "coach": {"label": "Resource {n} — Name", "helper": "Clear name for this template or resource."}}, label: "Name", kind: "text", helper: "Clear name for a template, guide, checklist, swipe file or resource" },
            { key: "resource_type", editor: {"label": "Type", "placeholder": "Type (Template, Ebook, Checklist…)", "coach": {"label": "Resource {n} — Type", "helper": "Template, Ebook, Checklist, Swipe file…"}}, label: "Type", kind: "text", helper: "Template, guide, checklist, swipe file, workbook, calculator, etc." },
            { key: "description", editor: {"label": "Description", "placeholder": "Short description…", "coach": {"label": "Resource {n} — Description", "helper": "Short description of what's inside and how it's used."}}, label: "Description", kind: "textarea", helper: "What is inside the resource and how the client uses it" },
          ],
          { editor: {"title": "Templates & Resources", "description": "Add resources included in your offer. Click a quick-add chip to start a card.", "addLabel": "Add Resource", "emptyText": "No resources yet. Quick-add common types below or add a custom resource.", "itemFallbackTitle": "Resource {n}", "coach": {"id": "stack_resources", "label": "Templates & Resources", "helper": "Templates, guides, checklists, swipe files included with the offer."}, "coachItemFields": [{"key": "name", "label": "Name", "kind": "text"}, {"key": "resource_type", "label": "Type", "kind": "text", "helper": "Template, Ebook, Checklist, Swipe file…"}, {"key": "description", "label": "Description", "kind": "textarea", "helper": "What's inside and how it's used."}]}, aiIndexedCount: 3, suggestedCount: [3, 5] },
        ),
        list(
          "offer_stack.stack.support_channels",
          "Support System",
          "Support Channel",
          [
            { key: "name", editor: {"label": "Channel Name", "placeholder": "Channel name (e.g. Slack)", "coach": {"label": "Support Channel {n} — Name", "helper": "Which channel do clients use? (Slack, Voxer, Zoom…)"}}, label: "Name", kind: "text", helper: "Name of the support channel or access point" },
            { key: "description", editor: {"label": "Description", "placeholder": "Short description…", "coach": {"label": "Support Channel {n} — Description", "helper": "What kind of questions are answered here? Expected response time?"}}, label: "Description", kind: "textarea", helper: "What support the client gets and when to use it" },
            { key: "frequency", editor: {"label": "Frequency / Availability", "placeholder": "Frequency / availability (e.g. Mon–Fri 9–5 CET)", "coach": {"label": "Support Channel {n} — Frequency", "helper": "When are you available on this channel?"}}, label: "Frequency", kind: "text", helper: "How often this support is available" },
          ],
          { editor: {"title": "Support System", "description": "How will clients reach you and your team?", "addLabel": "Add Support Channel", "emptyText": "No support channels yet. Quick-add common ones or add custom.", "itemFallbackTitle": "Support Channel {n}", "coach": {"id": "stack_support_channels", "label": "Support System", "helper": "Channels clients use to reach you (Slack, Voxer, calls…)."}, "coachItemFields": [{"key": "name", "label": "Name", "kind": "text", "helper": "Channel name (Slack, WhatsApp, Q&A calls…)."}, {"key": "frequency", "label": "Frequency / Availability", "kind": "text", "helper": "When are you available (e.g. Mon–Fri 9–5)."}, {"key": "description", "label": "Description", "kind": "textarea", "helper": "What kind of support happens here and typical response time."}]}, aiIndexedCount: 2, suggestedCount: [2, 4] },
        ),
        list(
          "offer_stack.stack.bonuses",
          "Bonuses",
          "Bonus",
          [
            { key: "name", editor: {"label": "Bonus Title", "placeholder": "Bonus name", "coach": {"label": "Bonus {n} — Name", "helper": "A punchy name for this bonus."}}, label: "Name", kind: "text", helper: "Short, value-driven bonus name" },
            { key: "description", editor: {"label": "Description", "placeholder": "Short description…", "coach": {"label": "Bonus {n} — Description", "helper": "What is this bonus and why is it valuable?"}}, label: "Description", kind: "textarea", helper: "Why this bonus accelerates or simplifies the result" },
            { key: "perceived_value", editor: {"label": "Perceived Value", "placeholder": "Perceived value (e.g. €497 value)", "coach": {"label": "Bonus {n} — Perceived Value", "helper": "The stated dollar value of this bonus (e.g. €497 value)."}}, label: "Perceived Value", kind: "text", helper: "Concrete value signal, e.g. €500 value or saves 10 hours" },
          ],
          { editor: {"title": "Bonuses", "description": "Additional incentives that tip the decision in your favor.", "addLabel": "Add Bonus", "emptyText": "No bonuses yet. Add 1–3 high-value bonuses to anchor perceived value.", "itemFallbackTitle": "Bonus {n}", "coach": {"id": "stack_bonuses", "label": "Bonuses", "helper": "High-value bonuses that tip the buying decision."}, "coachItemFields": [{"key": "name", "label": "Name", "kind": "text", "helper": "Punchy bonus name."}, {"key": "description", "label": "Description", "kind": "textarea", "helper": "What it is and why it's valuable."}, {"key": "perceived_value", "label": "Perceived Value", "kind": "text", "helper": "Stated dollar value (e.g. €497 value)."}]}, aiIndexedCount: 2, suggestedCount: [2, 4], editorItemFields: [DELIVERY_TYPES_ITEM] },
        ),
        list(
          "offer_stack.stack.milestones",
          "Delivery Milestones",
          "Milestone",
          [
            { key: "phase_name", editor: {"label": "Phase Name", "placeholder": "Phase name (e.g. Awareness)", "coach": {"label": "Milestone {n} — Phase Name", "helper": "Short, evocative name for this phase."}}, label: "Phase Name", kind: "text", helper: "Short phase or milestone name" },
            { key: "description", editor: {"label": "Description", "placeholder": "Description", "coach": {"label": "Milestone {n} — Description", "helper": "What happens during this phase?"}}, label: "Description", kind: "textarea", helper: "What happens in this phase" },
            { key: "expected_outcome", editor: {"label": "Expected Outcome", "placeholder": "Expected outcome", "coach": {"label": "Milestone {n} — Expected Outcome", "helper": "The concrete result the client walks away with after this phase."}}, label: "Expected Outcome", kind: "textarea", helper: "What the client can expect to achieve by the end of this phase" },
          ],
          { editor: {"title": "Milestones", "description": "The step-by-step journey through your offer.", "addLabel": "Add Milestone", "emptyText": "Map out the phases your clients move through. Most great programs have 3–5.", "itemFallbackTitle": "Milestone {n}", "coach": {"id": "stack_milestones", "label": "Milestones", "helper": "The phases clients move through in your offer."}, "coachItemFields": [{"key": "phase_name", "label": "Phase Name", "kind": "text", "helper": "Short, evocative phase name."}, {"key": "description", "label": "Description", "kind": "textarea", "helper": "What happens in this phase."}, {"key": "expected_outcome", "label": "Expected Outcome", "kind": "textarea", "helper": "Concrete result after this phase."}]}, aiIndexedCount: 3, suggestedCount: [3, 5] },
        ),
      ],
      fields: [
        f("offer_stack.stack.delivery_timeline", "Delivery Timeline", "text", {
          editor: {"label":"Delivery Timeline","helper":"Over what timeframe is the value delivered?"},
          helper: "Use one of: 7_days, 30_days, 60_days, 90_days, 6_months, 12_months, custom",
          aliases: ["delivery timeline", "program timeline", "delivery timeframe", "doorlooptijd"],
          valueType: "enum", enumValues: TIMEFRAME_VALUES, control: "timeframe",
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
      appliesToTiers: ["core"],
      // Editor-only for now: hidden from Coach prompts / write-backs (temporary).
      editorFields: [
        ef("offer_stack.pricing.recurring_enabled", "Recurring Offer Enabled", "text", { valueType: "boolean", control: "toggle" }),
        ef("offer_stack.pricing.recurring_offer.name", "Recurring Offer — Name", "text"),
        ef("offer_stack.pricing.recurring_offer.monthly_price", "Recurring Offer — Price", "text", { valueType: "number", control: "currency-amount" }),
        ef("offer_stack.pricing.recurring_offer.description", "Recurring Offer — Description", "textarea"),
        ef("offer_stack.pricing.recurring_offer.ongoing_value", "Recurring Offer — Ongoing Value", "textarea"),
        ef("offer_stack.pricing.recurring_offer.delivery_types", "Recurring Offer — Delivery Types", "text", { valueType: "string[]", control: "delivery-types" }),
        ef("offer_stack.pricing.recurring_offer.interval", "Recurring Offer — Billing Interval", "text", { valueType: "enum", enumValues: BILLING_INTERVAL_VALUES, control: "billing-interval" }),
        ef("offer_stack.pricing.premium_enabled", "Premium Upgrade Enabled", "text", { valueType: "boolean", control: "toggle" }),
        ef("offer_stack.pricing.premium_upgrade.name", "Premium Upgrade — Name", "text"),
        ef("offer_stack.pricing.premium_upgrade.price", "Premium Upgrade — Price", "text", { valueType: "number", control: "currency-amount" }),
        ef("offer_stack.pricing.premium_upgrade.description", "Premium Upgrade — Description", "textarea"),
        ef("offer_stack.pricing.premium_upgrade.additional_value", "Premium Upgrade — Additional Value", "textarea"),
        ef("offer_stack.pricing.cancellation_terms", "Cancellation Terms", "textarea", {
          editor: { helper: "How and when members can cancel.", placeholder: "e.g. Cancel anytime before the next billing date" },
        }),
      ],
      lists: [
        list(
          "offer_stack.pricing.payment_plans",
          "Payment Plans",
          "Payment Plan",
          [
            { key: "type", label: "Type", kind: "text", helper: "One of: full_pay | split_2 | split_3 | split_6 | monthly | custom", valueType: "enum", enumValues: PAYMENT_PLAN_TYPE_VALUES, control: "payment-plan-type",
              editor: { options: PAYMENT_PLAN_EDITOR_OPTIONS } },
            { key: "custom_label", label: "Label", kind: "text", helper: "Short plan name, e.g. 'Pay in Full', '3-Pay'",
              editor: { placeholder: "Plan label", coach: { label: "Payment Plan {n} — Label", helper: "Short, clear label for this custom plan." } } },
            { key: "amount", label: "Amount", kind: "text", helper: "Numeric amount for this plan in workspace currency, e.g. 997. Numbers only.", valueType: "number", control: "currency-amount",
              editor: { placeholder: "Amount" } },
            { key: "duration", label: "Duration", kind: "text", helper: "How long the plan runs, e.g. '3 months', '12 weeks'",
              editor: { placeholder: "Duration (e.g. 3 months)", coach: { label: "Payment Plan {n} — Duration", helper: "How long does the plan run?" } } },
          ],
          {
            aiIndexedCount: 3, suggestedCount: [2, 3],
            editor: {
              title: "Payment Plans",
              description: "Lower the upfront barrier with flexible options.",
              addLabel: "Add Payment Plan",
              emptyText: "No plans yet. Most offers convert better with at least 2 options (e.g. Full Pay + 3-Pay).",
              coach: {
                id: "pricing_payment_plans",
                label: "Payment Plans",
                helper: "Flexible payment options that lower the upfront barrier. Propose concrete plans WITH a numeric amount in {cur} for every plan — never leave the amount blank.",
              },
              coachItemFields: [
                { key: "type", label: "Plan Type", kind: "text", helper: "One of: full_pay | split_2 | split_3 | split_6 | monthly | custom." },
                { key: "custom_label", label: "Plan Label", kind: "text", helper: "Short plan name (e.g. 'Pay in Full', '3-Pay')." },
                { key: "amount", label: "Amount", kind: "text", helper: "Numeric amount in {cur}, e.g. 997. Numbers only, no currency symbol." },
                { key: "duration", label: "Duration", kind: "text", helper: "How long the plan runs (e.g. '3 months', '12 weeks')." },
              ],
            },
          },
        ),
      ],
      fields: [
        f("offer_stack.pricing.core_price", "Core Price", "text", {
          helper: "Numeric headline price for the main offer, e.g. 2500. Numbers only.",
          aliases: ["core price", "headline price", "main price", "kernprijs", "hoofdprijs"],
          valueType: "number", control: "currency-amount",
          editor: { label: "Core Price", helper: "The headline price for your main offer.", placeholder: "2500" },
        }),
        f("offer_stack.pricing.guarantee_type", "Guarantee Type", "text", {
          helper: "One of: none | refund | performance | milestone | custom",
          aliases: ["guarantee type", "type garantie", "risk reversal type"],
          valueType: "enum", enumValues: GUARANTEE_TYPE_VALUES, control: "guarantee-type",
          editor: { label: "Risk Reversal / Guarantee", helper: "How you remove the risk of saying yes.", options: GUARANTEE_EDITOR_OPTIONS },
        }),
        f("offer_stack.pricing.guarantee_custom", "Guarantee — Custom Label", "text", {
          helper: "Short label when guarantee_type = custom",
          aliases: ["guarantee custom label", "custom guarantee label"],
          countsTowardProgress: false,
        }),
        f("offer_stack.pricing.guarantee_details", "Guarantee Details / Terms", "textarea", {
          helper: "Concrete, buyer-friendly terms of the guarantee",
          aliases: ["guarantee details", "guarantee terms", "risk reversal details"],
          editor: {
            label: "Guarantee Details / Terms",
            placeholder: 'e.g. "Complete all modules and attend weekly calls. If you don\'t see measurable progress within 90 days, we continue coaching for free."',
            coach: { helper: "The concrete terms of the guarantee. Clear, specific, buyer-friendly." },
          },
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
      appliesToTiers: "all",
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

// =============================================================================
// OFFER EDITOR LOOKUPS (not used by Coach prompts, write-backs or progress)
// =============================================================================

/** Blueprint JSON column holding the Primary Core Offer design. */
export const OFFER_DESIGN_ROOT = "offer_stack";

/**
 * Strip the Blueprint storage root so a path becomes offer-relative
 * ("offer_stack.pricing.core_price" → "pricing.core_price"). The repository
 * maps relative paths to storage (blueprint vs offers.data.design).
 */
export function offerRelativePath(path: string): string {
  const prefix = `${OFFER_DESIGN_ROOT}.`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

/**
 * Summary fields every ecosystem offer row has (offers.name + offers.data.*).
 * Paths are relative to the offer row. Coach access to these still goes
 * through the existing offer_ecosystem.<tier>.new_<n>.<field> mechanism.
 */
export const OFFER_ITEM_FIELDS: RegistryField[] = [
  f("name", "Offer Name", "text", {
    helper: "Short, evocative name for this offer.", placeholder: "Offer name",
    aiWritable: true, countsTowardProgress: false,
  }),
  f("data.description", "Description", "textarea", {
    helper: "What this offer is in 1–2 sentences.", placeholder: "What this offer is in 1–2 sentences…",
    aiWritable: true, countsTowardProgress: false,
  }),
  f("data.core_outcome", "Core Outcome", "text", {
    helper: "What the buyer walks away with.", placeholder: "What the buyer walks away with",
    aiWritable: true, countsTowardProgress: false,
  }),
  f("data.price", "Price", "text", {
    valueType: "number", control: "currency-amount", aiWritable: false, countsTowardProgress: false,
  }),
  f("data.delivery_types", "Delivery Type", "text", {
    placeholder: "How is it delivered?", valueType: "string[]", control: "delivery-types",
    aiWritable: false, countsTowardProgress: false,
  }),
];

const appliesTo = (sb: RegistrySubBlock, tier: OfferTier) =>
  sb.appliesToTiers === "all" || (sb.appliesToTiers ?? []).includes(tier);

/**
 * Category-specific editor configuration. Today: Core gets the full
 * Angle / Stack / Pricing design; every tier gets the offer item fields.
 */
export function fieldsForTier(tier: OfferTier): {
  subBlocks: RegistrySubBlock[];
  itemFields: RegistryField[];
  /** Per-tier editor layout (tabs → sections → items). */
  layout: OfferTierLayout;
} {
  const offerTab = getRegistryTab("offer_design");
  const subBlocks = (offerTab?.subBlocks ?? []).filter(
    (sb) => sb.id !== "ecosystem" && appliesTo(sb, tier),
  );
  return { subBlocks, itemFields: OFFER_ITEM_FIELDS, layout: OFFER_TIER_LAYOUTS[tier] };
}

// -----------------------------------------------------------------------------
// Per-tier Offer Editor layouts (editor-only; never read by Coach prompts,
// write-back validation or Blueprint progress). Items reference existing
// definitions by path — no field metadata is duplicated here.
// Status is completion guidance only: only the offer name is required to save.
// -----------------------------------------------------------------------------

export type OfferFieldStatus = "min" | "recommended" | "optional";
export type OfferRelationshipType = "ascends_to" | "leads_into" | "retention" | "downsell";
export type OfferRelationshipDirection = "incoming" | "outgoing";

/**
 * Relationship types (stored in public.offer_relationships as source → target).
 * `outgoing` label = shown on the source offer; `incoming` = shown on the target.
 */
export const OFFER_RELATIONSHIP_TYPES: Record<OfferRelationshipType, { label: string; outgoing: string; incoming: string }> = {
  ascends_to: { label: "Ascension / next step", outgoing: "Ascends to", incoming: "Ascends from" },
  leads_into: { label: "Entry point", outgoing: "Leads into", incoming: "Fed by" },
  downsell: { label: "Downsell", outgoing: "Downsell to", incoming: "Downsell from" },
  retention: { label: "Retention / continuity", outgoing: "Continues into", incoming: "Retention for" },
};

/** One relationship slot of an offer's Ecosystem section. */
export interface OfferRelationshipSlot {
  relationship: OfferRelationshipType;
  direction: OfferRelationshipDirection;
  /** Display label for this slot (defaults to the type's direction label). */
  label: string;
  /** Category suggestion for picking the other offer — never a restriction. */
  suggestTiers?: OfferTier[];
}

const slot = (relationship: OfferRelationshipType, direction: OfferRelationshipDirection, suggestTiers?: OfferTier[], label?: string): OfferRelationshipSlot =>
  ({ relationship, direction, label: label ?? OFFER_RELATIONSHIP_TYPES[relationship][direction], ...(suggestTiers ? { suggestTiers } : {}) });

/**
 * Consolidated Ecosystem section per tier (UI not yet rendered). Existing
 * placeholders map here: Free "Leads into", Low/Mid "Ascends to", Mid
 * "Downsell from" (incoming), Premium "Upgrades from" (incoming ascends_to),
 * Continuity "Retention for" (incoming retention).
 */
export const OFFER_TIER_RELATIONSHIPS: Record<OfferTier, OfferRelationshipSlot[]> = {
  free: [slot("leads_into", "outgoing", ["low_ticket", "mid_ticket", "core"])],
  low_ticket: [slot("leads_into", "incoming", ["free"]), slot("ascends_to", "outgoing", ["mid_ticket", "core"]), slot("downsell", "incoming", ["mid_ticket", "core"])],
  mid_ticket: [slot("leads_into", "incoming", ["free"]), slot("ascends_to", "incoming", ["low_ticket"]), slot("ascends_to", "outgoing", ["core", "premium"]), slot("downsell", "incoming", ["core", "premium"])],
  core: [slot("leads_into", "incoming", ["free"]), slot("ascends_to", "incoming", ["low_ticket", "mid_ticket"]), slot("ascends_to", "outgoing", ["premium"], "Upgrades to"), slot("downsell", "outgoing", ["low_ticket", "mid_ticket"]), slot("retention", "outgoing", ["continuity"])],
  premium: [slot("ascends_to", "incoming", ["core"], "Upgrades from"), slot("retention", "outgoing", ["continuity"]), slot("downsell", "outgoing", ["core", "mid_ticket"])],
  continuity: [slot("retention", "incoming", ["core", "premium", "mid_ticket"])],
};

/** Editor tab that hosts the shared Ecosystem (relationships) section, placed after its last section. */
export const OFFER_TIER_ECOSYSTEM_TAB: Record<OfferTier, string> = {
  free: "offer", low_ticket: "offer", mid_ticket: "pricing", core: "pricing", premium: "pricing", continuity: "pricing",
};

export const OFFER_ECOSYSTEM_SECTION_COPY = {
  title: "Ecosystem",
  helper: "Link this offer to the other offers in your ecosystem, so the customer journey is clear.",
  incoming: "Offers leading here",
  incomingHelper: "Offers that send customers to this offer.",
  outgoing: "Where customers go next",
  outgoingHelper: "Offers this offer sends customers to.",
  cycleWarning: "This link makes the customer journey loop back to an offer that already leads here. That's allowed — just make sure it's intentional.",
} as const;

/** Category suggestions for a given type + direction on a tier (never a restriction). */
export function suggestedTiersFor(tier: OfferTier, relationship: OfferRelationshipType, direction: OfferRelationshipDirection): OfferTier[] {
  return (OFFER_TIER_RELATIONSHIPS[tier] ?? [])
    .filter((s) => s.relationship === relationship && s.direction === direction)
    .flatMap((s) => s.suggestTiers ?? []);
}

export function offerRelationshipSlots(tier: OfferTier): OfferRelationshipSlot[] {
  return OFFER_TIER_RELATIONSHIPS[tier] ?? [];
}

export type OfferLayoutItem =
  | { kind: "field"; path: string; status: OfferFieldStatus; editor?: OfferEditorCopy }
  | { kind: "list"; path: string; status: OfferFieldStatus; editor?: OfferListEditorCopy }
  | { kind: "relationship"; relationship: OfferRelationshipType; status: OfferFieldStatus; label: string; visibleWhen?: OfferVisibleWhen };

/** Show an item only when another design path equals a value (e.g. premium_mode = upgrade). */
export interface OfferVisibleWhen { path: string; equals: string }

export interface OfferLayoutSection { id: string; label: string; items: OfferLayoutItem[] }
export interface OfferLayoutTab { id: string; label: string; sections: OfferLayoutSection[] }
export interface OfferTierLayout { tier: OfferTier; tabs: OfferLayoutTab[] }

const fld = (path: string, status: OfferFieldStatus, editor?: OfferEditorCopy): OfferLayoutItem =>
  ({ kind: "field", path: `offer_stack.${path}`, status, ...(editor ? { editor } : {}) });
const lst = (path: string, status: OfferFieldStatus, editor?: OfferListEditorCopy): OfferLayoutItem =>
  ({ kind: "list", path: `offer_stack.${path}`, status, ...(editor ? { editor } : {}) });
const rel = (relationship: OfferRelationshipType, label: string, visibleWhen?: OfferVisibleWhen): OfferLayoutItem =>
  ({ kind: "relationship", relationship, status: "optional", label, ...(visibleWhen ? { visibleWhen } : {}) });
const sec = (id: string, label: string, items: OfferLayoutItem[]): OfferLayoutSection => ({ id, label, items });
/** Offer-level delivery types in the design; synced into the row summary. */
const DELIVERY = (status: OfferFieldStatus): OfferLayoutItem => fld("stack.delivery_types", status);
const NAME: OfferLayoutItem = fld("angle.main_offer_name", "min", {
  label: "Offer Name", helper: "Short, evocative name for this offer.", placeholder: "Offer name",
});
const SHORT_DESC = (s: OfferFieldStatus) => fld("angle.short_description", s, {
  label: "Short Description", helper: "What this offer is in 1–2 sentences.",
});
const FRAMEWORK = (s: OfferFieldStatus) => [fld("angle.framework.name", s), fld("angle.framework.description", s), lst("angle.framework.pillars", s)];
const ANGLES = (s: OfferFieldStatus) => [
  fld("angle.angle_new_vehicle", s), fld("angle.angle_better_results", s),
  fld("angle.angle_faster_outcome", s), fld("angle.angle_easier_process", s),
];

/** Core layout mirrors the existing sub-blocks exactly (all fields + lists, same order). */
function coreLayout(): OfferTierLayout {
  const tab = BLUEPRINT_REGISTRY.find((t) => t.id === "offer_design");
  const tabs = (tab?.subBlocks ?? [])
    .filter((sb) => sb.id !== "ecosystem")
    .map((sb) => ({
      id: sb.id,
      label: sb.label,
      sections: [sec(sb.id, sb.label, [
        ...sb.fields.map((f): OfferLayoutItem => ({
          kind: "field", path: f.path,
          status: f.path === "offer_stack.angle.main_offer_name" ? "min" : f.countsTowardProgress ? "recommended" : "optional",
        })),
        ...sb.lists.map((l): OfferLayoutItem => ({ kind: "list", path: l.basePath, status: l.countsTowardProgress ? "recommended" : "optional" })),
      ])],
    }));
  return { tier: "core", tabs };
}

const STANDARD_TABS = { angle: "Offer Angle", stack: "Offer Stack", pricing: "Pricing" } as const;

export const OFFER_TIER_LAYOUTS: Record<OfferTier, OfferTierLayout> = {
  free: {
    tier: "free",
    tabs: [{ id: "offer", label: "Offer", sections: [
      sec("basics", "Basics", [NAME, fld("angle.offer_format", "recommended"), SHORT_DESC("recommended")]),
      sec("value", "Value", [fld("angle.problem_solved", "recommended"), fld("angle.quick_win", "recommended"), fld("angle.core_outcome", "optional")]),
      sec("included", "What's included", [lst("stack.deliverables", "optional"), DELIVERY("recommended")]),
      sec("next_step", "Next step", [fld("angle.next_step_cta", "optional")]),
      sec("ecosystem", "Ecosystem", [rel("leads_into", "Leads into")]),
    ] }],
  },
  low_ticket: {
    tier: "low_ticket",
    tabs: [{ id: "offer", label: "Offer", sections: [
      sec("basics", "Basics", [NAME, SHORT_DESC("recommended")]),
      sec("value", "Value", [
        fld("angle.problem_solved", "recommended"), fld("angle.quick_win", "recommended"),
        fld("angle.core_outcome", "recommended"), ...FRAMEWORK("optional"),
      ]),
      sec("included", "What's included", [lst("stack.deliverables", "recommended"), lst("stack.bonuses", "optional"), DELIVERY("recommended")]),
      sec("price", "Price", [fld("pricing.core_price", "min", { label: "Price", helper: "What buyers pay for this offer." }), fld("pricing.guarantee_type", "optional"), fld("pricing.guarantee_details", "optional")]),
      sec("ecosystem", "Ecosystem", [rel("ascends_to", "Ascends to")]),
    ] }],
  },
  mid_ticket: {
    tier: "mid_ticket",
    tabs: [
      { id: "angle", label: STANDARD_TABS.angle, sections: [
        sec("basics", "Basics", [NAME, SHORT_DESC("recommended"), fld("angle.core_outcome", "recommended"), fld("angle.problem_solved", "recommended")]),
        sec("framework", "Signature Framework", FRAMEWORK("optional")),
        sec("angles", "Differentiation", ANGLES("optional")),
      ] },
      { id: "stack", label: STANDARD_TABS.stack, sections: [
        sec("deliverables", "Deliverables", [lst("stack.deliverables", "recommended")]),
        sec("extras", "Resources, support & bonuses", [lst("stack.resources", "optional"), lst("stack.support_channels", "optional"), lst("stack.bonuses", "optional")]),
        sec("timeline", "Milestones & timeline", [lst("stack.milestones", "optional"), fld("stack.delivery_timeline", "optional")]),
      ] },
      { id: "pricing", label: STANDARD_TABS.pricing, sections: [
        sec("price", "Price", [fld("pricing.core_price", "min", { label: "Price", helper: "What buyers pay for this offer." }), lst("pricing.payment_plans", "optional")]),
        sec("guarantee", "Guarantee", [fld("pricing.guarantee_type", "optional"), fld("pricing.guarantee_details", "optional")]),
        sec("ecosystem", "Ecosystem", [rel("ascends_to", "Ascends to"), rel("downsell", "Downsell from")]),
      ] },
    ],
  },
  core: coreLayout(),
  premium: {
    tier: "premium",
    tabs: [
      { id: "angle", label: STANDARD_TABS.angle, sections: [
        sec("type", "Premium type", [fld("angle.premium_mode", "recommended"), rel("ascends_to", "Upgrades from", { path: "offer_stack.angle.premium_mode", equals: "upgrade" })]),
        sec("basics", "Basics", [NAME, SHORT_DESC("recommended"), fld("angle.core_outcome", "recommended")]),
        sec("framework", "Signature Framework", FRAMEWORK("optional")),
        sec("angles", "Differentiation", ANGLES("optional")),
      ] },
      { id: "stack", label: STANDARD_TABS.stack, sections: [
        sec("touch", "High-touch delivery", [fld("stack.touch_level", "recommended")]),
        sec("deliverables", "Deliverables & support", [lst("stack.deliverables", "recommended"), lst("stack.support_channels", "recommended")]),
        sec("extras", "Additional value", [lst("stack.bonuses", "optional"), lst("stack.resources", "optional"), lst("stack.milestones", "optional"), fld("stack.delivery_timeline", "optional")]),
      ] },
      { id: "pricing", label: STANDARD_TABS.pricing, sections: [
        sec("price", "Price", [fld("pricing.core_price", "min", { label: "Price", helper: "What buyers pay for this offer." }), lst("pricing.payment_plans", "optional")]),
        sec("guarantee", "Guarantee", [fld("pricing.guarantee_type", "optional"), fld("pricing.guarantee_details", "optional")]),
        sec("ecosystem", "Ecosystem", [rel("retention", "Continues into")]),
      ] },
    ],
  },
  continuity: {
    tier: "continuity",
    tabs: [
      { id: "angle", label: STANDARD_TABS.angle, sections: [
        sec("basics", "Basics", [NAME, SHORT_DESC("recommended"), fld("pricing.recurring_offer.ongoing_value", "recommended", { label: "Ongoing Value", helper: "Why members stay, month after month." }), fld("angle.core_outcome", "optional")]),
      ] },
      { id: "delivery", label: "Delivery & Value", sections: [
        sec("recurring", "Recurring deliverables", [lst("stack.deliverables", "recommended"), DELIVERY("recommended")]),
        sec("support", "Support & resources", [lst("stack.support_channels", "optional"), lst("stack.resources", "optional")]),
      ] },
      { id: "pricing", label: STANDARD_TABS.pricing, sections: [
        sec("billing", "Billing", [
          fld("pricing.recurring_offer.monthly_price", "min", { label: "Recurring Price", helper: "Price per billing period — e.g. €129 with Quarterly means €129 per quarter.", placeholder: "49" }),
          fld("pricing.recurring_offer.interval", "recommended", { label: "Billing Interval", helper: "How often members are billed the recurring price." }),
          fld("pricing.cancellation_terms", "recommended"),
        ]),
        sec("guarantee", "Guarantee", [fld("pricing.guarantee_type", "optional"), fld("pricing.guarantee_details", "optional")]),
        sec("ecosystem", "Ecosystem", [rel("retention", "Retention for")]),
      ] },
    ],
  },
};

/** Layout items of a tier in deterministic order (tab → section → item). */
export function offerLayoutItems(tier: OfferTier): OfferLayoutItem[] {
  return OFFER_TIER_LAYOUTS[tier].tabs.flatMap((t) => t.sections.flatMap((s) => s.items));
}

/** Completion status of a field/list path for a tier (undefined = not in that tier). */
export function offerFieldStatus(tier: OfferTier, path: string): OfferFieldStatus | undefined {
  const item = offerLayoutItems(tier).find((i) => i.kind !== "relationship" && i.path === path);
  return item?.status;
}

/** Tier-specific editor copy override for a path, if any. */
export function offerTierEditorOverride(tier: OfferTier, path: string): OfferEditorCopy | undefined {
  const item = offerLayoutItems(tier).find((i) => i.kind === "field" && i.path === path);
  return item && item.kind === "field" ? item.editor : undefined;
}

/** Every Offer Design field definition, including editor-only ones. */
export function offerDesignFieldsForEditor(): RegistryField[] {
  const offerTab = getRegistryTab("offer_design");
  return (offerTab?.subBlocks ?? []).flatMap((sb) => [...sb.fields, ...(sb.editorFields ?? [])]);
}

/**
 * Editor lookup: Coach-visible fields, editor-only Offer Design fields and
 * offer row item fields. Use for editors only — never for Coach validation.
 */
export function getOfferEditorFieldByPath(path: string): RegistryField | undefined {
  return BLUEPRINT_FIELD_BY_PATH[path]
    ?? offerDesignFieldsForEditor().find((f) => f.path === path)
    ?? OFFER_ITEM_FIELDS.find((f) => f.path === path);
}

/** Tab structure for a tier (tabs → sections → items). */
export function offerTabsForTier(tier: OfferTier): OfferLayoutTab[] {
  return OFFER_TIER_LAYOUTS[tier].tabs;
}

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

// -----------------------------------------------------------------------------
// Tier-aware AI permissions + coaching briefs (Universal Offer Coach, Phase 1).
// Additive metadata: NEVER read by the shared Coach prompt builders, so Core
// prompts and Core write permissions are unchanged (snapshot-guarded).
// Evaluated by `offerAiPolicy.ts`.
// -----------------------------------------------------------------------------

/** Approved delivery-type values (mirrors the editor library; drift-tested). */
export const DELIVERY_TYPE_VALUES: string[] = ["Templates", "Ebooks", "Scripts", "Checklists", "Guides", "Swipe Files", "Vaults", "Calculators", "Calendars", "Workbooks", "Frameworks", "SOPs", "Resource Lists", "Blueprints", "Roadmaps", "Playbooks", "Transformations", "VSL", "Customer Results", "Webinars", "BTS", "Project Walkthroughs", "Breakdowns", "Reports", "Deep Dives", "Documentary", "Masterclasses", "Trainings", "Workshops", "Tutorials", "Events", "Video Courses", "Summits", "Cohorts", "Bootcamps", "Guest Experts", "Private Community", "Challenges", "Gamified Assignments", "Awards", "Certifications", "Accountability Groups", "VIP Groups", "Masterminds", "Progress Tracking", "Meetups", "Interviews", "Onboarding Calls", "Kickoff Calls", "1:1 Coaching Calls", "Consulting Calls", "Implementation Calls", "Q&A Calls", "Walkthrough Calls", "Mastermind Calls", "Group Calls", "Feedback Calls", "Intensives"];

export interface OfferTierAiPolicy {
  /**
   * "registry": Core — writable exactly when the Coach-visible registry field
   * or list is aiWritable (existing behaviour). "layout": every field/list in
   * the tier's editor layout is AI-readable and writable unless denied.
   */
  mode: "registry" | "layout";
  /** Offer-design paths (offer_stack.*) the Coach may read but never write. */
  readOnly: string[];
  /** Path prefixes the Coach may never write for this tier. */
  denyPrefixes: string[];
}

export const OFFER_TIER_AI_POLICY: Record<OfferTier, OfferTierAiPolicy> = {
  core: { mode: "registry", readOnly: [], denyPrefixes: [] },
  // Free offers never carry a price: every pricing path is locked.
  free: { mode: "layout", readOnly: [], denyPrefixes: ["offer_stack.pricing."] },
  low_ticket: { mode: "layout", readOnly: [], denyPrefixes: [] },
  mid_ticket: { mode: "layout", readOnly: [], denyPrefixes: [] },
  premium: { mode: "layout", readOnly: [], denyPrefixes: [] },
  continuity: { mode: "layout", readOnly: [], denyPrefixes: [] },
};

/** Price paths (number, non-negative, never written as a placeholder 0 on paid tiers). */
export const OFFER_PRICE_PATHS: string[] = [
  "offer_stack.pricing.core_price",
  "offer_stack.pricing.recurring_offer.monthly_price",
  "offer_stack.pricing.premium_upgrade.price",
];

export interface OfferCoachBrief { purpose: string; priorities: string[]; pitfalls: string[] }

/** Short per-category coaching briefs (Core keeps the existing prompt). */
export const OFFER_TIER_COACH_BRIEFS: Record<Exclude<OfferTier, "core">, OfferCoachBrief> = {
  free: {
    purpose: "A free offer / lead magnet earns attention and trust and moves the right people to the next step.",
    priorities: ["One specific problem for one specific audience", "A quick win they can feel within minutes", "A format that fits the problem", "A clear next-step CTA into a paid offer"],
    pitfalls: ["Trying to solve everything", "Giving away the full method", "No bridge to the next offer", "Suggesting a price — free offers are always free"],
  },
  low_ticket: {
    purpose: "A low-ticket offer turns leads into buyers quickly and pays for acquisition.",
    priorities: ["A concrete problem and a fast, tangible result", "A small, focused set of deliverables", "An easy-yes price", "A natural ascension into a bigger offer"],
    pitfalls: ["Too much content for the price", "Vague outcomes", "Pricing it like a core program", "No reason to ascend"],
  },
  mid_ticket: {
    purpose: "A mid-ticket offer delivers a meaningful result between the entry offer and the core program.",
    priorities: ["A clear outcome and a simple framework", "Deliverables and support that match the price", "A price and payment plans that bridge low and core", "Positioning that differs from the core offer"],
    pitfalls: ["Duplicating the core offer", "Unclear differentiation", "Price that cannibalizes the core offer"],
  },
  premium: {
    purpose: "A premium offer gives the best-fit buyers more access, speed or done-for-you support at a high price.",
    priorities: ["Standalone vs upgrade of a Core Offer", "The high-touch level (1:1, done-with-you, done-for-you, VIP day, priority access)", "Exclusive value beyond the core offer", "A price that reflects access and outcome"],
    pitfalls: ["Just 'more content'", "Unclear extra value over the core offer", "Underpricing high-touch delivery"],
  },
  continuity: {
    purpose: "A continuity offer keeps members getting ongoing value so they stay and keep paying.",
    priorities: ["Ongoing value — why members stay", "Recurring deliverables and support", "A recurring price per billing interval (monthly, quarterly or yearly)", "Clear, fair cancellation terms"],
    pitfalls: ["One-off value with a recurring price", "Confusing the price with a different interval", "Hidden or unclear cancellation terms"],
  },
};
