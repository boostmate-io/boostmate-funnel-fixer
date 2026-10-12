// =============================================================================
// Offer Intelligence operations — one small, task-specific instruction set
// and a strict output contract per operation. Shared rules (honesty, pricing,
// category briefs, field metadata) are composed from existing modules, never
// duplicated. Pure: no network, no auth, no workspace access.
// =============================================================================

import { renderTierCoachBrief } from "../offerContext.ts";
import { isOfferTier } from "../offerAiPolicy.ts";
import { OFFER_PRICE_PATHS } from "../blueprintRegistry.ts";
import type { OfferTier } from "../blueprintRegistry.ts";
import { VALUE_CRITERIA, VALUE_DIMENSIONS, type CriterionAssessment, type CriterionVerdict } from "./valueEquation.ts";
import { categoryWritableFields } from "./designMapping.ts";

export type OfferOperation = "understand" | "diagnose" | "strengthen" | "package" | "final_assessment" | "public_generate";
export const OFFER_OPERATIONS: OfferOperation[] = ["understand", "diagnose", "strengthen", "package", "final_assessment", "public_generate"];

/** Neutral context: authenticated callers pass Blueprint + design; public callers pass facts only. */
export interface OperationContext {
  source: "workspace" | "public";
  tier: OfferTier;
  facts?: Record<string, string>;
  blueprint?: Record<string, unknown> | null;
  design?: Record<string, unknown> | null;
  /** strengthen: the dimension to work on. */
  focusDimension?: string;
  /** Read-only summary of the workspace's other offers (authenticated only). */
  ecosystem?: string | null;
  /** "new" = assessing an idea, not a proven existing offer. */
  mode?: "new" | "existing";
}

const HONESTY = `Honesty (hard rules): never invent testimonials, results, case studies, revenue, conversion rates, competitor details, market prices or validation. Separate user-provided facts from assumptions; label assumptions. Prices you suggest are estimates, never market benchmarks. More deliverables do not equal more value.`;

const TASK: Record<OfferOperation, string> = {
  understand: "Identify what is KNOWN (stated by the user/Blueprint/offer), ASSUMED (reasonable inference — say why) and MISSING (needed for a strong offer) about: audience, core problem, desired transformation, current offer, delivery approach, positioning. Do not ask about anything already known.",
  diagnose: "Assess EACH Value Equation criterion below as strong | partial | weak | unknown with one short reason. Use unknown when the information isn't available — never mark missing information as weak. Then list strengths, weaknesses and the top 3 highest-impact improvements.",
  strengthen: "Using the diagnosis and confirmed facts, pick the 2–4 most important weaknesses (highest impact first: outcome specificity, differentiation, credibility/proof, speed to first result, delivery efficiency, customer effort, support/accountability, obstacles). For each: name the weakness, its Value Equation dimension, why it matters for THIS buyer, and 2–3 genuinely different strategic options — each with what changes, why it raises perceived value and the trade-off (cost, effort, delivery load, risk). Prefer clarity, speed, ease and certainty over adding deliverables; never propose bonuses, resources or services just to inflate perceived value. Never propose proof, results or guarantees the user cannot genuinely back.",
  package: "Turn the user's confirmed strategic decisions (they are authoritative; rejected areas stay as they are) into one coherent offer. Fill only fields that genuinely belong to this category — do not force every element; add bonuses only where they remove a specific obstacle, and a guarantee only where it is credible for this business. Pricing: a recommendation with its reasoning, clearly separating assumptions from validated information. Construct the offer as field writes for this category ONLY, using the exact paths and allowed values listed. Lists use <listPath>.new_<n>.<key>. Free offers never get a price; paid prices must be positive; Continuity prices are per the chosen billing interval. Also return builder extras (obstacle→solution mapping, pricing rationale, assumptions, audience difference, positioning, bonus reasons).",
  final_assessment: "Re-assess every Value Equation criterion for the proposed offer (strong | partial | weak | unknown, one short reason each) exactly as strictly as the diagnosis did. A proposed mechanism (e.g. a planned guarantee or milestone) is not proof that it works. The After score does not need to be higher than Before: in scoreChanges explain honestly which dimensions improved, which did not and why. Then summarise key decisions, remaining assumptions and next steps.",
  public_generate: "From the visitor's short answers only, construct ONE offer as field writes (Angle and Stack fields listed below — never pricing fields). Fill at least the offer name, short description, core outcome, framework name/description and 3–5 deliverables. Describe the target audience, the method in 2 sentences and the delivery approach. List key assumptions (anything not stated by the visitor). Pricing: set recommend=false unless the answers support it; if true, give a conservative low/high estimate with reasoning and assumptions — never a market benchmark. If selectedImprovements are provided, they are the visitor's authoritative decisions: build them into the offer; areas marked keep current approach stay as described. Assess each Value Equation criterion for the NEW offer independently and as strictly as any diagnosis — selecting an improvement is not proof it works, and scores may stay equal or drop. Return beforeAssessments as an empty list (the Before assessment is made separately). In scoreChanges explain in 2–4 plain sentences which dimensions changed versus the provided diagnosis and why. Give 1–2 strategic insights, exactly 3 further improvements and 2–4 practical next steps. No business data beyond the answers exists.",
};

