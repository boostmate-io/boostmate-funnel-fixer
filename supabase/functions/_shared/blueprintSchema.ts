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
   * Set to false for fields that should never be written by batch AI proposals.
   * Structured builders can expose safe sub-fields here when apply logic supports them.
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

const indexedFields = (
  basePath: string,
  itemLabel: string,
  count: number,
  specs: Array<{
    key: string;
    label: string;
    kind: BlueprintFieldKind;
    aliases: string[];
    helper?: string;
  }>,
): BlueprintFieldDef[] =>
  Array.from({ length: count }, (_, index) =>
    specs.map((spec) =>
      field(
        `${basePath}.${index}.${spec.key}`,
        `${itemLabel} ${index + 1} — ${spec.label}`,
        spec.kind,
        [
          `${itemLabel.toLowerCase()} ${index + 1} ${spec.label.toLowerCase()}`,
          `${index + 1} ${itemLabel.toLowerCase()} ${spec.label.toLowerCase()}`,
          ...spec.aliases,
        ],
        { helper: spec.helper },
      ),
    ),
  ).flat();

const OFFER_STACK_FIELDS: BlueprintFieldDef[] = [
  ...indexedFields("offer_stack.stack.deliverables", "Deliverable", 3, [
    {
      key: "name",
      label: "Name",
      kind: "text",
      aliases: ["core deliverable name", "deliverable name", "main service component"],
      helper: "Short, benefit-driven name for a core deliverable",
    },
    {
      key: "description",
      label: "Description",
      kind: "textarea",
      aliases: ["core deliverable description", "deliverable description"],
      helper: "1-2 sentences describing what the client receives and how it works",
    },
    {
      key: "frequency",
      label: "Frequency",
      kind: "text",
      aliases: ["deliverable frequency", "delivery frequency", "cadence"],
      helper: "One of: one_time | daily | weekly | biweekly | monthly | quarterly | ongoing",
    },
  ]),

  ...indexedFields("offer_stack.stack.resources", "Resource", 3, [
    {
      key: "name",
      label: "Name",
      kind: "text",
      aliases: ["resource name", "template name", "templates resources name"],
      helper: "Clear name for a template, guide, checklist, swipe file or resource",
    },
    {
      key: "resource_type",
      label: "Type",
      kind: "text",
      aliases: ["resource type", "template type", "resources type"],
      helper: "Template, guide, checklist, swipe file, workbook, calculator, etc.",
    },
    {
      key: "description",
      label: "Description",
      kind: "textarea",
      aliases: ["resource description", "template description", "templates resources description"],
      helper: "What is inside the resource and how the client uses it",
    },
  ]),
  ...indexedFields("offer_stack.stack.support_channels", "Support Channel", 2, [
    {
      key: "name",
      label: "Name",
      kind: "text",
      aliases: ["support channel name", "support system name"],
      helper: "Name of the support channel or access point",
    },
    {
      key: "description",
      label: "Description",
      kind: "textarea",
      aliases: ["support channel description", "support system description"],
      helper: "What support the client gets and when to use it",
    },
    {
      key: "frequency",
      label: "Frequency",
      kind: "text",
      aliases: ["support frequency", "support cadence"],
      helper: "How often this support is available",
    },
  ]),
  ...indexedFields("offer_stack.stack.bonuses", "Bonus", 2, [
    {
      key: "name",
      label: "Name",
      kind: "text",
      aliases: ["bonus name"],
      helper: "Short, value-driven bonus name",
    },
    {
      key: "description",
      label: "Description",
      kind: "textarea",
      aliases: ["bonus description"],
      helper: "Why this bonus accelerates or simplifies the result",
    },
    {
      key: "perceived_value",
      label: "Perceived Value",
      kind: "text",
      aliases: ["bonus perceived value", "perceived value"],
      helper: "Concrete value signal, e.g. €500 value or saves 10 hours",
    },
  ]),
  field(
    "offer_stack.stack.delivery_timeline",
    "Delivery Timeline",
    "text",
    ["delivery timeline", "program timeline", "delivery timeframe", "doorlooptijd"],
    { helper: "Use one of: 7_days, 30_days, 60_days, 90_days, 6_months, 12_months, custom" },
  ),
  field(
    "offer_stack.stack.delivery_timeline_custom",
    "Delivery Timeline — Custom Label",
    "text",
    ["delivery timeline custom", "custom delivery timeline", "custom timeline"],
    { helper: "Short custom label when delivery_timeline = custom" },
  ),

  ...indexedFields("offer_stack.stack.milestones", "Milestone", 3, [
    {
      key: "phase_name",
      label: "Phase Name",
      kind: "text",
      aliases: ["milestone phase name", "phase name", "milestone name"],
      helper: "Short phase or milestone name",
    },
    {
      key: "description",
      label: "Description",
      kind: "textarea",
      aliases: ["milestone description", "phase description"],
      helper: "What happens in this phase",
    },
    {
      key: "expected_outcome",
      label: "Expected Outcome",
      kind: "textarea",
      aliases: ["milestone expected outcome", "phase outcome", "expected outcome"],
      helper: "What the client can expect to achieve by the end of this phase",
    },
  ]),
];

