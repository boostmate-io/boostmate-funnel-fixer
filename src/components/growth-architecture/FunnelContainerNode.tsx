// =============================================================================
// FunnelContainerNode — React Flow custom node for a Funnel Container.
// Displays: name, status pill, linked offer, external traffic sources.
// Internal funnel-to-funnel connections are visualised as edges between
// containers and never inside them.
// =============================================================================

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch, ExternalLink, Circle } from "lucide-react";
import type { FunnelStatus, FunnelExternalSource } from "@/lib/growth-architecture/funnelConnections";

export interface FunnelContainerData {
  funnelId: string;
  name: string;
  status: FunnelStatus;
  offerName: string | null;
  externalSources: FunnelExternalSource[];
  onOpen?: (funnelId: string) => void;
  onEditTraffic?: (funnelId: string) => void;
}

const STATUS: Record<FunnelStatus, { label: string; dot: string; text: string; bg: string }> = {
  building: { label: "Building", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10" },
  live:     { label: "Live",     dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10" },
  paused:   { label: "Paused",   dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
  archived: { label: "Archived", dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
};

const FunnelContainerNode = memo(({ data }: { data: FunnelContainerData }) => {
  const s = STATUS[data.status] ?? STATUS.building;
  return (
    <div className="rounded-xl border-2 border-border bg-card shadow-sm hover:shadow-md hover:border-primary/50 transition-all w-[260px]">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2 !border-0" />

      {/* External sources */}
      {data.externalSources.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Traffic Sources
          </p>
          <div className="flex flex-wrap gap-1">
            {data.externalSources.map((src) => (
              <span
                key={src.nodeId}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
              >
                <Circle className="w-1.5 h-1.5 fill-current" style={{ color: src.color ?? undefined }} />
                {src.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Funnel body */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{data.name}</span>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${s.bg} ${s.text} shrink-0`}>
            <span className={`w-1 h-1 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>

        {data.offerName && (
          <div className="text-[11px] text-muted-foreground">
            Linked offer: <span className="text-foreground font-medium">{data.offerName}</span>
          </div>
        )}

        <div className="flex items-center gap-1 pt-1">
          {data.onEditTraffic && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onEditTraffic?.(data.funnelId); }}
              className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-foreground transition-colors"
            >
              Traffic Sources
            </button>
          )}
          {data.onOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onOpen?.(data.funnelId); }}
              className="text-[10px] px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary inline-flex items-center gap-1 transition-colors"
            >
              Open <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2 !border-0" />
    </div>
  );
});

FunnelContainerNode.displayName = "FunnelContainerNode";

export default FunnelContainerNode;
