import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "@/integrations/supabase/client";

export interface FrameworkLike {
  id: string;
  name?: string;
  type?: string;
  component_slugs?: any;
}

export interface CreateDocumentArgs {
  client?: SupabaseClient<any, any, any>;
  userId: string;
  subAccountId: string;
  /** Framework object (preferred) or just an id — slugs are fetched when missing. */
  framework: FrameworkLike | string;
  /** Document type; falls back to the framework type. */
  type?: string;
  /** Base name — a " (2)", " (3)" suffix is added when it already exists. */
  name: string;
  funnelId?: string | null;
  funnelNodeId?: string | null;
  contextOfferId?: string | null;
}

export function slugsOf(componentSlugs: any): string[] {
  if (Array.isArray(componentSlugs)) return componentSlugs as string[];
  return (componentSlugs?.slugs as string[]) || [];
}

/** Returns `base`, or `base (2)`, `base (3)`… when the name is already taken. */
async function uniqueName(
  sb: SupabaseClient<any, any, any>,
  subAccountId: string,
  base: string,
): Promise<string> {
  const { data } = await sb
    .from("copy_documents")
    .select("name")
    .eq("sub_account_id", subAccountId)
    .like("name", `${base}%`);
  const taken = new Set(((data || []) as any[]).map((d) => d.name));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

/**
 * Creates a copy document plus its framework component rows.
 * Single source of truth for document creation (Copy module + funnel panels).
 */
export async function createLinkedDocument(args: CreateDocumentArgs): Promise<{ id: string; name: string; type: string; status: string; framework_id: string | null; updated_at: string }> {
  const sb = (args.client || defaultClient) as SupabaseClient<any, any, any>;

  let framework: FrameworkLike | null =
    typeof args.framework === "string" ? null : args.framework;
  if (!framework) {
    const { data } = await sb
      .from("copy_frameworks")
      .select("id, name, type, component_slugs")
      .eq("id", args.framework as string)
      .maybeSingle();
    framework = (data as any) || null;
  }
  if (!framework) throw new Error("Framework not found");

  const docType = args.type || framework.type || "sales_copy";
  const name = await uniqueName(sb, args.subAccountId, args.name);

  const { data, error } = await sb
    .from("copy_documents")
    .insert({
      user_id: args.userId,
      sub_account_id: args.subAccountId,
      name,
      type: docType,
      framework_id: framework.id,
      status: "draft",
      funnel_id: args.funnelId ?? null,
      funnel_node_id: args.funnelNodeId ?? null,
      ...(args.contextOfferId
        ? { context_type: "offer", context_offer_id: args.contextOfferId }
        : {}),
    } as any)
    .select("id, name, type, status, framework_id, updated_at")
    .single();
  if (error || !data) throw error || new Error("Create failed");

  const slugs = slugsOf(framework.component_slugs);
  if (slugs.length > 0) {
    const rows = slugs.map((slug, i) => ({
      document_id: (data as any).id,
      component_slug: slug,
      sort_order: i,
      inputs: {},
      outputs: {},
      is_generated: false,
    }));
    await sb.from("copy_document_components").insert(rows as any);
  }

  return data as any;
}
