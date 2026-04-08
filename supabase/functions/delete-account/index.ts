import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if a target_user_id was provided (admin deleting another user)
    let targetUserId = callerUser.id;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body = self-delete
    }

    if (body?.target_user_id && body.target_user_id !== callerUser.id) {
      // Verify caller is app admin
      const { data: isAdmin } = await adminClient.rpc("is_app_admin", { _user_id: callerUser.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = body.target_user_id;
    }

    // Delete in order (respecting dependencies)
    const userId = targetUserId;

    // Delete funnel step metrics (via entries)
    await adminClient.from("funnel_step_metrics").delete().in(
      "entry_id",
      (await adminClient.from("funnel_analytics_entries").select("id").eq("user_id", userId)).data?.map((e: any) => e.id) || []
    );

    await adminClient.from("funnel_analytics_entries").delete().eq("user_id", userId);
    await adminClient.from("asset_sections").delete().in(
      "asset_id",
      (await adminClient.from("assets").select("id").eq("user_id", userId)).data?.map((a: any) => a.id) || []
    );
    await adminClient.from("assets").delete().eq("user_id", userId);
    await adminClient.from("funnel_briefs").delete().eq("user_id", userId);
    await adminClient.from("offers").delete().eq("user_id", userId);
    await adminClient.from("funnels").delete().eq("user_id", userId);
    await adminClient.from("audits").delete().eq("user_id", userId);
    await adminClient.from("projects").delete().eq("user_id", userId);
    await adminClient.from("agency_clients").delete().eq("agency_user_id", userId);
    await adminClient.from("agency_clients").delete().eq("client_user_id", userId);
    await adminClient.from("agency_invites").delete().eq("agency_user_id", userId);
    await adminClient.from("account_memberships").delete().eq("user_id", userId);
    await adminClient.from("account_invites").delete().eq("invited_by", userId);
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("id", userId);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
