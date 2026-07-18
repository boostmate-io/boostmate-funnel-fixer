// Client helper for creating and reading Growth Assessments.

import { supabase } from "@/integrations/supabase/client";
import { runEngine } from "./engine";
import { serializeCatalogForPrompt } from "./growthSystems";
import type { AnswerMap, GrowthAssessmentRow } from "./types";

/** Create a public (anonymous) assessment. Returns { id, claim_token }. */
export async function createPublicAssessment(answers: AnswerMap): Promise<{ id: string; claim_token: string }> {
  const engine = runEngine(answers);
  const claim_token = crypto.randomUUID();

  const { data, error } = await supabase
    .from("growth_assessments")
    .insert({
      user_id: null,
      sub_account_id: null,
      claim_token,
      source: "public",
      answers,
      stage_scores: engine.stageScores,
      gate_results: engine.gateResults,
      computed_stage: engine.computedStage,
      is_active: true,
    })
    .select("id, claim_token")
    .single();

  if (error || !data) throw error ?? new Error("insert_failed");
  return { id: data.id, claim_token: data.claim_token! };
}

/** Create an internal (authenticated) assessment for the current workspace. */
export async function createInternalAssessment(
  userId: string,
  subAccountId: string,
  answers: AnswerMap,
): Promise<GrowthAssessmentRow> {
  const engine = runEngine(answers);

  // Deactivate previous active one first (respects one-active-per-sub unique index).
  await supabase
    .from("growth_assessments")
    .update({ is_active: false })
    .eq("sub_account_id", subAccountId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("growth_assessments")
    .insert({
      user_id: userId,
      sub_account_id: subAccountId,
      source: "internal",
      answers,
      stage_scores: engine.stageScores,
      gate_results: engine.gateResults,
      computed_stage: engine.computedStage,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("insert_failed");
  return data as unknown as GrowthAssessmentRow;
}

/** Trigger AI enrichment. Returns the ai_result. */
export async function runAiAnalysis(assessmentId: string, opts: { claimToken?: string; language?: string } = {}) {
  const { data, error } = await supabase.functions.invoke("growth-analyze", {
    body: {
      assessment_id: assessmentId,
      claim_token: opts.claimToken,
      language: opts.language ?? "en",
      catalog: serializeCatalogForPrompt(),
    },
  });
  if (error) throw error;
  return data;
}

/** Read an assessment by claim token (public path — used before signup). */
export async function readByClaimToken(claimToken: string): Promise<GrowthAssessmentRow | null> {
  const { data, error } = await supabase
    .from("growth_assessments")
    .select("*")
    .eq("claim_token", claimToken)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as GrowthAssessmentRow) ?? null;
}

/** Read the active assessment for a workspace. */
export async function readActiveForWorkspace(subAccountId: string): Promise<GrowthAssessmentRow | null> {
  const { data, error } = await supabase
    .from("growth_assessments")
    .select("*")
    .eq("sub_account_id", subAccountId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as GrowthAssessmentRow) ?? null;
}

/** Claim a public assessment to the current user's workspace. */
export async function claimAssessment(claimToken: string, subAccountId: string) {
  const { data, error } = await supabase.functions.invoke("claim-growth-assessment", {
    body: { claim_token: claimToken, sub_account_id: subAccountId },
  });
  if (error) throw error;
  return data;
}
