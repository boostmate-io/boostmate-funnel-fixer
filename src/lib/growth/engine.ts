// Growth Roadmap — deterministic scoring engine
// PURE FUNCTIONS. No I/O, no side effects. Same input → same output, always.

import { QUESTIONS_BY_STAGE, type StageKey } from "./questions";
import type {
  AnswerMap,
  EngineOutput,
  GateResult,
  GateResults,
  GrowthStage,
  ScoreValue,
  StageScores,
} from "./types";

const GATE_THRESHOLD = 67;
const CRITICAL_MIN = 67;
const BORDERLINE_WINDOW = 10;

const isScored = (v: unknown): v is ScoreValue =>
  v === 0 || v === 33 || v === 67 || v === 100;

/**
 * Compute one stage's gate result.
 * - `avg`: average of the stage's scored (non-contextual) questions
 * - `criticalOk`: every `critical` question is >= CRITICAL_MIN
 * - `passed`: avg >= GATE_THRESHOLD AND criticalOk
 * - `borderline`: |avg - GATE_THRESHOLD| <= BORDERLINE_WINDOW
 *
 * Unanswered scored questions are treated as 0 — the wizard forces answers,
 * but this makes the engine safe against partial payloads.
 */
function computeGate(stage: StageKey, answers: AnswerMap): GateResult {
  const questions = QUESTIONS_BY_STAGE[stage].filter(q => !q.contextual);
  if (questions.length === 0) {
    return { passed: true, avg: 100, criticalOk: true, borderline: false };
  }

  let sum = 0;
  let criticalOk = true;

  for (const q of questions) {
    const raw = (answers as Record<string, unknown>)[q.id];
    const score: number = isScored(raw) ? raw : 0;
    sum += score;
    if (q.critical && score < CRITICAL_MIN) criticalOk = false;
  }

  const avg = Math.round(sum / questions.length);
  const passed = avg >= GATE_THRESHOLD && criticalOk;
  const borderline = Math.abs(avg - GATE_THRESHOLD) <= BORDERLINE_WINDOW;

  return { passed, avg, criticalOk, borderline };
}

/**
 * Determine the current stage.
 * Rule: the FIRST stage whose gate is NOT passed is the current stage.
 * If every gate passes, the business is at Systemize (last stage).
 */
export function computeStage(gates: GateResults): GrowthStage {
  const order: GrowthStage[] = ["validate", "attract", "optimize", "scale", "systemize"];
  for (const s of order) {
    if (!gates[s].passed) return s;
  }
  return "systemize";
}

/**
 * Public entry: run the full engine on an AnswerMap.
 * Deterministic — no randomness, no clock reads.
 */
export function runEngine(answers: AnswerMap): EngineOutput {
  const gateResults: GateResults = {
    validate:  computeGate("validate", answers),
    attract:   computeGate("attract", answers),
    optimize:  computeGate("optimize", answers),
    scale:     computeGate("scale", answers),
    systemize: computeGate("systemize", answers),
  };

  const stageScores: StageScores = {
    validate:  gateResults.validate.avg,
    attract:   gateResults.attract.avg,
    optimize:  gateResults.optimize.avg,
    scale:     gateResults.scale.avg,
    systemize: gateResults.systemize.avg,
  };

  return {
    stageScores,
    gateResults,
    computedStage: computeStage(gateResults),
  };
}

// ============================================================
// Stage metadata (used by UI + AI prompt hydration)
// ============================================================

export interface StageMeta {
  key: GrowthStage;
  order: number;
  labelKey: string;
  bottleneckKey: string;
  objectiveKey: string;
  milestoneKey: string;
}

export const STAGE_META: Record<GrowthStage, StageMeta> = {
  validate: {
    key: "validate", order: 1,
    labelKey: "growth.stage.validate.label",
    bottleneckKey: "growth.stage.validate.bottleneck",
    objectiveKey:  "growth.stage.validate.objective",
    milestoneKey:  "growth.stage.validate.milestone",
  },
  attract: {
    key: "attract", order: 2,
    labelKey: "growth.stage.attract.label",
    bottleneckKey: "growth.stage.attract.bottleneck",
    objectiveKey:  "growth.stage.attract.objective",
    milestoneKey:  "growth.stage.attract.milestone",
  },
  optimize: {
    key: "optimize", order: 3,
    labelKey: "growth.stage.optimize.label",
    bottleneckKey: "growth.stage.optimize.bottleneck",
    objectiveKey:  "growth.stage.optimize.objective",
    milestoneKey:  "growth.stage.optimize.milestone",
  },
  scale: {
    key: "scale", order: 4,
    labelKey: "growth.stage.scale.label",
    bottleneckKey: "growth.stage.scale.bottleneck",
    objectiveKey:  "growth.stage.scale.objective",
    milestoneKey:  "growth.stage.scale.milestone",
  },
  systemize: {
    key: "systemize", order: 5,
    labelKey: "growth.stage.systemize.label",
    bottleneckKey: "growth.stage.systemize.bottleneck",
    objectiveKey:  "growth.stage.systemize.objective",
    milestoneKey:  "growth.stage.systemize.milestone",
  },
};

export const STAGE_ORDER: GrowthStage[] = [
  "validate", "attract", "optimize", "scale", "systemize",
];
