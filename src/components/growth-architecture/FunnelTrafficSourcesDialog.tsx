// =============================================================================
// FunnelTrafficSourcesDialog — unified traffic-source manager for one Funnel.
//
// Contains two groups:
//   • External — acquisition channels (Facebook, Google, etc.). Adds/removes
//     trafficSource nodes inside the funnel's nodes JSON.
//   • Funnels — other workspace funnels that route traffic *into* this one.
//     Selecting a funnel creates/removes a funnel_connections row.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Radio, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { useAcquisitionChannels, type AcquisitionChannelRow } from "@/lib/growth-architecture/hooks";
import {
  addFunnelExternalSource,
  removeFunnelExternalSource,
  extractExternalSources,
  type WorkspaceFunnelRow,
  type FunnelConnectionRow,
} from "@/lib/growth-architecture/funnelConnections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnel: WorkspaceFunnelRow | null;
  allFunnels: WorkspaceFunnelRow[];
  connections: FunnelConnectionRow[];
  onAddConnection: (sourceFunnelId: string, targetFunnelId: string) => Promise<unknown>;
  onRemoveConnectionBetween: (sourceFunnelId: string, targetFunnelId: string) => Promise<unknown>;
  onExternalChanged?: () => void;
}

const FunnelTrafficSourcesDialog = ({
  open,
  onOpenChange,
  funnel,
  allFunnels,
  connections,
  onAddConnection,
  onRemoveConnectionBetween,
  onExternalChanged,
}: Props) => {
  const { rows: channels, loading: loadingChannels } = useAcquisitionChannels();
  const [busy, setBusy] = useState(false);

  // Local snapshot so external-source edits reflect immediately.
  const [localNodes, setLocalNodes] = useState<any[]>([]);
  const [localEdges, setLocalEdges] = useState<any[]>([]);
  useEffect(() => {
    if (funnel) { setLocalNodes(funnel.nodes ?? []); setLocalEdges(funnel.edges ?? []); }
  }, [funnel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const externals = useMemo(() => extractExternalSources(localNodes), [localNodes]);
  const externalKeys = useMemo(() => new Set(externals.map((e) => e.channelKey).filter(Boolean) as string[]), [externals]);

  const upstreamFunnelIds = useMemo(() => {
    if (!funnel) return new Set<string>();
    return new Set(connections.filter((c) => c.target_funnel_id === funnel.id).map((c) => c.source_funnel_id));
  }, [connections, funnel?.id]);

  const otherFunnels = useMemo(
    () => allFunnels.filter((f) => f.id !== funnel?.id),
    [allFunnels, funnel?.id],
  );

  if (!funnel) return null;

  const toggleExternal = async (ch: AcquisitionChannelRow, checked: boolean) => {
    if (busy) return;
    setBusy(true);
    if (checked) {
      const res = await addFunnelExternalSource(
        { ...funnel, nodes: localNodes, edges: localEdges },
        ch,
      );
      if (res) { setLocalNodes(res.nodes); setLocalEdges(res.edges); onExternalChanged?.(); }
    } else {
      const target = externals.find((e) => e.channelKey === ch.key);
      if (target) {
        const res = await removeFunnelExternalSource(
          { ...funnel, nodes: localNodes, edges: localEdges },
          target.nodeId,
        );
        if (res) { setLocalNodes(res.nodes); setLocalEdges(res.edges); onExternalChanged?.(); }
      }
    }
    setBusy(false);
  };

  const toggleFunnel = async (sourceId: string, checked: boolean) => {
    if (busy) return;
    setBusy(true);
    if (checked) await onAddConnection(sourceId, funnel.id);
    else await onRemoveConnectionBetween(sourceId, funnel.id);
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Traffic Sources</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure where traffic for <span className="font-medium text-foreground">{funnel.name}</span> comes from.
          </p>
        </DialogHeader>

        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* External */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">External</h3>
            </div>
            {loadingChannels ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading channels…
              </div>
            ) : channels.length === 0 ? (
              <p className="text-xs text-muted-foreground">No channels available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {channels.map((ch) => {
                  const checked = externalKeys.has(ch.key);
                  return (
                    <label
                      key={ch.id}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleExternal(ch, !!v)}
                        disabled={busy}
                      />
                      <span className="text-xs text-foreground">{ch.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {/* Funnels */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Funnels</h3>
            </div>
            {otherFunnels.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No other funnels yet. Once you create more funnels they'll appear here so you can wire them together.
              </p>
            ) : (
              <div className="space-y-1.5">
                {otherFunnels.map((f) => {
                  const checked = upstreamFunnelIds.has(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleFunnel(f.id, !!v)}
                        disabled={busy}
                      />
                      <span className="text-xs text-foreground flex-1 truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{f.status}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FunnelTrafficSourcesDialog;
