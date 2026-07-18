// Growth Roadmap V2 — task catalog + progress types + typed condition tree.

import type { GrowthStage, RelatedModule } from "./types";

export type TaskStage = GrowthStage | "any";

export type TaskStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "dismissed"
  | "snoozed";

export type TaskResourceType = "module" | "doc" | "build_guide" | "external";

export interface TaskResource {
  type: TaskResourceType;
  /** Module route slug, doc slug, build-guide slug, or external URL. */
  ref: string;
  label?: string;
  /** For type='module', the RelatedModule id (optional convenience). */
  module?: RelatedModule;
}

// ------------------------------------------------------------------
// Condition tree
// ------------------------------------------------------------------
// Conditions are stored as JSON on the task row and evaluated in TS
// against a `ConditionContext` built from workspace signals.
//
// Shape:
//   { all: [ Condition, ... ] }   // AND
//   { any: [ Condition, ... ] }   // OR
//   { not: Condition }
//   { fact: "blueprint.hasMainOffer", op: "eq", value: true }
//
// Facts are dot-paths resolved server- or client-side from the context.
// Unknown facts always resolve to `undefined` — treat as falsy.

export type ConditionOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "truthy"
  | "falsy";

export interface FactCondition {
  fact: string;
  op: ConditionOp;
  value?: unknown;
}

export interface AllCondition { all: ConditionNode[]; }
export interface AnyCondition { any: ConditionNode[]; }
export interface NotCondition { not: ConditionNode; }

export type ConditionNode =
  | FactCondition
  | AllCondition
  | AnyCondition
  | NotCondition;

// ------------------------------------------------------------------
// Task rows
// ------------------------------------------------------------------

export interface GrowthRoadmapTaskRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  stage: TaskStage;
  applicable_stages: GrowthStage[];
  sort_order: number;
  activation_conditions: ConditionNode;
  completion_conditions: ConditionNode;
  resources: TaskResource[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrowthTaskProgressRow {
  id: string;
  sub_account_id: string;
  task_id: string;
  status: TaskStatus;
  activated_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// Evaluation context
// ------------------------------------------------------------------
// A flat, serializable snapshot of the workspace signals we evaluate
// conditions against. Building this is the responsibility of the
// caller (client or edge function).

export interface ConditionContext {
  stage?: GrowthStage;
  // Assessment signals
  assessment?: {
    hasActive: boolean;
    stage?: GrowthStage;
    scores?: Partial<Record<GrowthStage, number>>;
    answers?: Record<string, unknown>;
  };
  // Blueprint signals
  blueprint?: {
    hasMainOffer: boolean;
    hasIcp: boolean;
    hasCorePromise: boolean;
    hasPricing: boolean;
    hasProof: boolean;
    completionPct?: number;
  };
  // Offer signals
  offers?: {
    count: number;
    hasHighTicket: boolean;
    hasLowMidTicket: boolean;
    hasFree: boolean;
  };
  // Funnel signals
  funnels?: {
    count: number;
    hasPublished: boolean;
  };
  // Analytics signals
  analytics?: {
    hasEntries: boolean;
    lastEntryDays?: number;
  };
  // Free-form extras — used by ad-hoc conditions the admin adds later.
  extras?: Record<string, unknown>;
}

// ------------------------------------------------------------------
// Evaluator
// ------------------------------------------------------------------

function readFact(ctx: ConditionContext, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function compare(op: ConditionOp, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case "eq":  return actual === expected;
    case "neq": return actual !== expected;
    case "gt":  return typeof actual === "number" && typeof expected === "number" && actual >  expected;
    case "gte": return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":  return typeof actual === "number" && typeof expected === "number" && actual <  expected;
    case "lte": return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":  return Array.isArray(expected) && expected.includes(actual as never);
    case "not_in": return Array.isArray(expected) && !expected.includes(actual as never);
    case "truthy": return Boolean(actual);
    case "falsy":  return !actual;
    default: return false;
  }
}

/**
 * Evaluate a condition tree against a workspace context.
 * Empty `all: []` resolves to true; empty `any: []` resolves to false.
 * Malformed nodes resolve to false (safe default).
 */
export function evaluateCondition(node: ConditionNode | null | undefined, ctx: ConditionContext): boolean {
  if (!node || typeof node !== "object") return false;

  if ("all" in node) {
    if (!Array.isArray(node.all)) return false;
    return node.all.every((c) => evaluateCondition(c, ctx));
  }
  if ("any" in node) {
    if (!Array.isArray(node.any)) return false;
    if (node.any.length === 0) return false;
    return node.any.some((c) => evaluateCondition(c, ctx));
  }
  if ("not" in node) {
    return !evaluateCondition(node.not, ctx);
  }
  if ("fact" in node) {
    const actual = readFact(ctx, node.fact);
    return compare(node.op, actual, node.value);
  }
  return false;
}

// ------------------------------------------------------------------
// Task filtering / plan derivation
// ------------------------------------------------------------------

/** A task is a candidate for the current stage when its primary stage or
 *  applicable_stages includes the stage, or its primary stage is 'any'. */
export function taskAppliesToStage(task: GrowthRoadmapTaskRow, stage: GrowthStage): boolean {
  if (task.stage === "any") return true;
  if (task.stage === stage) return true;
  return Array.isArray(task.applicable_stages) && task.applicable_stages.includes(stage);
}

export interface DerivedTask {
  task: GrowthRoadmapTaskRow;
  status: TaskStatus;
  isActivated: boolean;
  isCompleted: boolean;
  progress?: GrowthTaskProgressRow;
}

/**
 * Derive the ordered growth plan for a workspace.
 *
 * A task is INCLUDED in the plan when it applies to the current stage
 * AND its activation_conditions evaluate to true against ctx.
 *
 * Status resolution order:
 *   1. Persisted progress row wins if it's completed/dismissed/snoozed/in_progress.
 *   2. Otherwise, if completion_conditions match → 'completed'.
 *   3. Otherwise → 'available'.
 */
export function derivePlan(
  tasks: GrowthRoadmapTaskRow[],
  progress: GrowthTaskProgressRow[],
  ctx: ConditionContext,
): DerivedTask[] {
  const stage = ctx.stage;
  if (!stage) return [];

  const progressByTask = new Map(progress.map((p) => [p.task_id, p]));

  const candidates = tasks
    .filter((t) => t.is_active)
    .filter((t) => taskAppliesToStage(t, stage))
    .filter((t) => evaluateCondition(t.activation_conditions, ctx))
    .sort((a, b) => a.sort_order - b.sort_order);

  return candidates.map((task) => {
    const p = progressByTask.get(task.id);
    let status: TaskStatus;

    const completionMatches = evaluateCondition(task.completion_conditions, ctx);

    if (p && (p.status === "dismissed" || p.status === "snoozed" || p.status === "in_progress")) {
      status = p.status;
    } else if (p?.status === "completed" || completionMatches) {
      status = "completed";
    } else {
      status = "available";
    }

    return {
      task,
      status,
      isActivated: true,
      isCompleted: status === "completed",
      progress: p,
    };
  });
}
