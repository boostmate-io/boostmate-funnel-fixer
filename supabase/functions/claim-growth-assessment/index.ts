// Claims a public Growth Assessment (identified by claim_token) and links it
// to the authenticated user's active workspace. Runs with service-role so it
// can bypass the anon-only INSERT policy and set user_id / sub_account_id.
//
// Security model:
// - Verifies the caller's JWT (Bearer token) against Supabase Auth.
// - Requires an active membership for the target sub_account_id.
// - Requires the claim_token to be attached to an unclaimed public row.
// - After claim: deactivates any previously-active assessment in the workspace,
//   attaches user_id + sub_account_id, and clears claim_token.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller identity
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  let body: { claim_token?: string; sub_account_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const claim_token = String(body.claim_token ?? "").trim();
  const sub_account_id = String(body.sub_account_id ?? "").trim();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(claim_token) || !uuidRe.test(sub_account_id)) {
    return new Response(JSON.stringify({ error: "invalid_input" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Confirm caller has access to the workspace
  const { data: membership, error: memErr } = await admin
    .from("account_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("sub_account_id", sub_account_id)
    .limit(1)
    .maybeSingle();
  if (memErr || !membership) {
    return new Response(JSON.stringify({ error: "forbidden_workspace" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch the unclaimed assessment
  const { data: row, error: rowErr } = await admin
    .from("growth_assessments")
    .select("id, user_id, source")
    .eq("claim_token", claim_token)
    .maybeSingle();
  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (row.user_id) {
    return new Response(JSON.stringify({ error: "already_claimed" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Deactivate any previous active assessment in this workspace,
  // then attach this one. Uses service_role so immutability trigger allows it.
  const { error: deactErr } = await admin
    .from("growth_assessments")
    .update({ is_active: false })
    .eq("sub_account_id", sub_account_id)
    .eq("is_active", true);
  if (deactErr) {
    return new Response(JSON.stringify({ error: "deactivate_failed", detail: deactErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: updated, error: updErr } = await admin
    .from("growth_assessments")
    .update({
      user_id: userId,
      sub_account_id,
      claim_token: null,
      is_active: true,
    })
    .eq("id", row.id)
    .select("id")
    .single();
  if (updErr) {
    return new Response(JSON.stringify({ error: "claim_failed", detail: updErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, id: updated.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
