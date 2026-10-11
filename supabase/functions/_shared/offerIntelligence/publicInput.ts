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
  currentPrice?: string;
  tier: OfferTier;
  locale?: "en" | "nl";
}

const LIMITS = { audience: 300, outcome: 300, delivery: 300, obstacle: 300, currentOffer: 500, currentPrice: 40 } as const;
const REQUIRED = ["audience", "outcome", "delivery", "obstacle"] as const;
const ALLOWED_KEYS = new Set([...Object.keys(LIMITS), "tier", "locale"]);

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
      audience: input.audience, outcome: input.outcome, delivery: input.delivery, obstacle: input.obstacle,
      ...(input.currentOffer ? { currentOffer: input.currentOffer } : {}),
      ...(input.currentPrice ? { currentPrice: input.currentPrice } : {}),
    },
    blueprint: null,
    design: null,
  };
}
