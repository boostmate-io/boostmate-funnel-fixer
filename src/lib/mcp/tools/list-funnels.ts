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
  name: "list_funnels",
  title: "List funnels",
  description: "List funnels in a Boostmate workspace (sub-account). Use list_workspaces to discover workspace IDs.",
  inputSchema: {
    sub_account_id: z.string().uuid().describe("Boostmate workspace (sub_account) ID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ sub_account_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx)
      .from("funnels")
      .select("id, name, strategy, created_at, updated_at")
      .eq("sub_account_id", sub_account_id)
      .order("updated_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { funnels: data ?? [] },
    };
  },
});
