// =============================================================================
// Public Generator input — explicit, size-limited, no workspace data.
// =============================================================================

import { isOfferTier } from "../offerAiPolicy.ts";
import type { OfferTier } from "../blueprintRegistry.ts";

export interface PublicOfferInput {
  audience: string;
  outcome: string;
  delivery: string;
  obstacle: string;
  currentOffer?: string;
  /** Visitor's own statement of evidence (results, experience, guarantee). Claims, not verified proof. */
  credibility?: string;
  currentPrice?: string;
  /** "existing" = already selling; "idea" = not yet sold. */
  stage?: "existing" | "idea";
  currency?: string;
  tier: OfferTier;
  locale?: "en" | "nl";
}

const LIMITS = { audience: 300, outcome: 300, delivery: 800, obstacle: 300, currentOffer: 1000, credibility: 800, currentPrice: 40 } as const;
const REQUIRED = ["audience", "outcome", "obstacle"] as const;
const ALLOWED_KEYS = new Set([...Object.keys(LIMITS), "tier", "locale", "stage", "currency"]);
export const PUBLIC_CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD", "CHF"] as const;

export type PublicInputResult = { ok: true; input: PublicOfferInput } | { ok: false; errors: Record<string, string> };

/** Validate untrusted public input. Unknown keys are rejected (no smuggled context). */
export function validatePublicOfferInput(raw: unknown): PublicInputResult {
  const errors: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, errors: { _: "invalid_body" } };
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(r)) if (!ALLOWED_KEYS.has(k)) errors[k] = "unknown_field";
  const out: Record<string, unknown> = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = r[k];
    if (v == null || v === "") { if ((REQUIRED as readonly string[]).includes(k)) errors[k] = "required"; continue; }
    if (typeof v !== "string") { errors[k] = "invalid_type"; continue; }
    const s = v.replace(/[\u0000-\u001f]/g, " ").trim();
    if (!s && (REQUIRED as readonly string[]).includes(k)) errors[k] = "required";
    else if (s.length > max) errors[k] = "too_long";
    else if (s) out[k] = s;
  }
  if (!out.delivery && !out.currentOffer && !errors.delivery && !errors.currentOffer) errors.currentOffer = "required";
  if (r.stage != null && r.stage !== "existing" && r.stage !== "idea") errors.stage = "invalid_stage";
  else if (r.stage) out.stage = r.stage;
  if (r.currency != null && r.currency !== "" && !(PUBLIC_CURRENCIES as readonly unknown[]).includes(r.currency)) errors.currency = "invalid_currency";
  else if (r.currency) out.currency = r.currency;
  if (!isOfferTier(r.tier)) errors.tier = "invalid_tier";
  else out.tier = r.tier;
  if (r.locale != null && r.locale !== "en" && r.locale !== "nl") errors.locale = "invalid_locale";
  else if (r.locale) out.locale = r.locale;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, input: out as unknown as PublicOfferInput };
}

/** Public input → the neutral context shape operations consume (no Blueprint). */
export function publicInputToContext(input: PublicOfferInput) {
  return {
    source: "public" as const,
    tier: input.tier,
    facts: {
      audience: input.audience, outcome: input.outcome, obstacle: input.obstacle,
      ...(input.delivery ? { delivery: input.delivery } : {}),
      ...(input.stage ? { offerStage: input.stage === "idea" ? "offer idea, not sold yet" : "existing offer, already selling" } : {}),
      ...(input.currentOffer ? { currentOffer: input.currentOffer } : {}),
      ...(input.credibility ? { credibility: `Visitor's own statement about why clients can trust the offer (a claim, not verified proof): ${input.credibility}` } : {}),
      ...(input.currentPrice ? { currentPrice: input.currentPrice + (input.currency ? ` ${input.currency}` : "") } : {}),
    },
    blueprint: null,
    design: null,
    mode: input.stage === "idea" ? ("new" as const) : ("existing" as const),
  };
}