// ---------- Pricing ---------------------------------------------------------
const PRICING_FIELDS: BlueprintFieldDef[] = [
  field(
    "offer_stack.pricing.core_price",
    "Core Price",
    "text",
    ["core price", "headline price", "main price", "kernprijs", "hoofdprijs"],
    { helper: "Numeric headline price for the main offer, e.g. 2500. Numbers only." },
  ),
  ...indexedFields("offer_stack.pricing.payment_plans", "Payment Plan", 3, [
    {
      key: "type",
      label: "Type",
      kind: "text",
      aliases: ["payment plan type", "plan type"],
      helper: "One of: full_pay | split_2 | split_3 | split_6 | monthly | custom",
    },
    {
      key: "custom_label",
      label: "Label",
      kind: "text",
      aliases: ["payment plan label", "plan label", "plan name"],
      helper: "Short plan name, e.g. 'Pay in Full', '3-Pay'",
    },
    {
      key: "amount",
      label: "Amount",
      kind: "text",
      aliases: [
        "payment plan amount",
        "plan amount",
        "plan price",
        "payment amount",
        "monetary value",
        "prijs",
        "bedrag",
      ],
      helper: "Numeric amount for this plan in workspace currency, e.g. 997. Numbers only.",
    },
    {
      key: "duration",
      label: "Duration",
      kind: "text",
      aliases: ["payment plan duration", "plan duration"],
      helper: "How long the plan runs, e.g. '3 months', '12 weeks'",
    },
  ]),
  field(
    "offer_stack.pricing.premium_enabled",
    "Premium Upgrade — Enabled",
    "text",
    ["premium enabled", "premium upgrade enabled", "premium aan"],
    { helper: "Boolean: true when a premium upgrade tier exists. Use 'true' or 'false'." },
  ),
  field(
    "offer_stack.pricing.premium_upgrade.name",
    "Premium Upgrade — Name",
    "text",
    ["premium upgrade name", "premium tier name", "vip name"],
    { helper: "Short, aspirational name for the premium tier" },
  ),
  field(
    "offer_stack.pricing.premium_upgrade.price",
    "Premium Upgrade — Price",
    "text",
    ["premium upgrade price", "premium price", "vip price"],
    { helper: "Numeric price for the premium tier, e.g. 7500. Numbers only." },
  ),
  field(
    "offer_stack.pricing.premium_upgrade.description",
    "Premium Upgrade — Description",
    "textarea",
    ["premium upgrade description", "premium tier description"],
    { helper: "What is included in the premium tier, 1-2 sentences" },
  ),
  field(
    "offer_stack.pricing.premium_upgrade.additional_value",
    "Premium Upgrade — Additional Value",
    "textarea",
    ["premium upgrade additional value", "additional value", "extra outcome"],
    { helper: "What additional outcome this unlocks beyond the core offer" },
  ),
  field(
    "offer_stack.pricing.recurring_enabled",
    "Recurring Offer — Enabled",
    "text",
    ["recurring enabled", "recurring aan", "membership enabled"],
    { helper: "Boolean: true when the offer has a recurring/continuity tier. Use 'true' or 'false'." },
  ),
  field(
    "offer_stack.pricing.recurring_offer.name",
    "Recurring Offer — Name",
    "text",
    ["recurring offer name", "recurring name", "membership name"],
    { helper: "Short, memorable name for the recurring offer" },
  ),
  field(
    "offer_stack.pricing.recurring_offer.monthly_price",
    "Recurring Offer — Monthly Price",
    "text",
    ["recurring monthly price", "membership price", "monthly price", "maandprijs"],
    { helper: "Numeric price per interval, e.g. 97. Numbers only." },
  ),
  field(
    "offer_stack.pricing.recurring_offer.interval",
    "Recurring Offer — Interval",
    "text",
    ["recurring interval", "billing interval", "membership interval"],
    { helper: "One of: monthly | quarterly | yearly" },
  ),
  field(
    "offer_stack.pricing.recurring_offer.description",
    "Recurring Offer — Description",
    "textarea",
    ["recurring offer description", "membership description"],
    { helper: "What the recurring offer is, 1-2 sentences" },
  ),
  field(
    "offer_stack.pricing.recurring_offer.ongoing_value",
    "Recurring Offer — Ongoing Value",
    "textarea",
    ["recurring offer ongoing value", "ongoing value", "monthly value"],
    { helper: "What value is delivered every month" },
  ),
  field(
    "offer_stack.pricing.guarantee_type",
    "Guarantee Type",
    "text",
    ["guarantee type", "type garantie", "risk reversal type"],
    { helper: "One of: none | refund | performance | milestone | custom" },
  ),
  field(
    "offer_stack.pricing.guarantee_custom",
    "Guarantee — Custom Label",
    "text",
    ["guarantee custom label", "custom guarantee label"],
    { helper: "Short label when guarantee_type = custom" },
  ),
  field(
    "offer_stack.pricing.guarantee_details",
    "Guarantee Details / Terms",
    "textarea",
    ["guarantee details", "guarantee terms", "risk reversal details"],
    { helper: "Concrete, buyer-friendly terms of the guarantee" },
  ),
];


