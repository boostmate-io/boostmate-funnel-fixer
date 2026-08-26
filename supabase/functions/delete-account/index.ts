import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRACE_DAYS = 30;
const BAN_DURATION = "876000h"; // ~100 years; lifted on restore

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Hard-deletes one user's data. Honors subaccount_action:
// 'transfer' keeps owned main/sub accounts alive by promoting another member;
// 'delete_all' removes the owned accounts and all their data.
async function hardDeleteUser(adminClient: any, userId: string, subaccountAction: string) {
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

  let ownedMainIds = Array.from(new Set((ownedMainMemberships || []).map((row: any) => row.main_account_id)));

  if (subaccountAction === "transfer" && ownedMainIds.length > 0) {
    const kept: string[] = [];
    for (const mainId of ownedMainIds) {
      // Promote another main-level member (prefer admin, then member) to owner.
      const { data: others } = await adminClient
        .from("account_memberships")
        .select("id, user_id, role")
        .eq("main_account_id", mainId)
        .is("sub_account_id", null)
        .neq("user_id", userId)
        .order("role", { ascending: true }); // 'admin' < 'member' alphabetically

      const candidate = (others || [])[0];
      if (candidate) {
        await adminClient
          .from("account_memberships")
          .update({ role: "owner" })
          .eq("id", candidate.id);
        kept.push(mainId);
      }
      // No other member: nothing to transfer to — the account is deleted below.
    }
    ownedMainIds = ownedMainIds.filter((id: string) => !kept.includes(id));
  }

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

  await deleteWhereIn("funnel_step_metrics", "entry_id", Array.from(analyticsEntryIds));

  await adminClient.from("funnel_analytics_entries").delete().eq("user_id", userId);
  if (ownedSubIds.length > 0) {
    await deleteWhereIn("funnel_analytics_entries", "sub_account_id", ownedSubIds);
  }

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
  await adminClient.from("account_deletion_requests").delete().eq("user_id", userId);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError && !deleteError.message.includes("User not found")) {
    throw deleteError;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = typeof body?.action === "string" ? body.action : "request";

    // ---- Purge (cron only, service role) ----
    if (action === "purge") {
      if (authHeader.replace("Bearer ", "").trim() !== serviceRoleKey) {
        return json({ error: "Not authorized" }, 403);
      }
      const { data: due } = await adminClient
        .from("account_deletion_requests")
        .select("user_id, subaccount_action")
        .lte("purge_at", new Date().toISOString());

      const results: Array<{ user_id: string; ok: boolean; error?: string }> = [];
      for (const row of due || []) {
        try {
          await hardDeleteUser(adminClient, row.user_id, row.subaccount_action);
          results.push({ user_id: row.user_id, ok: true });
        } catch (err) {
          results.push({ user_id: row.user_id, ok: false, error: (err as Error).message });
        }
      }
      return json({ success: true, purged: results });
    }

    // ---- Remaining actions require an authenticated caller ----
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callerUser) {
      return json({ error: "Invalid session" }, 401);
    }

    let targetUserId = callerUser.id;
    if (body?.target_user_id && body.target_user_id !== callerUser.id) {
      const { data: isAdmin } = await adminClient.rpc("is_app_admin", { _user_id: callerUser.id });
      if (!isAdmin) {
        return json({ error: "Not authorized" }, 403);
      }
      targetUserId = String(body.target_user_id);
    }

    // ---- Restore (cancel a scheduled deletion; admin only) ----
    if (action === "restore") {
      const { data: isAdmin } = await adminClient.rpc("is_app_admin", { _user_id: callerUser.id });
      if (!isAdmin) {
        return json({ error: "Not authorized" }, 403);
      }
      const { data: requestRow } = await adminClient
        .from("account_deletion_requests")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (!requestRow) {
        return json({ error: "no_pending_request" }, 404);
      }
      await adminClient.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
      await adminClient.from("account_deletion_requests").delete().eq("id", requestRow.id);
      return json({ success: true, restored: true });
    }

    // ---- Request deletion (soft delete with grace period) ----
    const userId = targetUserId;

    // Guard: never delete the last app admin.
    const { data: targetIsAdmin } = await adminClient.rpc("is_app_admin", { _user_id: userId });
    if (targetIsAdmin) {
      const { count: adminCount } = await adminClient
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((adminCount ?? 0) <= 1) {
        return json({ error: "last_admin" }, 400);
      }
    }

    // Guard: one pending request per user.
    const { data: existing } = await adminClient
      .from("account_deletion_requests")
      .select("id, purge_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return json({ success: true, already_scheduled: true, purge_at: existing.purge_at });
    }

    // Determine owned main accounts and whether they have sub-accounts or
    // other members. If so, the caller must choose what happens to them.
    const { data: ownedMainMemberships } = await adminClient
      .from("account_memberships")
      .select("main_account_id")
      .eq("user_id", userId)
      .is("sub_account_id", null)
      .eq("role", "owner");
    const ownedMainIds = Array.from(new Set((ownedMainMemberships || []).map((r: any) => r.main_account_id)));

    let hasSubAccounts = false;
    let hasOtherMembers = false;
    if (ownedMainIds.length > 0) {
      const { count: subCount } = await adminClient
        .from("sub_accounts")
        .select("id", { count: "exact", head: true })
        .in("main_account_id", ownedMainIds);
      hasSubAccounts = (subCount ?? 0) > 0;

      const { count: otherCount } = await adminClient
        .from("account_memberships")
        .select("id", { count: "exact", head: true })
        .in("main_account_id", ownedMainIds)
        .neq("user_id", userId);
      hasOtherMembers = (otherCount ?? 0) > 0;
    }

    let subaccountAction = "delete_all";
    if (hasSubAccounts || hasOtherMembers) {
      const requested = typeof body?.subaccount_action === "string" ? body.subaccount_action : null;
      if (requested !== "delete_all" && requested !== "transfer") {
        return json({
          error: "subaccount_action_required",
          has_sub_accounts: hasSubAccounts,
          has_other_members: hasOtherMembers,
          transfer_possible: hasOtherMembers,
        }, 400);
      }
      if (requested === "transfer" && !hasOtherMembers) {
        return json({ error: "transfer_not_possible" }, 400);
      }
      subaccountAction = requested;
    }

    // Soft delete: ban the account and schedule the purge.
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: BAN_DURATION,
    });
    if (banError) {
      return json({ error: banError.message }, 500);
    }

    const purgeAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await adminClient.from("account_deletion_requests").insert({
      user_id: userId,
      requested_by: callerUser.id,
      subaccount_action: subaccountAction,
      purge_at: purgeAt,
    });
    if (insertError) {
      // Roll back the ban so the user is not locked out without a request row.
      await adminClient.auth.admin.updateUserById(userId, { ban_duration: "none" });
      return json({ error: insertError.message }, 500);
    }

    return json({ success: true, purge_at: purgeAt, grace_days: GRACE_DAYS });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
