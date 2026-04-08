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

    let targetUserId = callerUser.id;
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (body?.target_user_id && body.target_user_id !== callerUser.id) {
      const { data: isAdmin } = await adminClient.rpc("is_app_admin", { _user_id: callerUser.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = String(body.target_user_id);
    }

    const userId = targetUserId;

    const deleteWhereIn = async (table: string, column: string, values: string[]) => {
      if (values.length === 0) return;
      const { error } = await adminClient.from(table).delete().in(column, values);
      if (error) throw error;
    };

    const { data: ownedMainMemberships } = await adminClient
      .from("account_memberships")
      .select("main_account_id")
      .eq("user_id", userId)
      .is("sub_account_id", null)
      .eq("role", "owner");

    const ownedMainIds = Array.from(new Set((ownedMainMemberships || []).map((row: any) => row.main_account_id)));

    let ownedSubIds: string[] = [];
    if (ownedMainIds.length > 0) {
      const { data: ownedSubs } = await adminClient
        .from("sub_accounts")
        .select("id")
        .in("main_account_id", ownedMainIds);
      ownedSubIds = Array.from(new Set((ownedSubs || []).map((row: any) => row.id)));
    }

    const analyticsEntryIds = new Set<string>();
    const { data: userAnalyticsEntries } = await adminClient
      .from("funnel_analytics_entries")
      .select("id")
      .eq("user_id", userId);
    (userAnalyticsEntries || []).forEach((row: any) => analyticsEntryIds.add(row.id));

    if (ownedSubIds.length > 0) {
      const { data: accountAnalyticsEntries } = await adminClient
        .from("funnel_analytics_entries")
        .select("id")
        .in("sub_account_id", ownedSubIds);
      (accountAnalyticsEntries || []).forEach((row: any) => analyticsEntryIds.add(row.id));
    }

    const assetIds = new Set<string>();
    const { data: userAssets } = await adminClient.from("assets").select("id").eq("user_id", userId);
    (userAssets || []).forEach((row: any) => assetIds.add(row.id));

    if (ownedSubIds.length > 0) {
      const { data: accountAssets } = await adminClient.from("assets").select("id").in("sub_account_id", ownedSubIds);
      (accountAssets || []).forEach((row: any) => assetIds.add(row.id));
    }

    await deleteWhereIn("funnel_step_metrics", "entry_id", Array.from(analyticsEntryIds));
    await deleteWhereIn("asset_sections", "asset_id", Array.from(assetIds));

    await adminClient.from("funnel_analytics_entries").delete().eq("user_id", userId);
    if (ownedSubIds.length > 0) {
      await deleteWhereIn("funnel_analytics_entries", "sub_account_id", ownedSubIds);
    }

    await adminClient.from("assets").delete().eq("user_id", userId);
    await adminClient.from("funnel_briefs").delete().eq("user_id", userId);
    await adminClient.from("offers").delete().eq("user_id", userId);
    await adminClient.from("funnels").delete().eq("user_id", userId);
    await adminClient.from("audits").delete().eq("user_id", userId);
    await adminClient.from("projects").delete().eq("user_id", userId);

    if (ownedSubIds.length > 0) {
      await deleteWhereIn("funnel_briefs", "sub_account_id", ownedSubIds);
      await deleteWhereIn("offers", "sub_account_id", ownedSubIds);
      await deleteWhereIn("funnels", "sub_account_id", ownedSubIds);
      await deleteWhereIn("audits", "sub_account_id", ownedSubIds);
      await deleteWhereIn("assets", "sub_account_id", ownedSubIds);
      await deleteWhereIn("account_invites", "sub_account_id", ownedSubIds);
    }

    await adminClient.from("agency_clients").delete().eq("agency_user_id", userId);
    await adminClient.from("agency_clients").delete().eq("client_user_id", userId);
    await adminClient.from("agency_invites").delete().eq("agency_user_id", userId);
    await adminClient.from("client_account_invites").delete().eq("agency_user_id", userId);
    await adminClient.from("client_accounts").delete().eq("agency_user_id", userId);

    await adminClient.from("account_memberships").delete().eq("user_id", userId);
    if (ownedMainIds.length > 0) {
      await deleteWhereIn("account_memberships", "main_account_id", ownedMainIds);
      await deleteWhereIn("account_invites", "main_account_id", ownedMainIds);
      await deleteWhereIn("sub_accounts", "main_account_id", ownedMainIds);
      await deleteWhereIn("main_accounts", "id", ownedMainIds);
    }

    await adminClient.from("account_invites").delete().eq("invited_by", userId);
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("id", userId);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError && !deleteError.message.includes("User not found")) {
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
