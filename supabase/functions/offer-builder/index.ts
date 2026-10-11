// Authenticated Irresistible Offer Builder (Stages A–B). All DB access uses
// the caller's JWT so RLS applies; the offer category always comes from the
// saved offer row. Never writes offers, relationships, funnels or Blueprints.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isOfferTier } from "../_shared/offerAiPolicy.ts";
import { validateOperationOutput } from "../_shared/offerIntelligence/operations.ts";
import { runOfferOperation } from "../_shared/offerIntelligence/aiCall.ts";
import {
  buildBuilderContext, canEnterStage, sanitizeCorrections, toDiagnosis, toUnderstanding, type BuilderStage,
} from "../_shared/offerIntelligence/builderSession.ts";
import { summarizeRelatedOffers, renderRelatedOffersSection } from "../_shared/offerContext.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_COLS = "*";

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
  if (body?.action === "start") {
    const sub = String(body.sub_account_id ?? "");
    if (!UUID.test(sub)) return json({ error: "invalid_input" }, 400);
    if (!(await access(sub))) return json({ error: "forbidden_workspace" }, 403);
    if (body.offer_id) {
      const offerId = String(body.offer_id);
      if (!UUID.test(offerId)) return json({ error: "invalid_input" }, 400);
      const { data: offer } = await db.from("offers").select("id,tier,sub_account_id").eq("id", offerId).maybeSingle();
      if (!offer || offer.sub_account_id !== sub) return json({ error: "offer_not_found" }, 404);
      if (!isOfferTier(offer.tier)) return json({ error: "unknown_tier" }, 400);
      const { data: existing } = await db.from("offer_builder_sessions").select(SESSION_COLS)
        .eq("offer_id", offerId).eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        // Resume; re-align the category with the saved offer if it changed.
        if (existing.tier !== offer.tier) {
          const { data: fixed } = await db.from("offer_builder_sessions").update({ tier: offer.tier, understanding: null, context_confirmed_at: null, diagnosis: null, stage: "understand", version: existing.version + 1 })
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
    const { data: created, error } = await db.from("offer_builder_sessions")
      .insert({ sub_account_id: sub, user_id: userId, tier: body.tier, mode: "new" }).select(SESSION_COLS).single();
    return error ? json({ error: "create_failed" }, 500) : json({ session: created, resumed: false });
  }

  // ---- session-scoped actions ----------------------------------------------
  const sessionId = String(body?.session_id ?? "");
  const version = Number(body?.version);
  if (!UUID.test(sessionId) || !Number.isInteger(version)) return json({ error: "invalid_input" }, 400);
  const { data: s } = await db.from("offer_builder_sessions").select(SESSION_COLS).eq("id", sessionId).maybeSingle();
  if (!s) return json({ error: "not_found" }, 404);
  if (!(await access(s.sub_account_id))) return json({ error: "forbidden_workspace" }, 403);
  if (s.status !== "active") return json({ error: "session_closed" }, 409);
  if (s.version !== version) return json({ error: "conflict", session: s }, 409);

  const save = async (patch: Record<string, unknown>) => {
    const { data } = await db.from("offer_builder_sessions").update({ ...patch, version: s.version + 1 })
      .eq("id", s.id).eq("version", s.version).select(SESSION_COLS).maybeSingle();
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
    if (body.stage) {
      const next = { ...s, ...patch } as any;
      if (!canEnterStage(next, body.stage as BuilderStage)) return json({ error: "stage_unavailable" }, 409);
      patch.stage = body.stage;
    }
    return save(patch);
  }

  if (body.action !== "understand" && body.action !== "diagnose") return json({ error: "unknown_action" }, 400);

  // Authoritative context (category from the saved offer when present).
  let tier = s.tier, design: Record<string, any> | null = null;
  const { data: bp } = await db.from("business_blueprints").select("id,customer_clarity,brand_strategy,proof_authority,growth_system,offer_stack").eq("sub_account_id", s.sub_account_id).maybeSingle();
  if (s.offer_id) {
    const { data: offer } = await db.from("offers").select("id,tier,source,data,sub_account_id").eq("id", s.offer_id).maybeSingle();
    if (!offer || offer.sub_account_id !== s.sub_account_id) return json({ error: "offer_not_found" }, 404);
    tier = offer.tier;
    design = offer.source === "blueprint_core" ? (bp?.offer_stack ?? null) : ((offer.data as any)?.design ?? null);
  }
  if (!isOfferTier(tier)) return json({ error: "unknown_tier" }, 400);
  let ecosystem: string | null = null;
  if (bp?.id) {
    const { data: rows } = await db.from("offers").select("id,name,tier,source,sub_account_id,data").eq("blueprint_id", bp.id).eq("sub_account_id", s.sub_account_id);
    ecosystem = renderRelatedOffersSection(summarizeRelatedOffers((rows ?? []) as any, s.offer_id ?? null, bp.offer_stack), tier);
  }
  const intake = body.action === "understand" && body.intake?.idea != null
    ? { ...(s.intake ?? {}), idea: String(body.intake.idea).trim().slice(0, 1500) } : (s.intake ?? {});
  if (s.mode === "new" && !String((intake as any).idea ?? "").trim() && body.action === "understand") return json({ error: "idea_required" }, 400);

  if (body.action === "diagnose" && !s.context_confirmed_at) return json({ error: "context_not_confirmed" }, 409);
  const ctx = buildBuilderContext({ tier, mode: s.mode, blueprint: bp, design, intake, understanding: body.action === "diagnose" ? s.understanding : null, ecosystem });
  const ai = await runOfferOperation(body.action, ctx);
  if (!ai.ok) return json({ error: ai.error }, ai.status);
  const checked = validateOperationOutput(body.action, ai.raw);
  if (!checked.ok) { console.warn("offer-builder invalid", body.action, checked.errors.slice(0, 5)); return json({ error: "ai_invalid" }, 502); }

  if (body.action === "understand") {
    return save({ tier, intake, understanding: toUnderstanding(checked.value, s.understanding), context_confirmed_at: null, stage: "understand" });
  }
  const diagnosis = toDiagnosis(checked.value, s.version);
  return save({ tier, diagnosis, stage: "diagnose", recommendations: diagnosis.topImprovements });
});
