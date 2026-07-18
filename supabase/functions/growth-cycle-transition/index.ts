// Growth Roadmap V2 — atomic cycle transition service.
//
// Actions:
//   - start_initial_cycle   { sub_account_id, stage, reason? }
//   - advance_stage         { sub_account_id, from_stage?, to_stage, assessment_id?, reason? }
//   - restart_cycle         { sub_account_id, stage, expected_cycle_id, assessment_id?, reason? }
//   - complete_terminal     { sub_account_id, assessment_id?, reason? }
//
// All mutations go through the SECURITY DEFINER RPC `growth_cycle_transition`,
// which runs in a single Postgres transaction. This function only handles
// auth, validation, and shape.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const STAGES = ["validate", "attract", "optimize", "scale", "systemize"] as const;

const BaseSchema = z.object({
  sub_account_id: z.string().uuid(),
  reason: z.string().max(120).optional(),
});

const ActionSchema = z.discriminatedUnion("action", [
  BaseSchema.extend({
    action: z.literal("start_initial_cycle"),
    stage: z.enum(STAGES),
  }),
  BaseSchema.extend({
    action: z.literal("advance_stage"),
    from_stage: z.enum(STAGES).optional(),
    to_stage: z.enum(STAGES),
    assessment_id: z.string().uuid().optional(),
  }),
  BaseSchema.extend({
    action: z.literal("restart_cycle"),
    stage: z.enum(STAGES),
    expected_cycle_id: z.string().uuid(),
    assessment_id: z.string().uuid().optional(),
  }),
  BaseSchema.extend({
    action: z.literal("complete_terminal"),
    assessment_id: z.string().uuid().optional(),
  }),
  BaseSchema.extend({
    action: z.literal("attest_milestone"),
    expected_cycle_id: z.string().uuid(),
  }),
  BaseSchema.extend({
    action: z.literal("clear_milestone"),
    expected_cycle_id: z.string().uuid(),
  }),
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate the JWT and identify the caller.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await authClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return json(401, { error: "unauthorized" });
  }
  const userId = claims.claims.sub as string;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "invalid_input", details: parsed.error.flatten() });
  }
  const input = parsed.data;

  // Membership check (belt-and-suspenders — the RPC also enforces it, but we
  // want a clean 403 before we spend a round-trip).
  const service = createClient(supabaseUrl, serviceKey);
  const { data: member, error: memberErr } = await service
    .from("account_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("sub_account_id", input.sub_account_id)
    .limit(1)
    .maybeSingle();
  if (memberErr) return json(500, { error: "membership_check_failed" });
  if (!member) return json(403, { error: "not_a_member" });

  // Dispatch to atomic RPC.
  const rpcArgs: Record<string, unknown> = {
    _sub_account_id: input.sub_account_id,
    _action: input.action,
    _reason: input.reason ?? null,
  };
  switch (input.action) {
    case "start_initial_cycle":
      rpcArgs._stage = input.stage;
      break;
    case "advance_stage":
      rpcArgs._from_stage = input.from_stage ?? null;
      rpcArgs._to_stage = input.to_stage;
      rpcArgs._assessment_id = input.assessment_id ?? null;
      break;
    case "restart_cycle":
      rpcArgs._stage = input.stage;
      rpcArgs._expected_cycle_id = input.expected_cycle_id;
      rpcArgs._assessment_id = input.assessment_id ?? null;
      break;
    case "complete_terminal":
      rpcArgs._assessment_id = input.assessment_id ?? null;
      break;
  }

  const { data, error } = await service.rpc("growth_cycle_transition", rpcArgs);
  if (error) {
    // Stale cycle id is a client-recoverable conflict.
    if (error.message?.includes("stale_cycle_id")) {
      return json(409, { error: "stale_cycle_id" });
    }
    console.error("growth_cycle_transition error", error);
    return json(500, { error: "transition_failed", details: error.message });
  }

  return json(200, data);
});
