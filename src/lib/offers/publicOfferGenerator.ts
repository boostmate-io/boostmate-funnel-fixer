// Client for the public Mini Irresistible Offer Builder, the Free Video Audit
// request and the post-signup claim.
import { supabase } from "@/integrations/supabase/client";
import type { PublicOfferResult } from "@shared/offerIntelligence/publicResult";
import type { PublicDiagnosis, PublicImprovement, PublicChoice, AuditChannel } from "@shared/offerIntelligence/publicFlow";

export const PENDING_OFFER_CLAIM_KEY = "boostmate:pending_offer_claim";
export const PUBLIC_BUILDER_STATE_KEY = "boostmate:public_offer_builder";

export interface GeneratorIntake {
  audience: string;
  outcome: string;
  delivery: string;
  obstacle: string;
  currentOffer?: string;
  currentPrice?: string;
  stage?: "existing" | "idea";
  currency?: string;
}

const MESSAGES: Record<string, string> = {
  rate_limited: "You've reached the limit for now. Please try again later.",
  invalid_input: "Please check your answers and try again.",
  rejected: "Please take a moment to fill in the form and try again.",
  ai_busy: "Our AI is busy right now. Please try again in a minute.",
  ai_invalid: "We couldn't finish this step. Please try again in a moment.",
  ai_malformed: "Something went wrong on our side. Please try again.",
  ai_failed: "Something went wrong on our side. Your answers are saved — please try again.",
  ai_unavailable: "The builder is temporarily unavailable. Please try again later.",
  storage_failed: "Something went wrong on our side. Please try again.",
  not_found: "This session has expired. Please start again.",
  invalid_email: "Please enter a valid email address.",
};

export function generatorErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || "Something went wrong. Please try again.";
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("offer-generator-public", { body });
  if (error) {
    let payload: any;
    try { payload = await (error as any).context?.json?.(); } catch { /* ignore */ }
    const e = new Error(payload?.error ?? "unknown") as Error & { fields?: Record<string, string> };
    e.fields = payload?.fields;
    throw e;
  }
  return data;
}

export const diagnoseOffer = (input: GeneratorIntake, meta: { elapsedMs: number; website: string }): Promise<{ token: string; diagnosis: PublicDiagnosis }> =>
  call({ action: "diagnose", input, elapsedMs: meta.elapsedMs, website: meta.website });

export const strengthenOffer = (token: string, regenerate = false): Promise<{ items: PublicImprovement[] }> =>
  call({ action: "strengthen", token, regenerate });

export const finalizeOffer = (token: string, choices: PublicChoice[]): Promise<{ result: PublicOfferResult }> =>
  call({ action: "finalize", token, choices });

export const requestVideoAudit = (req: { token: string | null; email: string; instagram: string; channel: AuditChannel; website: string; marketingConsent: boolean }): Promise<{ ok: true; already?: boolean }> =>
  call({ action: "audit_request", ...req });

export async function claimOfferGeneration(claimToken: string, subAccountId: string): Promise<{ offer_id: string }> {
  const { data, error } = await supabase.functions.invoke("claim-offer-generation", {
    body: { claim_token: claimToken, sub_account_id: subAccountId },
  });
  if (error) throw error;
  return data;
}
