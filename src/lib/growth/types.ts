// Growth Roadmap — shared types

export type GrowthStage =
  | "validate"
  | "attract"
  | "optimize"
  | "scale"
  | "systemize";

export type ScoreValue = 0 | 33 | 67 | 100;

/**
 * Answer map keyed by question id.
 * Scored questions store a ScoreValue. Contextual questions store their raw value.
 */
export interface AnswerMap {
  // Scored (0/33/67/100)
  q1?: ScoreValue;   // paying clients
  q2?: ScoreValue;   // outcome delivery consistency (NEW)
  q4?: ScoreValue;   // sales conversion consistency
  q5?: ScoreValue;   // lead generation consistency
  q7?: ScoreValue;   // lead capture/follow-up system
  q8?: ScoreValue;   // knowledge of lead → customer numbers
  q9?: ScoreValue;   // journey drop-off understanding
  q10?: ScoreValue;  // handling of leads that didn't buy
  q11?: ScoreValue;  // revenue-per-customer optimization
  q12?: ScoreValue;  // predictable acquisition via spend
  q13?: ScoreValue;  // knowledge of CAC/LTV/conversion economics
  q14?: ScoreValue;  // scalability of delivery (NEW)
  q15?: ScoreValue;  // founder dependency
  q16?: ScoreValue;  // systemization of processes

  // Contextual (non-scored)
  q3?: "yes" | "no";                 // testimonials
  q6?: string[];                     // lead sources (multi-select)
}

export interface GateResult {
  passed: boolean;
  avg: number;
  criticalOk: boolean;
  borderline: boolean;
}

export interface StageScores {
  validate: number;
  attract: number;
  optimize: number;
  scale: number;
  systemize: number;
}

export interface GateResults {
  validate: GateResult;
  attract: GateResult;
  optimize: GateResult;
  scale: GateResult;
  systemize: GateResult;
}

export interface EngineOutput {
  stageScores: StageScores;
  gateResults: GateResults;
  computedStage: GrowthStage;
}

export type RelatedModule =
  | "blueprint"
  | "offer-creator"
  | "funnels"
  | "copy"
  | "analytics"
  | "outreach"
  | "coach"
  | "assets"
  | "none";

export interface NextPriority {
  title: string;
  rationale: string;
  related_module?: RelatedModule;
}

export interface RecommendedGrowthSystem {
  id: string;
  rationale: string;
}

export interface AiResult {
  next_priorities: NextPriority[];
  recommended_growth_system?: RecommendedGrowthSystem;
  confidence?: "low" | "medium" | "high";
}

export interface GrowthAssessmentRow {
  id: string;
  user_id: string | null;
  sub_account_id: string | null;
  claim_token: string | null;
  source: "public" | "internal" | "auto";
  answers: AnswerMap;
  stage_scores: StageScores;
  gate_results: GateResults;
  computed_stage: GrowthStage;
  ai_result: AiResult | null;
  ai_confidence: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
