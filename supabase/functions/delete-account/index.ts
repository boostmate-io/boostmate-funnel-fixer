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

    // Create a client with the user's token to get their ID
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to delete all user data and then the auth user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete in order (respecting dependencies)
    const userId = user.id;

    // Delete funnel step metrics (via entries)
    await adminClient.from("funnel_step_metrics").delete().in(
      "entry_id",
      (await adminClient.from("funnel_analytics_entries").select("id").eq("user_id", userId)).data?.map((e: any) => e.id) || []
    );

    // Delete remaining tables
    await adminClient.from("funnel_analytics_entries").delete().eq("user_id", userId);
    await adminClient.from("asset_sections").delete().in(
      "asset_id",
      (await adminClient.from("assets").select("id").eq("user_id", userId)).data?.map((a: any) => a.id) || []
    );
    await adminClient.from("assets").delete().eq("user_id", userId);
    await adminClient.from("funnels").delete().eq("user_id", userId);
    await adminClient.from("audits").delete().eq("user_id", userId);
    await adminClient.from("projects").delete().eq("user_id", userId);
    await adminClient.from("agency_clients").delete().eq("agency_user_id", userId);
    await adminClient.from("agency_clients").delete().eq("client_user_id", userId);
    await adminClient.from("agency_invites").delete().eq("agency_user_id", userId);
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
