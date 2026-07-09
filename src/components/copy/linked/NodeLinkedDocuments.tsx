import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { resolveDocumentThumbnails } from "@/lib/copy/documentThumbnail";
import LinkedDocumentsGrid, { LinkedDocument, FrameworkInfo } from "./LinkedDocumentsGrid";

interface NodeLinkedDocumentsProps {
  funnelNodeId: string;
  funnelId?: string | null;
  subAccountId?: string | null;
  userId?: string | null;
  linkedOfferId?: string | null;
  defaultFrameworkId?: string | null;
  documentType?: string;
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
  documentType = "sales_copy",
  nodeLabel,
  funnelName,
  readOnly,
  onOpenDocument,
  client,
}: NodeLinkedDocumentsProps) => {
  const sb = (client || supabase) as SupabaseClient<any, any, any>;

  const [documents, setDocuments] = useState<LinkedDocument[]>([]);
  const [available, setAvailable] = useState<LinkedDocument[]>([]);
  const [frameworks, setFrameworks] = useState<CopyFrameworkRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string | undefined>>({});
  const [attachOpen, setAttachOpen] = useState(false);

  const load = useCallback(async () => {
    const [{ data: docs }, { data: fws }, { data: availableDocs }] = await Promise.all([
      sb
        .from("copy_documents")
        .select("id, name, type, status, updated_at")
        .eq("funnel_node_id", funnelNodeId)
        .order("updated_at", { ascending: false }),
      sb.from("copy_frameworks").select("id, name, type, component_slugs").eq("is_active", true),
      !readOnly && subAccountId
        ? sb
          .from("copy_documents")
          .select("id, name, type, status, updated_at, funnel_node_id")
          .eq("sub_account_id", subAccountId)
          .eq("type", documentType)
          .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    const docList = (docs || []) as LinkedDocument[];
    setDocuments(docList);
    setAvailable(((availableDocs || []) as any[]).filter((d) => d.id && d.funnel_node_id !== funnelNodeId) as LinkedDocument[]);
    setFrameworks((fws || []) as CopyFrameworkRow[]);

    if (docList.length > 0) {
      const thumbs = await resolveDocumentThumbnails(docList.map((d) => d.id), { client: sb });
      setThumbnails(thumbs);
    } else {
      setThumbnails({});
    }
  }, [sb, funnelNodeId, subAccountId, documentType, readOnly]);

  useEffect(() => { load(); }, [load]);

  const frameworkByType: Record<string, FrameworkInfo | undefined> = {};
  for (const fw of frameworks) {
    if (!frameworkByType[fw.type]) frameworkByType[fw.type] = { id: fw.id, name: fw.name, type: fw.type };
  }

  const dispatchDocumentsChanged = () => {
    window.dispatchEvent(new CustomEvent("boostmate:funnel-copy-documents-changed", { detail: { funnelNodeId } }));
  };

  const attach = async (id: string) => {
    if (readOnly) return;
    const { error } = await sb
      .from("copy_documents")
      .update({ funnel_node_id: funnelNodeId, funnel_id: funnelId ?? null } as any)
      .eq("id", id);
    if (error) { toast.error("Attach failed"); return; }
    toast.success("Document attached");
    setAttachOpen(false);
    dispatchDocumentsChanged();
    load();
  };

  const detach = async (id: string) => {
    const { error } = await sb.from("copy_documents").update({ funnel_node_id: null } as any).eq("id", id);
    if (error) toast.error("Detach failed");
    else { toast.success("Document detached"); dispatchDocumentsChanged(); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document permanently?")) return;
    const { error } = await sb.from("copy_documents").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Document deleted"); dispatchDocumentsChanged(); load(); }
  };

  const duplicate = async (id: string) => {
    if (readOnly || !userId || !subAccountId) return;
    const { data: src, error: srcErr } = await sb
      .from("copy_documents")
      .select("name, type, framework_id, context_type, context_offer_id, context_custom_text, global_instructions, funnel_id, funnel_node_id")
      .eq("id", id)
      .single();
    if (srcErr || !src) { toast.error("Duplicate failed"); return; }
    const { data: newDoc, error: insErr } = await sb
      .from("copy_documents")
      .insert({
        user_id: userId,
        sub_account_id: subAccountId,
        name: `${(src as any).name} (copy)`,
        type: (src as any).type,
        framework_id: (src as any).framework_id,
        context_type: (src as any).context_type,
        context_offer_id: (src as any).context_offer_id,
        context_custom_text: (src as any).context_custom_text,
        global_instructions: (src as any).global_instructions,
        funnel_id: (src as any).funnel_id,
        funnel_node_id: (src as any).funnel_node_id,
        status: "draft",
      } as any)
      .select("id")
      .single();
    if (insErr || !newDoc) { toast.error("Duplicate failed"); return; }
    const { data: comps } = await sb
      .from("copy_document_components")
      .select("component_slug, sort_order, inputs, outputs, is_generated")
      .eq("document_id", id);
    if (comps && comps.length > 0) {
      const rows = comps.map((c: any) => ({
        document_id: (newDoc as any).id,
        component_slug: c.component_slug,
        sort_order: c.sort_order,
        inputs: c.inputs || {},
        outputs: c.outputs || {},
        is_generated: c.is_generated || false,
      }));
      await sb.from("copy_document_components").insert(rows as any);
    }
    toast.success("Document duplicated");
    dispatchDocumentsChanged();
    load();
  };

  const typeLabel = documentType === "meta_ad"
    ? "ad documents"
    : documentType === "email_sequence"
      ? "email sequence documents"
      : "sales copy documents";

  return (
    <div className="space-y-3">
      <LinkedDocumentsGrid
        documents={documents}
        frameworkByType={frameworkByType}
        thumbnails={thumbnails}
        readOnly={readOnly}
        onOpen={onOpenDocument}
        onDetach={readOnly ? undefined : detach}
        onDelete={readOnly ? undefined : remove}
        onDuplicate={readOnly ? undefined : duplicate}
        emptyLabel={readOnly ? "No linked documents." : "No linked documents yet."}
      />

      {!readOnly && (
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" className="w-full h-8 text-xs">
              <Link2 className="w-3.5 h-3.5 mr-1" /> Attach existing document
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-2 border-b border-border">
              <p className="text-[11px] font-medium text-muted-foreground">Available {typeLabel}</p>
            </div>
            <div className="max-h-72 overflow-auto">
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 text-center">No available {typeLabel} in this workspace.</p>
              ) : (
                available.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => attach(doc.id)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-xs flex items-center justify-between gap-2 border-b border-border/50 last:border-b-0"
                  >
                    <span className="truncate">{doc.name}</span>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default NodeLinkedDocuments;
