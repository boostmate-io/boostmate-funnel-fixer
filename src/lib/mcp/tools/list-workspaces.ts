import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_workspaces",
  title: "List workspaces",
  description: "List the Boostmate workspaces (sub-accounts) the signed-in user has access to.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx);
    const { data: memberships, error: mErr } = await supabase
      .from("account_memberships")
      .select("main_account_id, sub_account_id, role")
      .eq("user_id", ctx.getUserId());
    if (mErr) return { content: [{ type: "text", text: mErr.message }], isError: true };

    const mainIds = [...new Set((memberships ?? []).map((m) => m.main_account_id).filter(Boolean))];
    const [{ data: mains }, { data: subs }] = await Promise.all([
      supabase.from("main_accounts").select("id, name, type").in("id", mainIds.length ? mainIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("sub_accounts").select("id, main_account_id, name, is_default").in("main_account_id", mainIds.length ? mainIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const result = {
      workspaces: (subs ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        is_default: s.is_default,
        main_account: mains?.find((m) => m.id === s.main_account_id) ?? null,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
