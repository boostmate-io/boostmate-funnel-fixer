import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { resolveDocumentThumbnails } from "@/lib/copy/documentThumbnail";
import LinkedDocumentsGrid, { LinkedDocument } from "@/components/copy/linked/LinkedDocumentsGrid";

interface Props {
  nodeId: string;
  label: string;
  funnelId?: string | null;
  funnelName?: string;
  subAccountId?: string | null;
  readOnly?: boolean;
  onOpenCopyDocument?: (id: string) => void;
  onClose: () => void;
  supabaseClient?: SupabaseClient<any, any, any>;
}

/**
 * Traffic-source settings pane. Attach one or many EXISTING Meta Ad copy
 * documents to a traffic source node (updates `copy_documents.funnel_node_id`).
 */
const TrafficSourceDetailsPanel = ({
  nodeId, label, funnelId, funnelName, subAccountId, readOnly,
  onOpenCopyDocument, onClose, supabaseClient,
}: Props) => {
  const sb = (supabaseClient || supabase) as SupabaseClient<any, any, any>;

  const [linked, setLinked] = useState<LinkedDocument[]>([]);
  const [available, setAvailable] = useState<LinkedDocument[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string | undefined>>({});
  const [resolvedSubAccountId, setResolvedSubAccountId] = useState<string | null>(null);
  const [metaFrameworkName, setMetaFrameworkName] = useState<string>("Meta Ad");

  const load = useCallback(async () => {
    // Resolve current sub_account for the user (needed to filter available docs).
    let subId: string | null = subAccountId ?? resolvedSubAccountId;
    if (!readOnly && !subId) {
      const { data: auth } = await sb.auth.getUser();
      if (auth.user?.id) {
        const { data: memb } = await sb
          .from("account_memberships")
          .select("sub_account_id")
          .eq("user_id", auth.user.id)
          .not("sub_account_id", "is", null)
          .limit(1)
          .maybeSingle();
        subId = (memb as any)?.sub_account_id || null;
        setResolvedSubAccountId(subId);
      }
    }

    const { data: fw } = await sb
      .from("copy_frameworks")
      .select("name")
      .eq("type", "meta_ad")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if ((fw as any)?.name) setMetaFrameworkName((fw as any).name);

    const { data: linkedDocs } = await sb
      .from("copy_documents")
      .select("id, name, type, status, updated_at")
      .eq("funnel_node_id", nodeId)
      .order("updated_at", { ascending: false });
    const linkedList = (linkedDocs || []) as LinkedDocument[];
    setLinked(linkedList);

    if (!readOnly && subId) {
      // Available: all Meta Ad docs in the same workspace, except docs already
      // linked to this traffic source. If one is linked elsewhere, attaching it
      // moves that document to the current traffic source.
      const { data: avail } = await sb
        .from("copy_documents")
        .select("id, name, type, status, updated_at, funnel_node_id")
        .eq("sub_account_id", subId)
        .eq("type", "meta_ad")
        .order("updated_at", { ascending: false });
      setAvailable(((avail || []) as any[]).filter((d) => d.id && d.funnel_node_id !== nodeId) as LinkedDocument[]);
    }

    const allIds = linkedList.map((d) => d.id);
    if (allIds.length > 0) {
      const thumbs = await resolveDocumentThumbnails(allIds, { client: sb });
      setThumbnails(thumbs);
    } else {
      setThumbnails({});
    }
  }, [sb, nodeId, readOnly, subAccountId, resolvedSubAccountId]);

  useEffect(() => { load(); }, [load]);

  const attach = async (docId: string) => {
    const { error } = await sb
      .from("copy_documents")
      .update({ funnel_node_id: nodeId, funnel_id: funnelId ?? null } as any)
      .eq("id", docId);
    if (error) { toast.error("Attach failed"); return; }
    toast.success("Document attached");
    window.dispatchEvent(new CustomEvent("boostmate:funnel-copy-documents-changed", { detail: { funnelNodeId: nodeId } }));
    load();
  };

  const detach = async (id: string) => {
    const { error } = await sb.from("copy_documents").update({ funnel_node_id: null } as any).eq("id", id);
    if (error) toast.error("Detach failed");
    else {
      toast.success("Document detached");
      window.dispatchEvent(new CustomEvent("boostmate:funnel-copy-documents-changed", { detail: { funnelNodeId: nodeId } }));
      load();
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-display font-bold text-foreground truncate">{label}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Linked ad documents
        </p>

        <LinkedDocumentsGrid
          documents={linked}
          thumbnails={thumbnails}
          readOnly={readOnly}
          onOpen={onOpenCopyDocument}
          onDetach={readOnly ? undefined : detach}
          emptyLabel={readOnly ? "No linked ad documents." : "No ad documents linked yet."}
        />

        {!readOnly && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" className="w-full h-8 text-xs">
                <Link2 className="w-3.5 h-3.5 mr-1" /> Attach existing ad document
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="p-2 border-b border-border">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Available {metaFrameworkName} documents
                </p>
              </div>
              <div className="max-h-72 overflow-auto">
                {available.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    No available ad documents in this workspace.
                  </p>
                ) : (
                  available.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => attach(d.id)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-xs flex items-center justify-between gap-2 border-b border-border/50 last:border-b-0"
                    >
                      <span className="truncate">{d.name}</span>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default TrafficSourceDetailsPanel;