// ---------- Growth System ---------------------------------------------------
const GROWTH_SYSTEM_FIELDS: BlueprintFieldDef[] = [
  field(
    "growth_system.acquisition.lead_capture_method",
    "Lead Capture Method",
    "text",
    ["lead capture method", "lead capture", "capture method"],
    { helper: "Primary way leads enter the ecosystem, e.g. Landing Page, Webinar Registration, Quiz" },
  ),
  field(
    "growth_system.ascension.referral_description",
    "Referral Description",
    "textarea",
    ["referral description", "referral program description", "how referrals work"],
    { helper: "How the referral program works, 1-2 sentences" },
  ),
  field(
    "growth_system.ascension.reactivation_description",
    "Reactivation Description",
    "textarea",
    ["reactivation description", "winback description", "how reactivation works"],
    { helper: "How reactivation of past clients works, 1-2 sentences" },
  ),
];

// ---------- Proof & Authority -----------------------------------------------
const PROOF_AUTHORITY_FIELDS: BlueprintFieldDef[] = [
  field(
    "proof_authority.authority.trust_reason",
    "Why Clients Trust You",
    "textarea",
    ["trust reason", "why clients trust you", "why they trust you"],
    { helper: "The core reason clients trust you, 1-2 sentences" },
  ),
  field(
    "proof_authority.authority.signature_proof",
    "Signature Proof",
    "textarea",
    ["signature proof", "flagship proof", "hero proof"],
    { helper: "The single strongest proof point you lead with" },
  ),
  ...indexedFields("proof_authority.authority.founder_stories", "Founder Story", 2, [
    { key: "title", label: "Title", kind: "text", aliases: ["founder story title"], helper: "Short story title" },
    { key: "before", label: "Before", kind: "textarea", aliases: ["founder story before"], helper: "Where the founder was before" },
    { key: "challenge", label: "Challenge", kind: "textarea", aliases: ["founder story challenge"], helper: "The core challenge or turning point" },
    { key: "breakthrough", label: "Breakthrough", kind: "textarea", aliases: ["founder story breakthrough"], helper: "The breakthrough moment" },
    { key: "after", label: "After", kind: "textarea", aliases: ["founder story after"], helper: "Where the founder is now" },
    { key: "core_lesson", label: "Core Lesson", kind: "textarea", aliases: ["founder story core lesson"], helper: "The core lesson for the reader" },
  ]),
  ...indexedFields("proof_authority.social_proof.metrics", "Credibility Metric", 3, [
    { key: "metric", label: "Metric", kind: "text", aliases: ["credibility metric name"], helper: "What is being measured, e.g. 'Clients served'" },
    { key: "value", label: "Value", kind: "text", aliases: ["credibility metric value"], helper: "The number or figure" },
    { key: "context", label: "Context", kind: "text", aliases: ["credibility metric context"], helper: "Short context sentence" },
  ]),
  ...indexedFields("proof_authority.social_proof.client_results", "Client Result", 3, [
    { key: "client_type", label: "Client Type", kind: "text", aliases: ["client result type"], helper: "Type of client this result is from" },
    { key: "problem", label: "Problem", kind: "textarea", aliases: ["client result problem"], helper: "The problem they had" },
    { key: "result_achieved", label: "Result Achieved", kind: "textarea", aliases: ["client result achieved"], helper: "The concrete result" },
    { key: "timeframe", label: "Timeframe", kind: "text", aliases: ["client result timeframe"], helper: "In what timeframe" },
    { key: "explanation", label: "Explanation", kind: "textarea", aliases: ["client result explanation"], helper: "Why it worked" },
  ]),
  ...indexedFields("proof_authority.social_proof.testimonials", "Testimonial", 3, [
    { key: "client_name", label: "Client Name", kind: "text", aliases: ["testimonial name"], helper: "Client's name (first name is fine)" },
    { key: "client_type", label: "Client Type", kind: "text", aliases: ["testimonial client type"], helper: "Type of client (industry / role)" },
    { key: "quote", label: "Quote", kind: "textarea", aliases: ["testimonial quote"], helper: "The testimonial quote in the client's voice" },
    { key: "main_outcome", label: "Main Outcome", kind: "text", aliases: ["testimonial main outcome"], helper: "The main outcome achieved" },
  ]),
  ...indexedFields("proof_authority.social_proof.authority_assets", "Authority Asset", 2, [
    { key: "name", label: "Name", kind: "text", aliases: ["authority asset name"], helper: "Name of the asset (feature, award, podcast, etc.)" },
    { key: "description", label: "Description", kind: "textarea", aliases: ["authority asset description"], helper: "Short description of the asset" },
    { key: "why_it_matters", label: "Why It Matters", kind: "textarea", aliases: ["authority asset why it matters"], helper: "Why it establishes authority" },
  ]),
  ...indexedFields("proof_authority.objections.objections", "Objection", 3, [
    { key: "objection", label: "Objection", kind: "textarea", aliases: ["objection text"], helper: "The objection in the buyer's voice" },
    { key: "why_believed", label: "Why Believed", kind: "textarea", aliases: ["objection why believed"], helper: "Why the buyer believes this" },
    { key: "reframe", label: "Reframe", kind: "textarea", aliases: ["objection reframe"], helper: "How to reframe the belief" },
    { key: "supporting_proof", label: "Supporting Proof", kind: "textarea", aliases: ["objection supporting proof"], helper: "Concrete proof that backs the reframe" },
  ]),
  ...indexedFields("proof_authority.objections.failed_solutions", "Failed Solution", 3, [
    { key: "what_tried", label: "What They Tried", kind: "textarea", aliases: ["failed solution what tried"], helper: "What buyers previously tried" },
    { key: "why_failed", label: "Why It Failed", kind: "textarea", aliases: ["failed solution why failed"], helper: "Why it failed for them" },
    { key: "why_different", label: "Why This Is Different", kind: "textarea", aliases: ["failed solution why different"], helper: "Why our approach is different" },
  ]),
  ...indexedFields("proof_authority.objections.faqs", "FAQ", 4, [
    { key: "question", label: "Question", kind: "text", aliases: ["faq question"], helper: "The FAQ question" },
    { key: "answer", label: "Answer", kind: "textarea", aliases: ["faq answer"], helper: "The FAQ answer, direct and buyer-friendly" },
  ]),
  ...indexedFields("proof_authority.educational.lessons", "Value Lesson", 3, [
    { key: "title", label: "Title", kind: "text", aliases: ["lesson title"], helper: "Short lesson title" },
    { key: "main_topic", label: "Main Topic", kind: "text", aliases: ["lesson main topic"], helper: "The main topic covered" },
    { key: "common_challenge", label: "Common Challenge", kind: "textarea", aliases: ["lesson common challenge"], helper: "The common challenge addressed" },
    { key: "core_insight", label: "Core Insight", kind: "textarea", aliases: ["lesson core insight"], helper: "The core insight of the lesson" },
    { key: "why_matters", label: "Why It Matters", kind: "textarea", aliases: ["lesson why matters"], helper: "Why the lesson matters" },
  ]),
  ...indexedFields("proof_authority.educational.mistakes", "Common Mistake", 3, [
    { key: "mistake", label: "Mistake", kind: "textarea", aliases: ["mistake text"], helper: "Common mistake buyers make" },
    { key: "why_made", label: "Why It's Made", kind: "textarea", aliases: ["mistake why made"], helper: "Why the mistake is made" },
    { key: "better_approach", label: "Better Approach", kind: "textarea", aliases: ["mistake better approach"], helper: "The better approach" },
  ]),
  ...indexedFields("proof_authority.educational.belief_shifts", "Belief Shift", 3, [
    { key: "old_belief", label: "Old Belief", kind: "textarea", aliases: ["belief shift old"], helper: "The limiting belief" },
    { key: "new_belief", label: "New Belief", kind: "textarea", aliases: ["belief shift new"], helper: "The empowering new belief" },
    { key: "why_matters", label: "Why It Matters", kind: "textarea", aliases: ["belief shift why matters"], helper: "Why the shift matters" },
  ]),
];

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
  field(
    "offer_stack.angle.framework.name",
    "Framework / Method Name",
    "text",
    ["framework method name", "method name", "framework naam", "methode naam"],
    { helper: "Memorable name for the signature method, 2-5 words" },
  ),
  field(
    "offer_stack.angle.framework.description",
    "Framework — Brief Description",
    "text",
    ["framework description", "brief description", "framework beschrijving", "methode beschrijving"],
    { helper: "One line describing what makes the framework unique and why it works" },
  ),
  field(
    "offer_stack.angle.framework.pillars.0.name",
    "Pillar 1 — Name",
    "text",
    ["pillar 1 name", "first pillar", "eerste pijler"],
    { helper: "Short name for pillar 1 of the signature framework" },
  ),
  field(
    "offer_stack.angle.framework.pillars.0.description",
    "Pillar 1 — Description",
    "textarea",
    ["pillar 1 description", "first pillar description", "eerste pijler beschrijving"],
    { helper: "What happens in pillar 1, 1-2 sentences" },
  ),
  field(
    "offer_stack.angle.framework.pillars.1.name",
    "Pillar 2 — Name",
    "text",
    ["pillar 2 name", "second pillar", "tweede pijler"],
    { helper: "Short name for pillar 2 of the signature framework" },
  ),
  field(
    "offer_stack.angle.framework.pillars.1.description",
    "Pillar 2 — Description",
    "textarea",
    ["pillar 2 description", "second pillar description", "tweede pijler beschrijving"],
    { helper: "What happens in pillar 2, 1-2 sentences" },
  ),
  field(
    "offer_stack.angle.framework.pillars.2.name",
    "Pillar 3 — Name",
    "text",
    ["pillar 3 name", "third pillar", "derde pijler"],
    { helper: "Short name for pillar 3 of the signature framework" },
  ),
  field(
    "offer_stack.angle.framework.pillars.2.description",
    "Pillar 3 — Description",
    "textarea",
    ["pillar 3 description", "third pillar description", "derde pijler beschrijving"],
    { helper: "What happens in pillar 3, 1-2 sentences" },
  ),
  field(
    "offer_stack.angle.core_promise.desired_outcome",
    "Desired Outcome (Core Promise)",
    "text",
    ["desired outcome", "promise outcome", "gewenste uitkomst"],
    { helper: "Specific transformation the client walks away with" },
  ),
  field(
    "offer_stack.angle.core_promise.timeframe",
    "Timeframe (Core Promise)",
    "text",
    ["promise timeframe", "timeframe", "termijn", "tijdspanne"],
    { helper: "Use one of: 7_days, 30_days, 60_days, 90_days, 6_months, 12_months, custom" },
  ),
  field(
    "offer_stack.angle.core_promise.timeframe_custom",
    "Timeframe — Custom Label",
    "text",
    ["timeframe custom", "custom timeframe", "custom termijn"],
    { helper: "Short custom label when timeframe = custom" },
  ),

  field(
    "offer_stack.angle.core_promise.guarantee",
    "Guarantee / Risk Reversal",
    "text",
    ["guarantee", "risk reversal", "garantie", "risico omkering"],
    { helper: "Optional risk reversal promise, one sentence" },
  ),
  ...OFFER_STACK_FIELDS,
  ...PRICING_FIELDS,
  ...GROWTH_SYSTEM_FIELDS,
  ...PROOF_AUTHORITY_FIELDS,
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
      "offer_stack.angle.framework.name",
      "offer_stack.angle.framework.description",
      "offer_stack.angle.framework.pillars.0.name",
      "offer_stack.angle.framework.pillars.0.description",
      "offer_stack.angle.framework.pillars.1.name",
      "offer_stack.angle.framework.pillars.1.description",
      "offer_stack.angle.framework.pillars.2.name",
      "offer_stack.angle.framework.pillars.2.description",
      "offer_stack.angle.core_promise.desired_outcome",
      "offer_stack.angle.core_promise.timeframe",
      "offer_stack.angle.core_promise.timeframe_custom",
      "offer_stack.angle.core_promise.guarantee",
    ],
  },
  {
    id: "signature_framework",
    tabId: "offer_design",
    label: "Signature Mechanism / Framework",
    aliases: [
      "signature mechanism",
      "signature framework",
      "mechanism framework",
      "framework",
      "method framework",
      "methode",
      "pijlers",
    ],
    fieldPaths: [
      "offer_stack.angle.framework.name",
      "offer_stack.angle.framework.description",
      "offer_stack.angle.framework.pillars.0.name",
      "offer_stack.angle.framework.pillars.0.description",
      "offer_stack.angle.framework.pillars.1.name",
      "offer_stack.angle.framework.pillars.1.description",
      "offer_stack.angle.framework.pillars.2.name",
      "offer_stack.angle.framework.pillars.2.description",
    ],
  },
  {
    id: "offer_stack",
    tabId: "offer_design",
    label: "Offer Stack",
    aliases: [
      "offer stack",
      "offer stack tab",
      "stack tab",
      "tab offer stack",
      "volledige offer stack",
      "full offer stack",
      "core deliverables",
      "templates resources",
      "templates & resources",
      "support system",
      "bonuses",
      "delivery timeline",
      "milestones",
    ],
    fieldPaths: OFFER_STACK_FIELDS.map((f) => f.path),
  },
  {
    id: "core_transformation_promise",
    tabId: "offer_design",
    label: "Core Transformation Promise",
    aliases: [
      "core transformation promise",
      "transformation promise",
      "core promise",
      "promise builder",
      "belofte",
      "transformatiebelofte",
    ],
    fieldPaths: [
      "offer_stack.angle.core_promise.desired_outcome",
      "offer_stack.angle.core_promise.timeframe",
      "offer_stack.angle.core_promise.timeframe_custom",
      "offer_stack.angle.core_promise.guarantee",
    ],
  },
  {
    id: "pricing",
    tabId: "offer_design",
    label: "Pricing",
    aliases: ["pricing", "pricing tab", "prijzen", "prijstab"],
    fieldPaths: PRICING_FIELDS.map((f) => f.path),
  },
  {
    id: "growth_system",
    tabId: "growth_system",
    label: "Growth System",
    aliases: ["growth system", "growth", "acquisition ascension", "groeisysteem"],
    fieldPaths: GROWTH_SYSTEM_FIELDS.map((f) => f.path),
  },
  {
    id: "proof_authority",
    tabId: "proof_authority",
    label: "Proof & Authority",
    aliases: ["proof authority", "proof & authority", "proof and authority", "bewijs autoriteit"],
    fieldPaths: PROOF_AUTHORITY_FIELDS.map((f) => f.path),
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
NOTE: Only the paths listed above can be written by the Coach. Some structured
builders expose safe writable sub-fields in this list (for example framework
pillars, core_promise and offer stack cards). Other structured areas that are
NOT listed (pricing plans, proof items, growth mappings, …) must never be
invented or written to.

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
