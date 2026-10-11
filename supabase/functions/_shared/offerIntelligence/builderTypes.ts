// =============================================================================
// Builder-only concepts that have no Offer Design field yet. They live in a
// Builder session (Phase 5D) and are never silently dropped. Fields marked
// "candidate for Offer Design" may become registry fields after approval.
// =============================================================================

import type { CriterionAssessment, ValueProfile } from "./valueEquation.ts";

/** Session-only. */
export interface ValueAssessmentRecord { assessments: CriterionAssessment[]; profile: ValueProfile; assessedAt: string }

/** Candidate for Offer Design. */
export interface ProblemObstacleSolution { problem: string; obstacle: string; solution: string; deliverableRef?: string }

/** Candidate for Offer Design. */
export interface PricingRationale { reasoning: string; assumptions: string[]; indicativeRange?: { low: number; high: number } | null; isEstimate: true }

/** Session-only. */
export interface ValidationAssumption { statement: string; why: string; howToValidate: string }

/** Candidate for Offer Design (per-offer audience override). */
export interface AudienceDifference { differsFromBlueprint: boolean; audience: string; reason: string }

/** Candidate for Offer Design. */
export interface CompetitivePositioning { statement: string; alternatives: string[]; isUserVerified: boolean }

/** Session-only (bonus itself maps to stack.bonuses). */
export interface BonusRationale { bonusName: string; reason: string; addressesObstacle?: string }

export interface BuilderExtras {
  problemObstacleSolutions: ProblemObstacleSolution[];
  pricingRationale: PricingRationale | null;
  assumptions: ValidationAssumption[];
  audience: AudienceDifference | null;
  positioning: CompetitivePositioning | null;
  bonusRationales: BonusRationale[];
}

export const emptyBuilderExtras = (): BuilderExtras => ({
  problemObstacleSolutions: [], pricingRationale: null, assumptions: [], audience: null, positioning: null, bonusRationales: [],
});

/** Where each concept belongs (documentation + test anchor). */
export const BUILDER_EXTRA_STORAGE: Record<keyof BuilderExtras | "valueAssessment", "session" | "offer_design_candidate"> = {
  valueAssessment: "session",
  problemObstacleSolutions: "offer_design_candidate",
  pricingRationale: "offer_design_candidate",
  assumptions: "session",
  audience: "offer_design_candidate",
  positioning: "offer_design_candidate",
  bonusRationales: "session",
};
