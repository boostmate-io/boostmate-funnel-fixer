import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolveDocumentThumbnails } from "@/lib/copy/documentThumbnail";
import LinkedDocumentsGrid, { LinkedDocument, FrameworkInfo } from "./LinkedDocumentsGrid";

interface NodeLinkedDocumentsProps {
  funnelNodeId: string;
  funnelId?: string | null;
  subAccountId?: string | null;
  userId?: string | null;
  linkedOfferId?: string | null;
  defaultFrameworkId?: string | null;
  nodeLabel?: string;
  funnelName?: string;
  readOnly?: boolean;
  onOpenDocument?: (id: string) => void;
  /** Optional Supabase client override — pass `publicSupabase` on shared/read-only views. */
  client?: SupabaseClient<any, any, any>;
}

interface CopyFrameworkRow {
  id: string;
  name: string;
  type: string;
  component_slugs: any;
}

/**
 * Fetches and renders all Copy Documents linked to a funnel node
 * (`copy_documents.funnel_node_id`) as a card grid.
 *
 * Generic — used by the funnel designer, shared funnel view, and analytics.
 */
const NodeLinkedDocuments = ({
  funnelNodeId,
  funnelId,
  subAccountId,
  userId,
  linkedOfferId,
  defaultFrameworkId,
  nodeLabel,
  funnelName,
  readOnly,
  onOpenDocument,
  client,
}: NodeLinkedDocumentsProps) => {
  const sb = (client || supabase) as SupabaseClient<any, any, any>;

  const [documents, setDocuments] = useState<LinkedDocument[]>([]);
  const [frameworks, setFrameworks] = useState<CopyFrameworkRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string | undefined>>({});
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [{ data: docs }, { data: fws }] = await Promise.all([
      sb
        .from("copy_documents")
        .select("id, name, type, status, updated_at")
        .eq("funnel_node_id", funnelNodeId)
        .order("updated_at", { ascending: false }),
      sb.from("copy_frameworks").select("id, name, type, component_slugs").eq("is_active", true),
    ]);
    const docList = (docs || []) as LinkedDocument[];
    setDocuments(docList);
    setFrameworks((fws || []) as CopyFrameworkRow[]);

    if (docList.length > 0) {
      const thumbs = await resolveDocumentThumbnails(docList.map((d) => d.id), { client: sb });
      setThumbnails(thumbs);
    } else {
      setThumbnails({});
    }
  }, [sb, funnelNodeId]);

  useEffect(() => { load(); }, [load]);

  const frameworkByType: Record<string, FrameworkInfo | undefined> = {};
  for (const fw of frameworks) {
    if (!frameworkByType[fw.type]) frameworkByType[fw.type] = { id: fw.id, name: fw.name, type: fw.type };
  }

  const createDocument = async () => {
    if (readOnly) return;
    if (!userId || !subAccountId) {
      toast.error("Sign in required to create documents.");
      return;
    }
    const framework = frameworks.find((f) => f.id === defaultFrameworkId);
    setCreating(true);
    try {
      const docName = `${funnelName || "Funnel"} — ${nodeLabel || "Document"}`;
      const { data: doc, error } = await sb
        .from("copy_documents")
        .insert({
          user_id: userId,
          sub_account_id: subAccountId,
          name: docName,
          type: framework?.type || "sales_copy",
          framework_id: framework?.id ?? null,
          funnel_id: funnelId ?? null,
          funnel_node_id: funnelNodeId,
          context_type: linkedOfferId ? "offer" : "custom",
          context_offer_id: linkedOfferId ?? null,
          status: "draft",
        } as any)
        .select("id, name, type, status, updated_at")
        .single();
      if (error || !doc) throw error;

      if (framework) {
        const slugs: string[] = Array.isArray(framework.component_slugs)
          ? framework.component_slugs
          : (framework.component_slugs?.slugs || []);
        if (slugs.length > 0) {
          const rows = slugs.map((slug, i) => ({
            document_id: (doc as any).id,
            component_slug: slug,
            sort_order: i,
            inputs: {},
            outputs: {},
            is_generated: false,
          }));
          await sb.from("copy_document_components").insert(rows as any);
        }
      }

      toast.success("Document created");
      // Open immediately so the user can start editing.
      onOpenDocument?.((doc as any).id);
      load();
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const detach = async (id: string) => {
    const { error } = await sb.from("copy_documents").update({ funnel_node_id: null } as any).eq("id", id);
    if (error) toast.error("Detach failed");
    else { toast.success("Document detached"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document permanently?")) return;
    const { error } = await sb.from("copy_documents").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Document deleted"); load(); }
  };

  return (
    <LinkedDocumentsGrid
      documents={documents}
      frameworkByType={frameworkByType}
      thumbnails={thumbnails}
      readOnly={readOnly}
      onOpen={onOpenDocument}
      onCreate={readOnly ? undefined : createDocument}
      onDetach={readOnly ? undefined : detach}
      onDelete={readOnly ? undefined : remove}
      createLabel={creating ? "Creating..." : "New document"}
      emptyLabel={readOnly ? "No linked documents." : "No linked documents yet."}
    />
  );
};

export default NodeLinkedDocuments;
