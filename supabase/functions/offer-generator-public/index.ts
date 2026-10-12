// Public AI Offer Generator (no sign-in). Actions:
//   generate — validated intake → shared Offer Intelligence → stored result, returns preview + token
//   unlock   — token + email (+ optional marketing consent) → full result
// Never reads workspace, Blueprint or Coach data. Service role only touches
// public_offer_generations.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validatePublicOfferInput, publicInputToContext } from "../_shared/offerIntelligence/publicInput.ts";
import { runOfferOperation, RECOVERABLE_AI_ERRORS } from "../_shared/offerIntelligence/aiCall.ts";

const PUBLIC_GENERATE_MAX_TOKENS = 8000;
const PUBLIC_RETRY_INSTRUCTION = "# Correction required\nYour previous answer could not be read. Call the `deliver` function directly with JSON arguments (never code or any other tool), and keep every reasoning text to one short sentence so the complete answer fits.";
import {
  buildPublicResult, toPublicPreview, decideRateLimit, looksLikeBot, DEFAULT_RATE_LIMITS, EMAIL_RE, CONSENT_TEXT_VERSION,
} from "../_shared/offerIntelligence/publicResult.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (body?.action === "unlock") {
    const token = String(body.token ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!UUID.test(token)) return json({ error: "invalid_token" }, 400);
    if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "invalid_email" }, 400);
    const consent = body.marketingConsent === true; // never defaulted to true
    const { data: row } = await admin.from("public_offer_generations")
      .select("id,status,result,expires_at").eq("claim_token", token).maybeSingle();
    if (!row || row.status !== "complete" || new Date(row.expires_at) < new Date()) return json({ error: "not_found" }, 404);
    await admin.from("public_offer_generations").update({
      email, marketing_consent: consent, consent_text_version: CONSENT_TEXT_VERSION,
      consent_at: consent ? new Date().toISOString() : null, unlocked_at: new Date().toISOString(),
    }).eq("id", row.id);
    return json({ result: row.result });
  }

  if (body?.action !== "generate") return json({ error: "unknown_action" }, 400);
  if (looksLikeBot(body)) return json({ error: "rejected" }, 400);
  const parsed = validatePublicOfferInput({ ...(body.input ?? {}), tier: "core" });
  if (!parsed.ok) return json({ error: "invalid_input", fields: parsed.errors }, 400);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await sha256(`${ip}|${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(-16)}`);
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const count = async (q: any) => (await q).count ?? 0;
  const base = () => admin.from("public_offer_generations").select("id", { count: "exact", head: true });
  const limits = { ...DEFAULT_RATE_LIMITS, globalDay: Number(Deno.env.get("OFFER_GENERATOR_DAILY_LIMIT")) || DEFAULT_RATE_LIMITS.globalDay };
  const decision = decideRateLimit({
    ipHour: await count(base().eq("ip_hash", ipHash).gte("created_at", hourAgo)),
    ipDay: await count(base().eq("ip_hash", ipHash).gte("created_at", dayAgo)),
    globalDay: await count(base().gte("created_at", dayAgo)),
  }, limits);
  if (!decision.ok) return json({ error: "rate_limited", reason: decision.reason }, 429);

  const { data: row, error: insErr } = await admin.from("public_offer_generations")
    .insert({ input: parsed.input, ip_hash: ipHash }).select("id,claim_token").single();
  if (insErr || !row) return json({ error: "storage_failed" }, 500);
  const fail = async (status: number, error: string) => {
    await admin.from("public_offer_generations").update({ status: "failed" }).eq("id", row.id);
    return json({ error }, status);
  };

  const ctx = publicInputToContext(parsed.input);
  const locale = parsed.input.locale === "nl" ? "Write all text in Dutch." : "";
  // With a current offer the output holds two full assessment sets; 3000 tokens truncated it.
  const opts = { maxTokens: PUBLIC_GENERATE_MAX_TOKENS, ...(locale ? { extraInstructions: locale } : {}) };
  let ai = await runOfferOperation("public_generate", ctx, opts);
  // One corrective attempt for recoverable technical output errors only.
  if (!ai.ok && RECOVERABLE_AI_ERRORS.includes(ai.error)) {
    console.warn("offer-generator retry", ai.error);
    ai = await runOfferOperation("public_generate", ctx, { ...opts, extraInstructions: [locale, PUBLIC_RETRY_INSTRUCTION].filter(Boolean).join("\n\n") });
  }
  if (!ai.ok) return fail(ai.status, RECOVERABLE_AI_ERRORS.includes(ai.error) ? "ai_failed" : ai.error);
  const raw = ai.raw;
  const built = buildPublicResult(raw, { hasCurrentOffer: !!parsed.input.currentOffer });
  if (!built.ok) { console.warn("offer-generator invalid", built.reason, JSON.stringify(built.detail ?? "").slice(0, 500)); return fail(502, "ai_invalid"); }
  await admin.from("public_offer_generations").update({ status: "complete", result: built.result }).eq("id", row.id);
  return json({ token: row.claim_token, preview: toPublicPreview(built.result) });
});
