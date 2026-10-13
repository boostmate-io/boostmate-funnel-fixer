// Public Mini Irresistible Offer Builder (no sign-in, no email gate). Actions:
//   diagnose      — validated discovery answers → shared `diagnose` op → Before profile + token
//   strengthen    — token → shared `strengthen` op → 2–3 improvement areas × 2 options (cached)
//   finalize      — token + visitor decisions → shared `public_generate` op → full improved offer
//   audit_request — Free Video Audit application (optionally linked to the token's result)
// Never reads workspace, Blueprint or Coach data. Service role only touches
// public_offer_generations, offer_blueprint_deliveries and the private offer-blueprints bucket.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validatePublicOfferInput, publicInputToContext } from "../_shared/offerIntelligence/publicInput.ts";
import { runOfferOperation, RECOVERABLE_AI_ERRORS, type AiCallResult } from "../_shared/offerIntelligence/aiCall.ts";
import { buildPublicResult, decideRateLimit, looksLikeBot, DEFAULT_RATE_LIMITS } from "../_shared/offerIntelligence/publicResult.ts";
import {
  buildDiagnosis, buildStrengthen, validateChoices, finalizeFacts, validateBlueprintRequest, auditSnapshot,
  PUBLIC_DIAGNOSE_INSTRUCTION, PUBLIC_STRENGTHEN_INSTRUCTION, PUBLIC_FINAL_INSTRUCTION, reconcileFinal, scoresLine,
} from "../_shared/offerIntelligence/publicFlow.ts";
import { renderBlueprintPdf } from "../_shared/offerIntelligence/blueprintPdf.ts";
import type { OfferOperation, OperationContext } from "../_shared/offerIntelligence/operations.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STRENGTHEN = 3;
const MAX_FINALIZE = 3;
const MAX_AUDITS_PER_IP_DAY = 5;
const RETRY_NOTE = "# Correction required\nYour previous answer could not be used. Call the `deliver` function directly with JSON arguments (never code or another tool), follow the output contract exactly and keep every text short so the complete answer fits.";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** One AI call + at most one corrective attempt for technical/format failures. */
async function aiWithRetry<T>(op: OfferOperation, ctx: OperationContext, extra: string, maxTokens: number,
  build: (raw: unknown) => { ok: true; value: T } | { ok: false; errors?: unknown; reason?: string }):
  Promise<{ ok: true; value: T } | { ok: false; status: number; error: string }> {
  let last: AiCallResult | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ai = await runOfferOperation(op, ctx, { maxTokens, extraInstructions: attempt === 0 ? extra : `${extra}\n\n${RETRY_NOTE}` });
    last = ai;
    if (!ai.ok) {
      if (RECOVERABLE_AI_ERRORS.includes(ai.error)) { console.warn("public-builder retry", op, ai.error); continue; }
      return { ok: false, status: ai.status, error: ai.error };
    }
    const built = build(ai.raw);
    if (built.ok) return built;
    console.warn("public-builder invalid", op, JSON.stringify((built as any).errors ?? (built as any).reason ?? "").slice(0, 400));
  }
  // Technical failure after the retry: never blame the visitor's answers.
  return { ok: false, status: 502, error: last && !last.ok && !RECOVERABLE_AI_ERRORS.includes(last.error) ? last.error : "ai_failed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await sha256(`${ip}|${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(-16)}`);
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();

  const loadRow = async (token: unknown) => {
    if (!UUID.test(String(token ?? ""))) return null;
    const { data } = await admin.from("public_offer_generations")
      .select("id,status,input,diagnosis,strengthen,choices,result,strengthen_count,finalize_count,expires_at,claim_token")
      .eq("claim_token", String(token)).maybeSingle();
    if (!data || new Date(data.expires_at) < new Date()) return null;
    return data;
  };
  const ctxFor = (row: any, extraFacts: Record<string, string> = {}): OperationContext => {
    const parsed = validatePublicOfferInput(row.input);
    const base = publicInputToContext((parsed.ok ? parsed.input : row.input) as any);
    return { ...base, facts: { ...base.facts, ...extraFacts } };
  };
  const localeNote = (row: any) => (row.input?.locale === "nl" ? "Write all text in Dutch." : "");

  // ---- diagnose ----------------------------------------------------------
  if (body?.action === "diagnose") {
    if (looksLikeBot(body)) return json({ error: "rejected" }, 400);
    const parsed = validatePublicOfferInput({ ...(body.input ?? {}), tier: "core" });
    if (!parsed.ok) return json({ error: "invalid_input", fields: parsed.errors }, 400);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
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
      .insert({ input: parsed.input, ip_hash: ipHash }).select("id,claim_token,input").single();
    if (insErr || !row) return json({ error: "storage_failed" }, 500);
    const ai = await aiWithRetry("diagnose", ctxFor(row), [PUBLIC_DIAGNOSE_INSTRUCTION, localeNote(row)].filter(Boolean).join("\n\n"), 5000, buildDiagnosis);
    if (!ai.ok) { await admin.from("public_offer_generations").update({ status: "failed" }).eq("id", row.id); return json({ error: ai.error }, ai.status); }
    await admin.from("public_offer_generations").update({ status: "diagnosed", diagnosis: ai.value }).eq("id", row.id);
    return json({ token: row.claim_token, diagnosis: ai.value });
  }

  // ---- strengthen --------------------------------------------------------
  if (body?.action === "strengthen") {
    const row = await loadRow(body.token);
    if (!row || !row.diagnosis) return json({ error: "not_found" }, 404);
    if (row.strengthen && body.regenerate !== true) return json({ items: row.strengthen });
    if (row.strengthen_count >= MAX_STRENGTHEN) return json({ error: "rate_limited" }, 429);
    await admin.from("public_offer_generations").update({ strengthen_count: row.strengthen_count + 1 }).eq("id", row.id);
    const facts = { diagnosis: `Weaknesses: ${row.diagnosis.weaknesses.join(" | ")}. Top improvements: ${row.diagnosis.topImprovements.join(" | ")}` };
    const ai = await aiWithRetry("public_strengthen", ctxFor(row, facts), [PUBLIC_STRENGTHEN_INSTRUCTION, localeNote(row)].filter(Boolean).join("\n\n"), 5000, buildStrengthen);
    if (!ai.ok) return json({ error: ai.error }, ai.status);
    // New options invalidate earlier decisions and any earlier final result.
    await admin.from("public_offer_generations").update({ strengthen: ai.value, choices: null }).eq("id", row.id);
    return json({ items: ai.value });
  }

  // ---- finalize ----------------------------------------------------------
  if (body?.action === "finalize") {
    const row = await loadRow(body.token);
    if (!row || !row.diagnosis || !Array.isArray(row.strengthen)) return json({ error: "not_found" }, 404);
    const checked = validateChoices(body.choices, row.strengthen);
    if (!checked.ok) return json({ error: "invalid_input", reason: checked.error }, 400);
    if (row.result && row.status === "complete" && JSON.stringify(row.choices) === JSON.stringify(checked.value)) return json({ result: row.result });
    if (row.finalize_count >= MAX_FINALIZE) return json({ error: "rate_limited" }, 429);
    await admin.from("public_offer_generations").update({ finalize_count: row.finalize_count + 1 }).eq("id", row.id);
    const facts = finalizeFacts(row.diagnosis, row.strengthen, checked.value);
    const ai = await aiWithRetry("public_generate", ctxFor(row, facts), [PUBLIC_FINAL_INSTRUCTION, localeNote(row)].filter(Boolean).join("\n\n"), 9000, (raw) => {
      const b = buildPublicResult(raw, { hasCurrentOffer: false });
      return b.ok ? { ok: true as const, value: b.result } : b;
    });
    if (!ai.ok) return json({ error: ai.error }, ai.status);
    const result = reconcileFinal(ai.value, row.diagnosis, row.strengthen, checked.value);
    await admin.from("public_offer_generations").update({ status: "complete", result, choices: checked.value }).eq("id", row.id);
    return json({ result });
  }

  // ---- Offer Blueprint PDF (+ optional Free Video Audit) -------------------
  // PDF is rendered from the stored result (no AI), kept in a private bucket and
  // delivered via a 30-day signed link to the visitor and the Boostmate admin.
  // Only a minimal hashed record is kept (duplicates, rate limiting, retries).
  if (body?.action === "blueprint_request") {
    if (String(body.hp ?? "").trim() !== "") return json({ error: "rejected" }, 400); // honeypot
    const v = validateBlueprintRequest(body);
    if (!v.ok) return json({ error: "invalid_input", fields: v.errors }, 400);
    const row = await loadRow(body.token);
    if (!row || row.status !== "complete" || !row.result) return json({ error: "not_found" }, 404);
    const emailHash = await sha256(`${v.value.email}|${row.id}`);
    const { data: prior } = await admin.from("offer_blueprint_deliveries").select("id,status").eq("generation_id", row.id).eq("email_hash", emailHash).maybeSingle();
    if (prior && prior.status !== "pending") return json({ ok: true, already: true, auditRequested: !!v.value.audit });
    if (!prior) {
      const { count } = await admin.from("offer_blueprint_deliveries").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", dayAgo);
      if ((count ?? 0) >= MAX_AUDITS_PER_IP_DAY) return json({ error: "rate_limited" }, 429);
    }
    const rec = prior ?? (await admin.from("offer_blueprint_deliveries").insert({ generation_id: row.id, email_hash: emailHash, audit_requested: !!v.value.audit, ip_hash: ipHash }).select("id,status").single()).data;
    if (!rec) return json({ error: "storage_failed" }, 500);

    let pdf: Uint8Array;
    try { pdf = await renderBlueprintPdf(row); } catch (e) { console.error("blueprint pdf", String(e).slice(0, 300)); return json({ error: "pdf_failed" }, 500); }
    if (pdf.byteLength > 4_000_000) { console.error("blueprint pdf too large", pdf.byteLength); return json({ error: "pdf_failed" }, 500); }
    const path = `${row.id}/${emailHash.slice(0, 24)}.pdf`;
    const up = await admin.storage.from("offer-blueprints").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) { console.error("blueprint upload", up.error.message); return json({ error: "storage_failed" }, 500); }
    const signed = await admin.storage.from("offer-blueprints").createSignedUrl(path, 30 * 86400, { download: "Irresistible-Offer-Blueprint.pdf" });
    if (!signed.data?.signedUrl) return json({ error: "storage_failed" }, 500);
    const downloadUrl = signed.data.signedUrl;

    const send = async (payload: Record<string, unknown>) => {
      // Up to 3 attempts for transient failures (network, 429, 5xx); the shared
      // idempotency key makes retries safe — no duplicate notifications.
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise((res) => setTimeout(res, attempt * 800));
        try {
          const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify(payload),
          });
          if (r.ok) return true;
          console.error("blueprint email failed", payload.templateName, r.status, (await r.text()).slice(0, 200));
          if (r.status < 500 && r.status !== 429) return false;
        } catch (e) { console.error("blueprint email error", payload.templateName, String(e).slice(0, 200)); }
      }
      return false;
    };
    const res = row.result as any; const inp = row.input as any; const snap = auditSnapshot(row);
    const visitorOk = await send({
      templateName: "offer-blueprint", recipientEmail: v.value.email, idempotencyKey: `offer-blueprint-${rec.id}`,
      templateData: { offerName: res.offerName, downloadUrl, auditRequested: !!v.value.audit },
    });
    // No false success: the visitor may retry; the pending record is reused.
    if (!visitorOk) return json({ error: "email_failed" }, 502);
    const adminOk = await send({
      templateName: "offer-blueprint-lead", idempotencyKey: `offer-blueprint-lead-${rec.id}`,
      templateData: {
        email: v.value.email, submittedAt: new Date().toUTCString(), auditRequested: !!v.value.audit, marketingConsent: v.value.marketingConsent,
        original: [
          { label: "Status", value: inp.stage === "idea" ? "New offer idea" : "Existing offer" },
          { label: "Target audience", value: inp.audience ?? "" }, { label: "Desired result", value: inp.outcome ?? "" },
          { label: "Current offer", value: inp.currentOffer ?? "" }, { label: "Delivery", value: inp.delivery ?? "" },
          { label: "Biggest challenge", value: inp.obstacle ?? "" },
          { label: "Current price", value: inp.currentPrice ? `${inp.currentPrice} ${inp.currency ?? ""}`.trim() : "" },
        ],
        improved: [
          { label: "Name", value: res.offerName ?? "" }, { label: "Promise", value: res.promise ?? "" },
          { label: "Scores (before → after)", value: scoresLine(snap) },
        ],
        decisions: snap.decisions.map((d: any) => `${d.area}: ${d.choice ?? "—"}${d.custom ? ` (${d.custom})` : ""}`),
        audit: v.value.audit ? [
          { label: "Instagram", value: `@${v.value.audit.instagram} (https://instagram.com/${v.value.audit.instagram})` },
          { label: "Website or funnel", value: v.value.audit.website ?? "" },
          { label: "Current client acquisition", value: v.value.audit.acquisition },
        ] : [],
        downloadUrl,
      },
    });
    if (!adminOk) console.error("ADMIN NOTICE NOT DELIVERED for blueprint delivery", rec.id);
    await admin.from("offer_blueprint_deliveries").update({ status: adminOk ? "sent" : "admin_failed" }).eq("id", rec.id);
    return json({ ok: true, auditRequested: !!v.value.audit });
  }

  return json({ error: "unknown_action" }, 400);
});
