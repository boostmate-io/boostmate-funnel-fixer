// Growth Roadmap V2 — task catalog + progress types + typed condition tree.
//
// `derivePlan` is a PURE read-only function. It never opens, closes, or
// mutates cycles. Cycle transitions are the responsibility of
// `cycleService` / the `growth-cycle-transition` edge function.

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
  /** Optional strategy tag. When set, this resource only surfaces when the
   *  workspace's current strategy value (e.g. `validate.chosenPath`) matches.
   *  Shared/universal resources leave this undefined. */
  strategy?: string;
}


// ------------------------------------------------------------------
// Condition tree
// ------------------------------------------------------------------

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
  /** Whether the task belongs in the user's roadmap at all. Empty `{all: []}`
   *  means always applicable. Evaluated first — an inapplicable task is
   *  hidden entirely; an applicable-but-not-yet-actionable task is shown
   *  as `locked`. */
  applicability_conditions: ConditionNode;
  /** Prerequisites that must be met before the task becomes actionable.
   *  Applicable tasks whose prerequisites are unmet render as `locked`. */
  activation_conditions: ConditionNode;
  completion_conditions: ConditionNode;
  resources: TaskResource[];
  /** Optional primary CTA label. Falls back to the first resource label. */
  cta_label: string | null;
  /** Optional build-guide slug (deep-linked from the plan / build guide layer). */
  build_guide_ref: string | null;
  /** Optional coach prompt slug (used by the AI Coach for task-scoped help). */
  coach_prompt_ref: string | null;
  /** Optional target growth system id — when set, roadmap surfaces a
   *  "Configure in Growth Architecture" CTA that opens the Blueprint wizard
   *  preselected with this system. */
  target_growth_system_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface GrowthTaskProgressRow {
  id: string;
  sub_account_id: string;
  task_id: string;
  cycle_id: string | null;
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
// Cycle snapshot (subset of the DB row that derivePlan needs)
// ------------------------------------------------------------------

export interface CycleSnapshot {
  id: string;
  stage: GrowthStage;
  cycle_number: number;
  started_at: string;
  ended_at: string | null;
  /** Cycle-scoped milestone attestation. NULL until the milestone task
   *  is completed; cleared when the milestone task is un-completed;
   *  never carries across cycles (a new cycle row starts NULL). */
  milestone_attested_at: string | null;
}

// ------------------------------------------------------------------
// Evaluation context
// ------------------------------------------------------------------

export interface ConditionContext {
  stage?: GrowthStage;
  /** Currently active workspace cycle, if any. */
  cycle?: CycleSnapshot;
  assessment?: {
    hasActive: boolean;
    stage?: GrowthStage;
    scores?: Partial<Record<GrowthStage, number>>;
    answers?: Record<string, unknown>;
    /** ISO timestamp — used for reassessment completion derivation. */
    createdAt?: string;
  };
  blueprint?: {
    hasMainOffer: boolean;
    hasIcp: boolean;
    hasCorePromise: boolean;
    hasPricing: boolean;
    hasProof: boolean;
    completionPct?: number;
  };
  offers?: {
    count: number;
    hasHighTicket: boolean;
    hasLowMidTicket: boolean;
    hasFree: boolean;
  };
  funnels?: {
    count: number;
    hasPublished: boolean;
  };
  analytics?: {
    hasEntries: boolean;
    lastEntryDays?: number;
  };
  /**
   * Layer-B workspace state (per-stage attestations, decisions) plus
   * synthetic `reassess.<stage>.completedAfterMilestone` flags derived
   * at context-build time from milestone timestamps + assessment time.
   *
   * Shape: { validate: {...}, attract: {...}, ..., reassess: { validate: {...} } }
   */
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

export interface GrowthPlan {
  /** True when the workspace has no active cycle — caller must bootstrap one. */
  needsCycleBootstrap: boolean;
  /** Active cycle used to scope progress rows. Undefined when needsCycleBootstrap. */
  activeCycle?: CycleSnapshot;
  /** Derived, ordered task list for the active stage. Empty when bootstrap needed. */
  tasks: DerivedTask[];
}

/**
 * Derive the ordered growth plan for a workspace. PURE — no I/O, no side effects.
 *
 * Filtering model (Option A — explicit):
 *   • `applicability_conditions` decides whether a task belongs in the plan
 *     at all. Inapplicable tasks are excluded entirely (e.g. strategy-specific
 *     branches for a strategy the user did not pick).
 *   • `activation_conditions` decides whether an applicable task is currently
 *     actionable. Unmet prerequisites → `locked` (visible, greyed).
 *
 * Cycle scoping:
 *   - Foundation tasks (`stage === "any"`) use cycle-less progress rows
 *     (`progress.cycle_id === null`).
 *   - Stage tasks use progress rows scoped to the active cycle
 *     (`progress.cycle_id === activeCycle.id`).
 *   - When no active cycle exists, `needsCycleBootstrap` is true.
 *
 * Status resolution:
 *   1. If completion_conditions match OR persisted status is completed → `completed`.
 *   2. Else if persisted status is dismissed/snoozed/in_progress → that.
 *   3. Else if activation_conditions are unmet → `locked`.
 *   4. Else → `available`.
 */
export function derivePlan(
  tasks: GrowthRoadmapTaskRow[],
  progress: GrowthTaskProgressRow[],
  ctx: ConditionContext,
): GrowthPlan {
  const stage = ctx.stage;
  if (!stage) return { needsCycleBootstrap: false, tasks: [] };

  const activeCycle = ctx.cycle;
  if (!activeCycle) {
    return { needsCycleBootstrap: true, tasks: [] };
  }

  const foundationProgress = new Map<string, GrowthTaskProgressRow>();
  const cycleProgress = new Map<string, GrowthTaskProgressRow>();
  for (const p of progress) {
    if (p.cycle_id == null) {
      foundationProgress.set(p.task_id, p);
    } else if (p.cycle_id === activeCycle.id) {
      cycleProgress.set(p.task_id, p);
    }
  }

  const candidates = tasks
    .filter((t) => t.is_active)
    .filter((t) => taskAppliesToStage(t, stage))
    .filter((t) => evaluateCondition(t.applicability_conditions ?? { all: [] }, ctx))
    .sort((a, b) => a.sort_order - b.sort_order);

  const derived: DerivedTask[] = candidates.map((task) => {
    const p = task.stage === "any"
      ? foundationProgress.get(task.id)
      : cycleProgress.get(task.id);

    const completionMatches = evaluateCondition(task.completion_conditions, ctx);
    const activationMet = evaluateCondition(task.activation_conditions, ctx);

    let status: TaskStatus;
    if (p?.status === "completed" || completionMatches) {
      status = "completed";
    } else if (p && (p.status === "dismissed" || p.status === "snoozed" || p.status === "in_progress")) {
      status = p.status;
    } else if (!activationMet) {
      status = "locked";
    } else {
      status = "available";
    }

    return {
      task,
      status,
      isActivated: activationMet,
      isCompleted: status === "completed",
      progress: p,
    };
  });

  return { needsCycleBootstrap: false, activeCycle, tasks: derived };
}
