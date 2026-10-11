// Claims a public Offer Generator result for the signed-in user's workspace:
// verifies JWT + workspace membership + unexpired/unclaimed token, then adds a
// NEW additional Core Offer (never touches the Primary Core Offer or existing
// offers). The full analysis stays on the generation row for the Builder.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { claimedOfferRow } from "../_shared/offerIntelligence/publicResult.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const authClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: u } = await authClient.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const token = String(body?.claim_token ?? ""), sub = String(body?.sub_account_id ?? "");
  if (!UUID.test(token) || !UUID.test(sub)) return json({ error: "invalid_input" }, 400);

  const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isMember } = await admin.rpc("is_sub_account_member", { _user_id: userId, _sub_id: sub });
  if (!isMember) return json({ error: "forbidden_workspace" }, 403);

  const { data: gen } = await admin.from("public_offer_generations")
    .select("id,status,result,expires_at,claimed_at,claimed_offer_id,claimed_sub_account_id").eq("claim_token", token).maybeSingle();
  if (!gen || gen.status !== "complete" || !gen.result) return json({ error: "not_found" }, 404);
  if (gen.claimed_at) {
    // Idempotent for the same workspace (e.g. a reload); never re-claimable elsewhere.
    return gen.claimed_sub_account_id === sub ? json({ offer_id: gen.claimed_offer_id, already: true }) : json({ error: "already_claimed" }, 409);
  }
  if (new Date(gen.expires_at) < new Date()) return json({ error: "expired" }, 410);

  // Lock the row first (only one claim wins).
  const { data: locked } = await admin.from("public_offer_generations")
    .update({ claimed_at: new Date().toISOString(), claimed_by: userId, claimed_sub_account_id: sub })
    .eq("id", gen.id).is("claimed_at", null).select("id").maybeSingle();
  if (!locked) return json({ error: "already_claimed" }, 409);

  let { data: bp } = await admin.from("business_blueprints").select("id").eq("sub_account_id", sub).maybeSingle();
  if (!bp) {
    const { data: created } = await admin.from("business_blueprints").insert({ sub_account_id: sub, user_id: userId }).select("id").single();
    bp = created;
  }
  if (!bp) return json({ error: "claim_failed" }, 500);
  const { data: last } = await admin.from("offers").select("sort_order").eq("blueprint_id", bp.id).eq("tier", "core")
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const values = claimedOfferRow(gen.result as any, gen.id);
  const { data: offer, error } = await admin.from("offers").insert({
    ...values, tier: "core", source: "blueprint_manual", blueprint_id: bp.id, sub_account_id: sub, user_id: userId,
    sort_order: (last?.sort_order ?? 0) + 1,
  }).select("id").single();
  if (error || !offer) {
    await admin.from("public_offer_generations").update({ claimed_at: null, claimed_by: null, claimed_sub_account_id: null }).eq("id", gen.id);
    return json({ error: "claim_failed" }, 500);
  }
  await admin.from("public_offer_generations").update({ claimed_offer_id: offer.id }).eq("id", gen.id);
  return json({ offer_id: offer.id });
});
