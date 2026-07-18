// Runs AI enrichment on a Growth Assessment row.
// Accepts either { assessment_id, claim_token } (public) or { assessment_id } from an authenticated caller.
// Writes ai_result + ai_confidence to the row using service-role.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

  let body: { assessment_id?: string; claim_token?: string; catalog?: string; language?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const assessment_id = String(body.assessment_id ?? "").trim();
  const claim_token   = body.claim_token ? String(body.claim_token).trim() : null;
  const catalog       = String(body.catalog ?? "").trim();
  const language      = String(body.language ?? "en");

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(assessment_id)) return json({ error: "invalid_input" }, 400);
  if (!catalog) return json({ error: "missing_catalog" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Authorize: either a valid claim_token match, or an authenticated user with workspace access.
  const { data: row, error: rowErr } = await admin
    .from("growth_assessments")
    .select("id, user_id, sub_account_id, claim_token, answers, stage_scores, gate_results, computed_stage")
    .eq("id", assessment_id)
    .maybeSingle();
  if (rowErr || !row) return json({ error: "not_found" }, 404);

  let authorized = false;
  if (claim_token && row.claim_token && claim_token === row.claim_token) {
    authorized = true;
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (jwt) {
      const authClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });
      const { data: userData } = await authClient.auth.getUser();
      const uid = userData?.user?.id;
      if (uid && row.sub_account_id) {
        const { data: mem } = await admin
          .from("account_memberships").select("id")
          .eq("user_id", uid).eq("sub_account_id", row.sub_account_id).limit(1).maybeSingle();
        authorized = !!mem;
      }
    }
  }
  if (!authorized) return json({ error: "forbidden" }, 403);

  // Delegate the model call to execute-ai-action for consistency (loads instruction blocks, model config).
  const inputs = {
    computed_stage: row.computed_stage,
    stage_scores: JSON.stringify(row.stage_scores),
    gate_results: JSON.stringify(row.gate_results),
    answers: JSON.stringify(row.answers),
    lead_sources: JSON.stringify((row.answers as any)?.q6 ?? []),
    testimonials: String((row.answers as any)?.q3 ?? "unknown"),
    language,
    growth_systems_catalog: catalog,
  };

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/execute-ai-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ slug: "growth_assessment_analysis", inputs }),
  });
  const raw = await resp.text();
  if (!resp.ok) {
    return json({ error: "ai_failed", status: resp.status, detail: raw.slice(0, 500) }, 502);
  }

  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

  // The execute-ai-action response wraps the model output under `data` or `result`
  // depending on version — accept either shape.
  const modelOut = parsed?.data ?? parsed?.result ?? parsed?.output ?? parsed;

  const ai_result = {
    next_priorities: Array.isArray(modelOut?.next_priorities) ? modelOut.next_priorities : [],
    recommended_growth_system: Array.isArray(modelOut?.recommended_growth_system)
      ? modelOut.recommended_growth_system[0]
      : modelOut?.recommended_growth_system,
    confidence: modelOut?.confidence,
  };

  const { error: writeErr } = await admin
    .from("growth_assessments")
    .update({ ai_result, ai_confidence: ai_result.confidence ?? null })
    .eq("id", assessment_id);
  if (writeErr) return json({ error: "persist_failed", detail: writeErr.message }, 500);

  return json({ ok: true, ai_result });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
