// Client for the authenticated Offer Builder function (Stages A–B).
import { supabase } from "@/integrations/supabase/client";
import type { BuilderStage, Diagnosis, Understanding } from "@shared/offerIntelligence/builderSession";

export interface BuilderSession {
  id: string;
  sub_account_id: string;
  user_id: string;
  offer_id: string | null;
  tier: string;
  mode: "new" | "existing";
  stage: BuilderStage;
  status: "active" | "completed" | "abandoned";
  intake: { idea?: string };
  understanding: Understanding | null;
  context_confirmed_at: string | null;
  diagnosis: Diagnosis | null;
  version: number;
  updated_at: string;
}

const MESSAGES: Record<string, string> = {
  conflict: "This session was updated elsewhere. We reloaded the latest version — please try again.",
  forbidden_workspace: "You don't have access to this workspace.",
  offer_not_found: "This offer could not be found.",
  idea_required: "Describe your offer idea first.",
  context_not_confirmed: "Confirm the working context before running the diagnosis.",
  stage_unavailable: "That stage isn't available yet.",
  ai_busy: "The AI is busy right now. Please try again in a minute.",
  ai_invalid: "The AI returned an unusable answer. Nothing was saved — please try again.",
  ai_failed: "The AI request failed. Please try again.",
  ai_malformed: "The AI request failed. Please try again.",
  ai_unavailable: "The AI is temporarily unavailable.",
  session_closed: "This session is closed.",
};
export const builderErrorMessage = (code?: string) => (code && MESSAGES[code]) || "Something went wrong. Please try again.";

export class BuilderError extends Error {
  constructor(public code: string, public session?: BuilderSession) { super(code); }
}

async function call(body: Record<string, unknown>): Promise<{ session: BuilderSession; resumed?: boolean }> {
  const { data, error } = await supabase.functions.invoke("offer-builder", { body });
  if (error) {
    let payload: any = null;
    try { payload = await (error as any).context?.json?.(); } catch { /* ignore */ }
    throw new BuilderError(payload?.error ?? "unknown", payload?.session);
  }
  return data;
}

export const startBuilderSession = (subAccountId: string, target: { offerId: string } | { tier: string }) =>
  call({ action: "start", sub_account_id: subAccountId, ...("offerId" in target ? { offer_id: target.offerId } : { tier: target.tier }) });

export const builderAction = (s: BuilderSession, action: "understand" | "diagnose" | "save", extra: Record<string, unknown> = {}) =>
  call({ action, session_id: s.id, version: s.version, ...extra });

export async function loadBuilderSession(id: string): Promise<BuilderSession | null> {
  const { data } = await supabase.from("offer_builder_sessions").select("*").eq("id", id).maybeSingle();
  return (data as unknown as BuilderSession) ?? null;
}
