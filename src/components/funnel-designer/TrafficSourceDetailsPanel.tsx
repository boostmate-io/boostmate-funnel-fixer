import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import NodeLinkedDocuments from "@/components/copy/linked/NodeLinkedDocuments";

interface Props {
  nodeId: string;
  label: string;
  funnelId?: string | null;
  funnelName?: string;
  readOnly?: boolean;
  onOpenCopyDocument?: (id: string) => void;
  onClose: () => void;
  supabaseClient?: SupabaseClient<any, any, any>;
}

/**
 * Traffic-source settings pane. Lets the user attach one or many Meta Ad
 * Copy Documents to a traffic source node — same UX as the funnel page pane.
 */
const TrafficSourceDetailsPanel = ({
  nodeId, label, funnelId, funnelName, readOnly,
  onOpenCopyDocument, onClose, supabaseClient,
}: Props) => {
  const sb = (supabaseClient || supabase) as SupabaseClient<any, any, any>;
  const [metaFrameworkId, setMetaFrameworkId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [subAccountId, setSubAccountId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: fw } = await sb
        .from("copy_frameworks")
        .select("id")
        .eq("type", "meta_ad")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      setMetaFrameworkId((fw as any)?.id || null);

      if (!readOnly) {
        const { data: auth } = await sb.auth.getUser();
        setUserId(auth.user?.id || null);
        if (auth.user?.id) {
          const { data: memb } = await sb
            .from("account_memberships")
            .select("sub_account_id")
            .eq("user_id", auth.user.id)
            .not("sub_account_id", "is", null)
            .limit(1)
            .maybeSingle();
          setSubAccountId((memb as any)?.sub_account_id || null);
        }
      }
    })();
  }, [sb, readOnly]);

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
        <NodeLinkedDocuments
          funnelNodeId={nodeId}
          funnelId={funnelId ?? null}
          subAccountId={subAccountId}
          userId={userId}
          defaultFrameworkId={metaFrameworkId}
          nodeLabel={label}
          funnelName={funnelName}
          readOnly={readOnly}
          onOpenDocument={onOpenCopyDocument}
          client={supabaseClient}
        />
      </div>
    </div>
  );
};

export default TrafficSourceDetailsPanel;
