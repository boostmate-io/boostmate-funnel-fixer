// Growth Roadmap V2 — client service for cycle transitions.
//
// All state changes to growth_stage_cycles / growth_workspace_state MUST go
// through this service. `derivePlan` and any other read paths remain pure.

import { supabase } from "@/integrations/supabase/client";
import type { GrowthStage } from "./types";

export interface StageCycleRow {
  id: string;
  sub_account_id: string;
  stage: GrowthStage;
  cycle_number: number;
  started_at: string;
  ended_at: string | null;
  started_by_reason: string;
  ended_by_reason: string | null;
  ended_by_assessment_id: string | null;
  milestone_attested_at: string | null;
  milestone_attested_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransitionResult {
  status:
    | "started"
    | "advanced"
    | "restarted"
    | "completed"
    | "attested"
    | "cleared"
    | "noop_existing"
    | "noop_idempotent"
    | "noop_same_stage"
    | "noop_already_attested"
    | "noop_not_attested";
  cycle?: StageCycleRow;
}

async function invoke(body: Record<string, unknown>): Promise<TransitionResult> {
  const { data, error } = await supabase.functions.invoke("growth-cycle-transition", { body });
  if (error) throw error;
  return data as TransitionResult;
}

/** Open the first cycle for a stage. Idempotent — returns the existing active cycle if any. */
export function startInitialCycle(
  subAccountId: string,
  stage: GrowthStage,
  reason?: string,
): Promise<TransitionResult> {
  return invoke({
    action: "start_initial_cycle",
    sub_account_id: subAccountId,
    stage,
    reason,
  });
}

/**
 * Close the active cycle on `fromStage` (if any) and open a fresh cycle on `toStage`.
 * Called after an assessment computes a different stage than the currently active cycle.
 * Idempotent when the same assessment_id is passed twice.
 */
export function advanceStage(params: {
  subAccountId: string;
  fromStage?: GrowthStage;
  toStage: GrowthStage;
  assessmentId?: string;
  reason?: string;
}): Promise<TransitionResult> {
  return invoke({
    action: "advance_stage",
    sub_account_id: params.subAccountId,
    from_stage: params.fromStage,
    to_stage: params.toStage,
    assessment_id: params.assessmentId,
    reason: params.reason,
  });
}

/**
 * Explicitly restart the active cycle for a stage (user-initiated loop).
 * Requires the current cycle id to avoid clobbering a concurrent transition.
 */
export function restartCycle(params: {
  subAccountId: string;
  stage: GrowthStage;
  expectedCycleId: string;
  assessmentId?: string;
  reason?: string;
}): Promise<TransitionResult> {
  return invoke({
    action: "restart_cycle",
    sub_account_id: params.subAccountId,
    stage: params.stage,
    expected_cycle_id: params.expectedCycleId,
    assessment_id: params.assessmentId,
    reason: params.reason,
  });
}

/** Mark the roadmap as completed (terminal — passed Systemize gate). */
export function completeTerminal(params: {
  subAccountId: string;
  assessmentId?: string;
  reason?: string;
}): Promise<TransitionResult> {
  return invoke({
    action: "complete_terminal",
    sub_account_id: params.subAccountId,
    assessment_id: params.assessmentId,
    reason: params.reason,
  });
}

// ---------- Read helpers (pure reads, no mutation) ----------

export async function fetchActiveCycles(subAccountId: string): Promise<StageCycleRow[]> {
  const { data, error } = await supabase
    .from("growth_stage_cycles")
    .select("*")
    .eq("sub_account_id", subAccountId)
    .is("ended_at", null);
  if (error) throw error;
  return (data ?? []) as unknown as StageCycleRow[];
}

export async function fetchCycleHistory(
  subAccountId: string,
  stage?: GrowthStage,
): Promise<StageCycleRow[]> {
  let q = supabase
    .from("growth_stage_cycles")
    .select("*")
    .eq("sub_account_id", subAccountId)
    .order("started_at", { ascending: false });
  if (stage) q = q.eq("stage", stage);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as StageCycleRow[];
}

export async function fetchWorkspaceState(
  subAccountId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("growth_workspace_state")
    .select("state")
    .eq("sub_account_id", subAccountId)
    .maybeSingle();
  if (error) throw error;
  return ((data?.state as Record<string, unknown>) ?? {});
}
