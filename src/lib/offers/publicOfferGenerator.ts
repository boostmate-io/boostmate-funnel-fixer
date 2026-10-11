// Client for the public Offer Generator + post-signup claim.
import { supabase } from "@/integrations/supabase/client";

export const PENDING_OFFER_CLAIM_KEY = "boostmate:pending_offer_claim";

export interface GeneratorIntake {
  audience: string;
  outcome: string;
  delivery: string;
  obstacle: string;
  currentOffer?: string;
  currentPrice?: string;
}

const MESSAGES: Record<string, string> = {
  rate_limited: "You've reached the limit for now. Please try again later.",
  invalid_input: "Please check your answers and try again.",
  rejected: "Please take a moment to fill in the form and try again.",
  ai_busy: "Our AI is busy right now. Please try again in a minute.",
  ai_invalid: "We couldn't build a reliable offer from that. Please try again or add a bit more detail.",
  ai_malformed: "Something went wrong while generating. Please try again.",
  ai_failed: "Something went wrong while generating. Please try again.",
  ai_unavailable: "The generator is temporarily unavailable. Please try again later.",
  not_found: "This result is no longer available.",
  invalid_email: "Please enter a valid email address.",
};

export function generatorErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || "Something went wrong. Please try again.";
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("offer-generator-public", { body });
  if (error) {
    let code: string | undefined;
    try { code = (await (error as any).context?.json?.())?.error; } catch { /* ignore */ }
    throw new Error(code ?? "unknown");
  }
  return data;
}

export const generateOffer = (input: GeneratorIntake, meta: { elapsedMs: number; website: string; locale?: string }) =>
  call({ action: "generate", input: { ...input, ...(meta.locale ? { locale: meta.locale } : {}) }, elapsedMs: meta.elapsedMs, website: meta.website });

export const unlockOffer = (token: string, email: string, marketingConsent: boolean) =>
  call({ action: "unlock", token, email, marketingConsent });

export async function claimOfferGeneration(claimToken: string, subAccountId: string): Promise<{ offer_id: string }> {
  const { data, error } = await supabase.functions.invoke("claim-offer-generation", {
    body: { claim_token: claimToken, sub_account_id: subAccountId },
  });
  if (error) throw error;
  return data;
}
