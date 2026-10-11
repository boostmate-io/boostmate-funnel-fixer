// Authenticated Irresistible Offer Builder (Stages A–E + Builder chat). All DB
// access uses the caller's JWT so RLS applies; the offer category always comes
// from the saved offer row. This function never writes offers, relationships,
// funnels or Blueprints — approved offers are saved by the client through the
// existing offer repository, then confirmed here (`approval_complete`).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isOfferTier } from "../_shared/offerAiPolicy.ts";
import { validateOperationOutput } from "../_shared/offerIntelligence/operations.ts";
import { runOfferOperation } from "../_shared/offerIntelligence/aiCall.ts";
import {
  buildBuilderContext, canEnterStage, sanitizeCorrections, toDiagnosis, toUnderstanding, type BuilderStage,
} from "../_shared/offerIntelligence/builderSession.ts";
import {
  applyPackageEdits, applyStrengthenDecisions, staleStages, strengthenComplete, strengthenFacts, toFinal, toPackage, toStrengthen,
  type BuilderDecisions,
} from "../_shared/offerIntelligence/builderStages.ts";
import { buildBuilderChatSystem, buildBuilderChatContext } from "../_shared/offerIntelligence/builderChat.ts";
import { summarizeRelatedOffers, renderRelatedOffersSection } from "../_shared/offerContext.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_COLS = "*";
const AI_ACTIONS = ["understand", "diagnose", "strengthen", "package", "final_assessment"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: u } = await db.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return json({ error: "unauthorized" }, 401);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const access = async (sub: string) => {
    const [{ data: m }, { data: a }] = await Promise.all([
      db.rpc("is_sub_account_member", { _user_id: userId, _sub_id: sub }),
      db.rpc("is_app_admin", { _user_id: userId }),
    ]);
    return !!m || !!a;
  };

  // ---- start: new (category) or existing (offer id) -------------------------
  // Resumes the latest active session for the same target unless force_new,
  // which closes it (abandoned, kept for reference) and starts fresh.
  if (body?.action === "start") {
    const sub = String(body.sub_account_id ?? "");
    if (!UUID.test(sub)) return json({ error: "invalid_input" }, 400);
    if (!(await access(sub))) return json({ error: "forbidden_workspace" }, 403);
    const forceNew = body.force_new === true;
    const abandon = async (id: string) => { await db.from("offer_builder_sessions").update({ status: "abandoned" }).eq("id", id).eq("status", "active"); };
    if (body.offer_id) {
      const offerId = String(body.offer_id);
      if (!UUID.test(offerId)) return json({ error: "invalid_input" }, 400);
      const { data: offer } = await db.from("offers").select("id,tier,sub_account_id").eq("id", offerId).maybeSingle();
      if (!offer || offer.sub_account_id !== sub) return json({ error: "offer_not_found" }, 404);
      if (!isOfferTier(offer.tier)) return json({ error: "unknown_tier" }, 400);
      const { data: existing } = await db.from("offer_builder_sessions").select(SESSION_COLS)
        .eq("offer_id", offerId).eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (existing && forceNew) await abandon(existing.id);
      else if (existing) {
        if (existing.tier !== offer.tier) {
          const { data: fixed } = await db.from("offer_builder_sessions").update({ tier: offer.tier, understanding: null, context_confirmed_at: null, diagnosis: null, decisions: {}, draft_design: null, stage: "understand", version: existing.version + 1 })
            .eq("id", existing.id).eq("version", existing.version).select(SESSION_COLS).maybeSingle();
          return json({ session: fixed ?? existing, resumed: true });
        }
        return json({ session: existing, resumed: true });
      }
      const { data: created, error } = await db.from("offer_builder_sessions")
        .insert({ sub_account_id: sub, user_id: userId, offer_id: offerId, tier: offer.tier, mode: "existing" }).select(SESSION_COLS).single();
      return error ? json({ error: "create_failed" }, 500) : json({ session: created, resumed: false });
    }
    if (!isOfferTier(body.tier)) return json({ error: "invalid_tier" }, 400);
    if (!forceNew) {
      const { data: existing } = await db.from("offer_builder_sessions").select(SESSION_COLS)
        .eq("sub_account_id", sub).eq("user_id", userId).eq("mode", "new").eq("tier", body.tier).eq("status", "active")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) return json({ session: existing, resumed: true });
    }
    const { data: created, error } = await db.from("offer_builder_sessions")
      .insert({ sub_account_id: sub, user_id: userId, tier: body.tier, mode: "new" }).select(SESSION_COLS).single();
    return error ? json({ error: "create_failed" }, 500) : json({ session: created, resumed: false });
  }

  // ---- session-scoped actions ----------------------------------------------
  const sessionId = String(body?.session_id ?? "");
  if (!UUID.test(sessionId)) return json({ error: "invalid_input" }, 400);
  const { data: s } = await db.from("offer_builder_sessions").select(SESSION_COLS).eq("id", sessionId).maybeSingle();
  if (!s) return json({ error: "not_found" }, 404);
  if (s.user_id !== userId || !(await access(s.sub_account_id))) return json({ error: "forbidden_workspace" }, 403);
  const decisions: BuilderDecisions = (s.decisions ?? {}) as BuilderDecisions;

  // Authoritative context (category from the saved offer when present).
  const loadContext = async () => {
    let tier = s.tier, design: Record<string, any> | null = null;
    const { data: bp } = await db.from("business_blueprints").select("id,customer_clarity,brand_strategy,proof_authority,growth_system,offer_stack").eq("sub_account_id", s.sub_account_id).maybeSingle();
    if (s.offer_id) {
      const { data: offer } = await db.from("offers").select("id,tier,source,data,sub_account_id").eq("id", s.offer_id).maybeSingle();
      if (!offer || offer.sub_account_id !== s.sub_account_id) return { error: json({ error: "offer_not_found" }, 404) } as const;
      tier = offer.tier;
      design = offer.source === "blueprint_core" ? (bp?.offer_stack ?? null) : ((offer.data as any)?.design ?? null);
    }
    if (!isOfferTier(tier)) return { error: json({ error: "unknown_tier" }, 400) } as const;
    let ecosystem: string | null = null;
    if (bp?.id) {
      const { data: rows } = await db.from("offers").select("id,name,tier,source,sub_account_id,data").eq("blueprint_id", bp.id).eq("sub_account_id", s.sub_account_id);
      ecosystem = renderRelatedOffersSection(summarizeRelatedOffers((rows ?? []) as any, s.offer_id ?? null, bp.offer_stack), tier);
    }
    return { tier, design, bp, ecosystem } as const;
  };

  // Builder chat: separate conversation per session; never changes decisions or offers.
  if (body.action === "chat") {
    const message = String(body.message ?? "").trim().slice(0, 4000);
    if (!message) return json({ error: "invalid_input" }, 400);
    if (s.status !== "active") return json({ error: "session_closed" }, 409);
    const c = await loadContext();
    if ("error" in c) return c.error;
    const { data: history } = await db.from("offer_builder_messages").select("role,content").eq("session_id", s.id).order("created_at", { ascending: false }).limit(20);
    const { error: insErr } = await db.from("offer_builder_messages").insert({ session_id: s.id, user_id: userId, role: "user", content: message, stage: s.stage });
    if (insErr) { console.error("builder chat insert", insErr.message); return json({ error: "save_failed" }, 500); }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "ai_unavailable" }, 500);
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview", temperature: 0.5, max_tokens: 1500,
        messages: [
          { role: "system", content: buildBuilderChatSystem(c.tier) },
          { role: "system", content: buildBuilderChatContext({ session: s, tier: c.tier, design: c.design, blueprint: c.bp, ecosystem: c.ecosystem }) },
          ...((history ?? []).reverse().map((m: any) => ({ role: m.role, content: m.content }))),
          { role: "user", content: message },
        ],
      }),
    }).catch(() => null);
    if (!resp) return json({ error: "ai_unavailable" }, 502);
    if (resp.status === 429) return json({ error: "ai_busy" }, 429);
    if (resp.status === 402) return json({ error: "ai_unavailable" }, 503);
    if (!resp.ok) return json({ error: "ai_failed" }, 502);
    const reply = String((await resp.json())?.choices?.[0]?.message?.content ?? "").trim().slice(0, 7900);
    if (!reply) return json({ error: "ai_failed" }, 502);
    const { error: aErr } = await db.from("offer_builder_messages").insert({ session_id: s.id, user_id: userId, role: "assistant", content: reply, stage: s.stage });
    if (aErr) console.error("builder chat assistant insert", aErr.message);
    return json({ reply });
  }

  const version = Number(body?.version);
  if (!Number.isInteger(version)) return json({ error: "invalid_input" }, 400);
  if (s.status !== "active") return json({ error: "session_closed" }, 409);
  if (s.version !== version) return json({ error: "conflict", session: s }, 409);

  const save = async (patch: Record<string, unknown>) => {
    const { data } = await db.from("offer_builder_sessions").update({ ...patch, version: s.version + 1 })
      .eq("id", s.id).eq("version", s.version).eq("status", "active").select(SESSION_COLS).maybeSingle();
    return data ? json({ session: data }) : json({ error: "conflict" }, 409);
  };

  if (body.action === "save") {
    const patch: Record<string, unknown> = {};
    if (body.intake && typeof body.intake === "object") {
      const idea = String(body.intake.idea ?? "").trim().slice(0, 1500);
      patch.intake = { ...(s.intake ?? {}), idea };
    }
    if (body.corrections !== undefined) {
      if (!s.understanding) return json({ error: "no_understanding" }, 409);
      patch.understanding = { ...s.understanding, corrections: sanitizeCorrections(s.understanding, body.corrections) };
      patch.context_confirmed_at = null; // changed context must be re-confirmed
    }
    if (body.confirm === true) {
      if (!s.understanding) return json({ error: "no_understanding" }, 409);
      patch.context_confirmed_at = new Date().toISOString();
    }
    if (body.strengthen_decisions !== undefined) {
      if (!decisions.strengthen) return json({ error: "no_strengthen" }, 409);
      const r = applyStrengthenDecisions(decisions.strengthen, body.strengthen_decisions);
      if (!r.ok) return json({ error: r.error }, 400);
      patch.decisions = { ...decisions, strengthen: r.state };
    }
    if (body.package_edits !== undefined) {
      if (!decisions.package) return json({ error: "no_package" }, 409);
      const r = applyPackageEdits(s.tier, decisions.package, body.package_edits);
      if (!r.ok) return json({ error: r.error, details: r.errors ?? null }, 400);
      patch.decisions = { ...((patch.decisions as any) ?? decisions), package: r.state };
      patch.draft_design = r.draft;
    }
    if (body.stage) {
      const next = { ...s, ...patch } as any;
      if (!canEnterStage(next, body.stage as BuilderStage)) return json({ error: "stage_unavailable" }, 409);
      patch.stage = body.stage;
    }
    return save(patch);
  }

  // ---- approval (two-step; the offer write happens client-side in between) --
  if (body.action === "approval_begin") {
    if (!decisions.final || !decisions.package || !s.draft_design) return json({ error: "not_ready" }, 409);
    const stale = staleStages(s.diagnosis, decisions);
    if (stale.final || stale.package) return json({ error: "reassess_required" }, 409);
    if (decisions.approval?.status === "applied") return json({ error: "already_applied" }, 409);
    const expected = String(body.expected ?? "").slice(0, 80);
    // A retry keeps the original expectation so a half-finished save is detected as done.
    const approval = decisions.approval?.status === "applying" ? decisions.approval : { status: "applying", startedAt: new Date().toISOString(), expected };
    return save({ decisions: { ...decisions, approval } });
  }
  if (body.action === "approval_complete") {
    if (decisions.approval?.status !== "applying") return json({ error: "not_applying" }, 409);
    const offerId = String(body.offer_id ?? "");
    if (!UUID.test(offerId)) return json({ error: "invalid_input" }, 400);
    if (s.offer_id && s.offer_id !== offerId) return json({ error: "offer_mismatch" }, 409);
    const { data: offer } = await db.from("offers").select("id,tier,sub_account_id").eq("id", offerId).maybeSingle();
    if (!offer || offer.sub_account_id !== s.sub_account_id || offer.tier !== s.tier) return json({ error: "offer_not_found" }, 404);
    return save({
      decisions: { ...decisions, approval: { ...decisions.approval, status: "applied", offerId } },
      status: "completed", completed_at: new Date().toISOString(), result_offer_id: offerId, stage: "final",
    });
  }

  if (!AI_ACTIONS.includes(body.action)) return json({ error: "unknown_action" }, 400);
  const op = body.action as "understand" | "diagnose" | "strengthen" | "package" | "final_assessment";
  const c = await loadContext();
  if ("error" in c) return c.error;
  const { tier, design, bp, ecosystem } = c;

  const intake = op === "understand" && body.intake?.idea != null
    ? { ...(s.intake ?? {}), idea: String(body.intake.idea).trim().slice(0, 1500) } : (s.intake ?? {});
  if (s.mode === "new" && !String((intake as any).idea ?? "").trim() && op === "understand") return json({ error: "idea_required" }, 400);
  if (op === "diagnose" && !s.context_confirmed_at) return json({ error: "context_not_confirmed" }, 409);
  if (op === "strengthen" && !s.diagnosis) return json({ error: "diagnosis_required" }, 409);
  if (op === "package" && (!s.diagnosis || !strengthenComplete(decisions.strengthen))) return json({ error: "decisions_required" }, 409);
  if (op === "final_assessment" && (!decisions.package || !s.draft_design)) return json({ error: "package_required" }, 409);
  if (tier !== s.tier && op !== "understand") return json({ error: "category_changed" }, 409);

  const diagnosisFacts: Record<string, string> = s.diagnosis ? {
    diagnosis_weaknesses: (s.diagnosis.weaknesses ?? []).join(" | "),
    diagnosis_top_improvements: (s.diagnosis.topImprovements ?? []).join(" | "),
    diagnosis_criteria: (s.diagnosis.assessments ?? []).map((a: any) => `${a.criterionId}=${a.verdict}: ${a.reasoning}`).join(" | "),
  } : {};
  const extraFacts = op === "strengthen" ? diagnosisFacts
    : op === "package" ? { ...diagnosisFacts, ...strengthenFacts(decisions.strengthen) }
    : op === "final_assessment" ? { ...strengthenFacts(decisions.strengthen), before_scores: JSON.stringify(Object.fromEntries(Object.values(s.diagnosis?.profile?.dimensions ?? {}).map((d: any) => [d.dimension, d.score]))) }
    : {};
  const ctx = buildBuilderContext({ tier, mode: s.mode, blueprint: bp, design, intake, understanding: op === "understand" ? null : s.understanding, ecosystem, extraFacts });
  // Final assessment evaluates the proposed draft, not the saved offer.
  if (op === "final_assessment") ctx.design = s.draft_design;
  if (op === "package" && s.mode === "new") ctx.design = null;

  const ai = await runOfferOperation(op, ctx, { maxTokens: op === "package" ? 6000 : 3500 });
  if (!ai.ok) return json({ error: ai.error }, ai.status);
  const checked = validateOperationOutput(op, ai.raw);
  if (!checked.ok) { console.warn("offer-builder invalid", op, checked.errors.slice(0, 5)); return json({ error: "ai_invalid" }, 502); }

  if (op === "understand") {
    return save({ tier, intake, understanding: toUnderstanding(checked.value, s.understanding), context_confirmed_at: null, stage: "understand" });
  }
  if (op === "diagnose") {
    const diagnosis = toDiagnosis(checked.value, s.version);
    return save({ tier, diagnosis, stage: "diagnose", recommendations: diagnosis.topImprovements });
  }
  if (op === "strengthen") {
    const st = toStrengthen(checked.value, s.diagnosis, decisions.strengthen);
    if (!st.items.length) return json({ error: "ai_invalid" }, 502);
    return save({ decisions: { ...decisions, strengthen: st }, stage: "strengthen" });
  }
  if (op === "package") {
    const base = s.mode === "existing" ? design : null;
    const pk = toPackage(tier, base, checked.value, decisions.strengthen!.updatedAt);
    if (!pk.ok) { console.warn("offer-builder package rejected", JSON.stringify(pk.errors).slice(0, 400)); return json({ error: "ai_invalid" }, 502); }
    if (!pk.state.writes.length) return json({ error: "ai_invalid" }, 502);
    return save({ decisions: { ...decisions, package: pk.state, final: decisions.final ?? null }, draft_design: pk.draft, stage: "package" });
  }
  const fin = toFinal(checked.value, decisions.package!);
  return save({ decisions: { ...decisions, final: fin }, stage: "final" });
});