function rubricText(): string {
  return VALUE_DIMENSIONS.map((d) => `${d}:\n${VALUE_CRITERIA.filter((c) => c.dimension === d).map((c) => `  - ${c.id}: ${c.question}`).join("\n")}`).join("\n");
}

function fieldContract(tier: OfferTier, excludePricing = false): string {
  return categoryWritableFields(tier).filter((f) => !excludePricing || !f.path.startsWith("offer_stack.pricing")).map((f) =>
    f.kind === "list"
      ? `- ${f.path}.new_<n>.{${f.itemKeys!.join(", ")}} (${f.label})${f.itemValues ? ` allowed: ${Object.entries(f.itemValues).map(([k, v]) => `${k} = ${v.join(" | ")}`).join("; ")}` : ""}`
      : `- ${f.path} (${f.label})${f.values ? ` allowed: ${f.values.join(", ")}` : ""}${OFFER_PRICE_PATHS.includes(f.path) ? " — value MUST be one plain positive number (e.g. \"997\"): no currency symbol, range, \"from\", \"estimate\" or other text. Put ranges and reasoning in extras.pricingRationale." : ""}`,
  ).join("\n");
}

/** Scoring discipline (rubric v2): applies to every assessing operation. */
export const SCORING_RULES = `# Scoring discipline (strict)
- "strong" requires specific supporting evidence in the provided information (concrete numbers, named mechanisms, user-stated proof). Clear or confident wording alone is never enough.
- Missing proof is never verified proof: without user-provided results, credentials or experience, pl_proof is weak (if the offer claims results) or unknown (if nothing is said) — never strong.
- Distinguish proposed delivery mechanisms (what the offer plans to do) from demonstrated effectiveness (what is shown to work). A planned feature can be at most "partial" for criteria about likelihood or proof.
- If the information to judge a criterion is absent, use "unknown" — do not guess either way.
- "strong" on every criterion of a dimension requires genuinely strong support for each; most real offers have several partial criteria.
- Assess what is written, not what the offer could become. Never adjust verdicts to make a before/after comparison look better.`;

const NEEDS_RUBRIC: OfferOperation[] = ["diagnose", "final_assessment", "public_generate"];
const NEEDS_FIELDS: OfferOperation[] = ["package", "public_generate"];

