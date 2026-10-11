// =============================================================================
// Coach workspace authorization (server-side). Every Coach request must come
// from a member of the conversation's workspace or a trusted app admin —
// conversation ownership and browser-supplied workspace IDs are not enough.
// Uses the existing security-definer checks (is_sub_account_member /
// is_app_admin), mirroring the RLS admin pattern.
// =============================================================================

export type WorkspaceAccess =
  | { ok: true; via: "member" | "admin" }
  | { ok: false; status: 401 | 403; error: string };

export interface AccessChecks {
  isMember: boolean;
  isAdmin: boolean;
}

/** Pure decision: membership first, then admin; anything else is rejected. */
export function decideWorkspaceAccess(
  userId: string | null | undefined,
  subAccountId: string | null | undefined,
  checks: AccessChecks | null,
): WorkspaceAccess {
  if (!userId) return { ok: false, status: 401, error: "Invalid session" };
  if (!subAccountId || !checks) return { ok: false, status: 403, error: "Forbidden" };
  if (checks.isMember) return { ok: true, via: "member" };
  if (checks.isAdmin) return { ok: true, via: "admin" };
  return { ok: false, status: 403, error: "Forbidden" };
}

interface RpcClient {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
}

/** Load the trusted checks and decide. Errors fail closed. */
export async function checkWorkspaceAccess(
  client: RpcClient,
  userId: string,
  subAccountId: string,
): Promise<WorkspaceAccess> {
  try {
    const [member, admin] = await Promise.all([
      client.rpc("is_sub_account_member", { _user_id: userId, _sub_id: subAccountId }),
      client.rpc("is_app_admin", { _user_id: userId }),
    ]);
    if (member.error && admin.error) return decideWorkspaceAccess(userId, subAccountId, null);
    return decideWorkspaceAccess(userId, subAccountId, {
      isMember: !member.error && member.data === true,
      isAdmin: !admin.error && admin.data === true,
    });
  } catch {
    return decideWorkspaceAccess(userId, subAccountId, null);
  }
}
