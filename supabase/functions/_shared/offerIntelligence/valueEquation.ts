// =============================================================================
// Value Equation assessment — fixed criteria, AI supplies per-criterion
// verdicts, code computes scores. Strategic assessment only: never a
// conversion or revenue prediction. Pure (vitest + Deno).
// =============================================================================

export type ValueDimension = "dream_outcome" | "perceived_likelihood" | "speed_to_value" | "ease_of_achievement";
export const VALUE_DIMENSIONS: ValueDimension[] = ["dream_outcome", "perceived_likelihood", "speed_to_value", "ease_of_achievement"];

export const DIMENSION_LABELS: Record<ValueDimension, string> = {
  dream_outcome: "Dream Outcome",
  perceived_likelihood: "Perceived Likelihood",
  speed_to_value: "Speed to Value",
  ease_of_achievement: "Ease of Achievement",
};

export interface ValueCriterion { id: string; dimension: ValueDimension; label: string; question: string }

const c = (dimension: ValueDimension, id: string, label: string, question: string): ValueCriterion => ({ id, dimension, label, question });

/** Fixed rubric. Changing it changes every score — treat as versioned. */
export const VALUE_RUBRIC_VERSION = 1;
export const VALUE_CRITERIA: ValueCriterion[] = [
  c("dream_outcome", "do_specific", "Specific result", "Is the promised result concrete and specific (ideally measurable)?"),
  c("dream_outcome", "do_relevant", "Matters to the audience", "Is it a result this audience strongly wants or urgently needs?"),
  c("dream_outcome", "do_status", "Emotional / status gain", "Is the emotional, status or life change clear?"),
  c("dream_outcome", "do_realistic", "Realistic scope", "Is the outcome credible for this scope and delivery?"),
  c("perceived_likelihood", "pl_method", "Named method", "Is there a clear method/framework explaining how the result is reached?"),
  c("perceived_likelihood", "pl_proof", "Real proof", "Is there user-provided proof (results, credentials, experience)? Never assume proof."),
  c("perceived_likelihood", "pl_fit", "Fits the buyer", "Does the approach fit the buyer's situation and past failures?"),
  c("perceived_likelihood", "pl_risk", "Risk reversal", "Is there a guarantee or other genuine risk reduction?"),
  c("speed_to_value", "sv_first_win", "Fast first win", "Does the customer get a meaningful first win early?"),
  c("speed_to_value", "sv_milestones", "Clear milestones", "Are there milestones that show progress along the way?"),
  c("speed_to_value", "sv_timeline", "Clear timeline", "Is the time to the main result clear and reasonable?"),
  c("ease_of_achievement", "ea_support", "Support level", "Is the support / done-for-you level appropriate for the buyer?"),
  c("ease_of_achievement", "ea_steps", "Low customer effort", "Are the steps and effort for the customer minimised?"),
  c("ease_of_achievement", "ea_obstacles", "Obstacles removed", "Are the main obstacles explicitly addressed?"),
  c("ease_of_achievement", "ea_tools", "Tools and resources", "Are templates, tools or resources provided to reduce effort?"),
];

/** strong = 2, partial = 1, weak = 0, unknown = not counted. */
export type CriterionVerdict = "strong" | "partial" | "weak" | "unknown";
export const VERDICT_POINTS: Record<Exclude<CriterionVerdict, "unknown">, number> = { strong: 2, partial: 1, weak: 0 };

export interface CriterionAssessment { criterionId: string; verdict: CriterionVerdict; reasoning: string }

export interface DimensionScore {
  dimension: ValueDimension;
  /** 0–10, or null when not assessed. */
  score: number | null;
  status: "assessed" | "not_assessed";
  assessedCount: number;
  totalCount: number;
  strengths: CriterionAssessment[];
  weaknesses: CriterionAssessment[];
  unknown: CriterionAssessment[];
}

export interface ValueProfile {
  rubricVersion: number;
  dimensions: Record<ValueDimension, DimensionScore>;
  /** Weakest assessed dimension (lowest score), if any. */
  weakest: ValueDimension | null;
}

/** Minimum share of a dimension's criteria that must be assessed to score it. */
export const MIN_ASSESSED_SHARE = 0.5;

/**
 * Deterministic scoring. Missing/unknown criteria never lower a score; a
 * dimension with too few assessed criteria is "not_assessed" (score null).
 * Unknown criterion IDs and invalid verdicts are rejected by the caller's
 * output validation before reaching here; here they are ignored.
 */
export function scoreValueProfile(assessments: CriterionAssessment[]): ValueProfile {
  const byId = new Map<string, CriterionAssessment>();
  for (const a of assessments ?? []) {
    if (VALUE_CRITERIA.some((k) => k.id === a?.criterionId) && a.verdict in { strong: 1, partial: 1, weak: 1, unknown: 1 }) byId.set(a.criterionId, a);
  }
  const dimensions = {} as Record<ValueDimension, DimensionScore>;
  for (const d of VALUE_DIMENSIONS) {
    const crit = VALUE_CRITERIA.filter((k) => k.dimension === d);
    const list = crit.map((k) => byId.get(k.id) ?? { criterionId: k.id, verdict: "unknown" as const, reasoning: "" });
    const assessed = list.filter((a) => a.verdict !== "unknown");
    const enough = crit.length > 0 && assessed.length / crit.length >= MIN_ASSESSED_SHARE;
    const points = assessed.reduce((n, a) => n + VERDICT_POINTS[a.verdict as Exclude<CriterionVerdict, "unknown">], 0);
    dimensions[d] = {
      dimension: d,
      score: enough ? Math.round((points / (assessed.length * 2)) * 100) / 10 : null,
      status: enough ? "assessed" : "not_assessed",
      assessedCount: assessed.length,
      totalCount: crit.length,
      strengths: list.filter((a) => a.verdict === "strong"),
      weaknesses: list.filter((a) => a.verdict === "weak" || a.verdict === "partial"),
      unknown: list.filter((a) => a.verdict === "unknown"),
    };
  }
  const scored = VALUE_DIMENSIONS.filter((d) => dimensions[d].score != null);
  const weakest = scored.length ? scored.reduce((a, b) => (dimensions[b].score! < dimensions[a].score! ? b : a)) : null;
  return { rubricVersion: VALUE_RUBRIC_VERSION, dimensions, weakest };
}

/** Per-dimension change between two profiles (null when either side is not assessed). */
export function compareProfiles(before: ValueProfile | null, after: ValueProfile | null) {
  return VALUE_DIMENSIONS.map((d) => {
    const b = before?.dimensions[d]?.score ?? null;
    const a = after?.dimensions[d]?.score ?? null;
    return { dimension: d, before: b, after: a, delta: a != null && b != null ? Math.round((a - b) * 10) / 10 : null };
  });
}

export const VALUE_PROFILE_DISCLAIMER = "Strategic assessment — not a prediction of sales, conversion or results.";