/** System instructions for one operation (small, composed). */
export function buildOperationInstructions(op: OfferOperation, ctx: OperationContext): string {
  if (!OFFER_OPERATIONS.includes(op)) throw new Error("unknown_operation");
  if (!isOfferTier(ctx.tier)) throw new Error("unknown_tier");
  if (op === "public_generate" && ctx.source !== "public") throw new Error("public_only_operation");
  if (ctx.source === "public" && ctx.blueprint) throw new Error("public_context_must_not_include_blueprint");
  return [
    "You are an experienced offer strategist applying the Value Equation (Dream Outcome, Perceived Likelihood, Speed to Value, Ease of Achievement).",
    `# Task: ${op}\n${TASK[op]}`,
    op === "strengthen" && ctx.focusDimension ? `Focus dimension: ${ctx.focusDimension}` : "",
    ctx.mode === "new" && (op === "diagnose" || op === "understand") ? "This is a NEW offer idea, not a proven existing offer. Assess the idea as described; never imply it has a track record." : "",
    HONESTY,
    ctx.tier !== "core" ? renderTierCoachBrief(ctx.tier) : "",
    NEEDS_RUBRIC.includes(op) ? `# Criteria\n${rubricText()}\n\n${SCORING_RULES}` : "",
    NEEDS_FIELDS.includes(op) ? `# Writable fields for this category\n${fieldContract(ctx.tier, op === "public_generate")}` : "",
  ].filter(Boolean).join("\n\n");
}

/** User message: the context data (kept separate from instructions). */
export function buildOperationInput(ctx: OperationContext): string {
  const parts: string[] = [];
  if (ctx.facts) parts.push(`# Provided answers\n${JSON.stringify(ctx.facts, null, 2)}`);
  if (ctx.source === "workspace" && ctx.blueprint) parts.push(`# Business Blueprint\n${JSON.stringify(ctx.blueprint, null, 2)}`);
  if (ctx.design) parts.push(`# Current offer design\n${JSON.stringify(ctx.design, null, 2)}`);
  if (ctx.source === "workspace" && ctx.ecosystem) parts.push(`# Other offers (read-only)\n${ctx.ecosystem}`);
  return parts.join("\n\n") || "(no information provided)";
}

// ---- Output contracts (strict JSON schema) + validators -------------------

const str = { type: "string" };
const strArr = { type: "array", items: str };
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const assessmentSchema = { type: "array", items: obj({ criterionId: { type: "string", enum: VALUE_CRITERIA.map((c) => c.id) }, verdict: { type: "string", enum: ["strong", "partial", "weak", "unknown"] }, reasoning: str }) };
const writesSchema = { type: "array", items: obj({ path: str, value: str }) };
const extrasSchema = obj({
  problemObstacleSolutions: { type: "array", items: obj({ problem: str, obstacle: str, solution: str }) },
  pricingRationale: { anyOf: [obj({ reasoning: str, assumptions: strArr }), { type: "null" }] },
  assumptions: { type: "array", items: obj({ statement: str, why: str, howToValidate: str }) },
  audience: { anyOf: [obj({ differsFromBlueprint: { type: "boolean" }, audience: str, reason: str }), { type: "null" }] },
  positioning: { anyOf: [obj({ statement: str, alternatives: strArr }), { type: "null" }] },
  bonusRationales: { type: "array", items: obj({ bonusName: str, reason: str }) },
});

export const OPERATION_OUTPUT_SCHEMAS: Record<OfferOperation, Record<string, unknown>> = {
  understand: obj({ known: strArr, assumed: { type: "array", items: obj({ item: str, why: str }) }, missing: { type: "array", items: obj({ item: str, question: str }) } }),
  diagnose: obj({ assessments: assessmentSchema, strengths: strArr, weaknesses: strArr, topImprovements: strArr }),
  strengthen: obj({ items: { type: "array", items: obj({ weakness: str, dimension: { type: "string", enum: [...VALUE_DIMENSIONS] }, whyItMatters: str, options: { type: "array", items: obj({ title: str, change: str, why: str, tradeoff: str }) } }) } }),
  package: obj({ writes: writesSchema, extras: extrasSchema }),
  final_assessment: obj({ assessments: assessmentSchema, scoreChanges: str, keyDecisions: strArr, remainingAssumptions: strArr, nextSteps: strArr }),
  public_generate: obj({
    writes: writesSchema, assessments: assessmentSchema, beforeAssessments: assessmentSchema,
    audience: str, methodSummary: str, deliveryApproach: str, assumptions: strArr,
    pricing: obj({ recommend: { type: "boolean" }, low: { type: "number" }, high: { type: "number" }, reasoning: str, assumptions: strArr }),
    insights: strArr, topImprovements: strArr, scoreChanges: str, nextSteps: strArr,
  }),
};

