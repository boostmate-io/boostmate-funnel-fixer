// Growth Roadmap — 16-question catalog
// See plan: Q2 is outcome-delivery consistency (replaces prior confidence Q),
// Q14 is scalability of delivery. Q3 (testimonials) and Q6 (lead sources)
// are contextual/non-scored. i18n keys are used at render time.

import type { ScoreValue } from "./types";

export type StageKey =
  | "validate"
  | "attract"
  | "optimize"
  | "scale"
  | "systemize";

export type QuestionKind = "scored" | "yes_no" | "multi_select";

export interface QuestionOption {
  value: string;      // stringified ScoreValue for scored, or free string for contextual
  labelKey: string;   // i18n key
}

export interface GrowthQuestion {
  id: string;                    // q1..q16
  stage: StageKey;
  kind: QuestionKind;
  critical: boolean;             // gate-critical (score must be >= 67 to pass gate)
  contextual: boolean;           // excluded from stage average
  labelKey: string;              // i18n key for the question text
  helperKey?: string;            // optional short helper
  options: QuestionOption[];
}

const scoredOptions = (base: string): QuestionOption[] => [
  { value: "0",   labelKey: `${base}.opt0` },
  { value: "33",  labelKey: `${base}.opt33` },
  { value: "67",  labelKey: `${base}.opt67` },
  { value: "100", labelKey: `${base}.opt100` },
];

export const QUESTIONS: GrowthQuestion[] = [
  // ===== Validate =====
  {
    id: "q1", stage: "validate", kind: "scored", critical: true, contextual: false,
    labelKey: "growth.q.q1.label",
    options: scoredOptions("growth.q.q1"),
  },
  {
    id: "q2", stage: "validate", kind: "scored", critical: true, contextual: false,
    labelKey: "growth.q.q2.label",
    options: scoredOptions("growth.q.q2"),
  },
  {
    id: "q3", stage: "validate", kind: "yes_no", critical: false, contextual: true,
    labelKey: "growth.q.q3.label",
    options: [
      { value: "yes", labelKey: "growth.q.q3.yes" },
      { value: "no",  labelKey: "growth.q.q3.no"  },
    ],
  },
  {
    id: "q4", stage: "validate", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q4.label",
    options: scoredOptions("growth.q.q4"),
  },

  // ===== Attract =====
  {
    id: "q5", stage: "attract", kind: "scored", critical: true, contextual: false,
    labelKey: "growth.q.q5.label",
    options: scoredOptions("growth.q.q5"),
  },
  {
    id: "q6", stage: "attract", kind: "multi_select", critical: false, contextual: true,
    labelKey: "growth.q.q6.label",
    options: [
      { value: "referrals",    labelKey: "growth.q.q6.referrals" },
      { value: "organic_social", labelKey: "growth.q.q6.organic_social" },
      { value: "paid_ads",     labelKey: "growth.q.q6.paid_ads" },
      { value: "seo",          labelKey: "growth.q.q6.seo" },
      { value: "outreach",     labelKey: "growth.q.q6.outreach" },
      { value: "partnerships", labelKey: "growth.q.q6.partnerships" },
      { value: "email",        labelKey: "growth.q.q6.email" },
      { value: "content",      labelKey: "growth.q.q6.content" },
      { value: "none",         labelKey: "growth.q.q6.none" },
    ],
  },
  {
    id: "q7", stage: "attract", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q7.label",
    options: scoredOptions("growth.q.q7"),
  },
  {
    id: "q8", stage: "attract", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q8.label",
    options: scoredOptions("growth.q.q8"),
  },

  // ===== Optimize =====
  {
    id: "q9", stage: "optimize", kind: "scored", critical: true, contextual: false,
    labelKey: "growth.q.q9.label",
    options: scoredOptions("growth.q.q9"),
  },
  {
    id: "q10", stage: "optimize", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q10.label",
    options: scoredOptions("growth.q.q10"),
  },
  {
    id: "q11", stage: "optimize", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q11.label",
    options: scoredOptions("growth.q.q11"),
  },

  // ===== Scale =====
  {
    id: "q12", stage: "scale", kind: "scored", critical: true, contextual: false,
    labelKey: "growth.q.q12.label",
    options: scoredOptions("growth.q.q12"),
  },
  {
    id: "q13", stage: "scale", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q13.label",
    options: scoredOptions("growth.q.q13"),
  },
  {
    id: "q14", stage: "scale", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q14.label",
    options: scoredOptions("growth.q.q14"),
  },

  // ===== Systemize =====
  {
    id: "q15", stage: "systemize", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q15.label",
    options: scoredOptions("growth.q.q15"),
  },
  {
    id: "q16", stage: "systemize", kind: "scored", critical: false, contextual: false,
    labelKey: "growth.q.q16.label",
    options: scoredOptions("growth.q.q16"),
  },
];

export const QUESTIONS_BY_STAGE: Record<StageKey, GrowthQuestion[]> = {
  validate:  QUESTIONS.filter(q => q.stage === "validate"),
  attract:   QUESTIONS.filter(q => q.stage === "attract"),
  optimize:  QUESTIONS.filter(q => q.stage === "optimize"),
  scale:     QUESTIONS.filter(q => q.stage === "scale"),
  systemize: QUESTIONS.filter(q => q.stage === "systemize"),
};

export const isScoreValue = (v: unknown): v is ScoreValue =>
  v === 0 || v === 33 || v === 67 || v === 100;