export type OutputCheck = { ok: true; value: any } | { ok: false; errors: string[] };

const isStr = (v: unknown) => typeof v === "string";
const isStrArr = (v: unknown) => Array.isArray(v) && v.every(isStr);

function checkAssessments(v: unknown, errors: string[]): CriterionAssessment[] {
  if (!Array.isArray(v)) { errors.push("assessments_not_array"); return []; }
  const seen = new Set<string>();
  const out: CriterionAssessment[] = [];
  for (const a of v) {
    if (!a || !VALUE_CRITERIA.some((c) => c.id === a.criterionId)) { errors.push(`unknown_criterion:${a?.criterionId}`); continue; }
    if (!["strong", "partial", "weak", "unknown"].includes(a.verdict)) { errors.push(`invalid_verdict:${a.criterionId}`); continue; }
    if (seen.has(a.criterionId)) { errors.push(`duplicate_criterion:${a.criterionId}`); continue; }
    seen.add(a.criterionId);
    out.push({ criterionId: a.criterionId, verdict: a.verdict as CriterionVerdict, reasoning: isStr(a.reasoning) ? a.reasoning.slice(0, 500) : "" });
  }
  return out;
}

/** Validate a model output against its operation contract. Never repairs silently. */
export function validateOperationOutput(op: OfferOperation, raw: unknown): OutputCheck {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["not_object"] };
  const r = raw as Record<string, any>;
  const need = (k: string, pred: (v: unknown) => boolean) => { if (!pred(r[k])) errors.push(`invalid:${k}`); };
  switch (op) {
    case "understand": need("known", isStrArr); need("assumed", Array.isArray); need("missing", Array.isArray); break;
    case "diagnose": checkAssessments(r.assessments, errors); need("strengths", isStrArr); need("weaknesses", isStrArr); need("topImprovements", isStrArr); break;
    case "strengthen": need("items", (v) => Array.isArray(v) && v.length > 0 && v.every((it: any) => isStr(it?.weakness) && Array.isArray(it?.options) && it.options.length > 0 && it.options.every((o: any) => isStr(o?.title) && isStr(o?.change)))); break;
    case "package": need("writes", (v) => Array.isArray(v) && v.every((w: any) => isStr(w?.path))); need("extras", (v) => !!v && typeof v === "object"); break;
    case "final_assessment": checkAssessments(r.assessments, errors); need("keyDecisions", isStrArr); need("nextSteps", isStrArr); need("remainingAssumptions", isStrArr); break;
    case "public_generate":
      need("writes", (v) => Array.isArray(v) && v.length > 0 && v.every((w: any) => isStr(w?.path)));
      checkAssessments(r.assessments, errors);
      if (r.beforeAssessments != null) checkAssessments(r.beforeAssessments, errors);
      need("audience", isStr); need("methodSummary", isStr); need("assumptions", isStrArr);
      need("insights", isStrArr); need("topImprovements", isStrArr);
      need("pricing", (v: any) => !!v && typeof v.recommend === "boolean");
      if (r.scoreChanges != null && !isStr(r.scoreChanges)) errors.push("invalid:scoreChanges");
      if (r.nextSteps != null && !isStrArr(r.nextSteps)) errors.push("invalid:nextSteps");
      break;
  }
  if (errors.length) return { ok: false, errors };
  if (r.assessments) r.assessments = checkAssessments(r.assessments, []);
  if (r.beforeAssessments) r.beforeAssessments = checkAssessments(r.beforeAssessments, []);
  return { ok: true, value: r };
}
