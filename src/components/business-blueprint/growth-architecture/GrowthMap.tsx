// =============================================================================
// GrowthMap — V5 shell (React Flow, dagre, same controls/styling) but new
// V2.1 data composition:
//
//   - One Funnel Container node per route (planned or built).
//     Container renders: funnel name, target offer chip, status badge (when a
//     funnel exists), and external acquisition channel chips.
//   - Acquisition channels are NEVER separate canvas nodes — they render
//     inside the container.
//   - Funnel-to-funnel edges are derived from funnel_connections (post-build)
//     and from pending_upstream_funnel_ids (pre-build). Upstream funnels do
//     NOT appear as chips inside a container.
// =============================================================================

import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowDown, Star, Workflow } from "lucide-react";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import type {
  OfferRelationshipRow,
  GrowthArchitectureRow,
  AcquisitionChannelRow,
  GrowthSystemCatalogRow,
  RouteChannelRow,
} from "@/lib/growth-architecture/hooks";
import type { FunnelConnectionRow, WorkspaceFunnelRow } from "@/lib/growth-architecture/funnelConnections";
import { deriveRouteState } from "@/lib/growth-architecture/deriveStatus";

interface Props {
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[]; // kept for signature compatibility
  routes: GrowthArchitectureRow[];
  channels: AcquisitionChannelRow[];
  systems: GrowthSystemCatalogRow[];
  routeChannelsByRoute: Map<string, { primary: RouteChannelRow | null; additional: RouteChannelRow[] }>;
  workspaceFunnels: WorkspaceFunnelRow[];
  funnelConnections: FunnelConnectionRow[];
}

const CONTAINER_WIDTH = 300;
const STATUS_STYLES: Record<string, string> = {
  building: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  live: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  paused: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground line-through",
};

const GrowthMap = ({
  offers,
  routes,
  channels,
  systems,
  routeChannelsByRoute,
  workspaceFunnels,
  funnelConnections,
}: Props) => {
  const orphanOffers = useMemo(() => {
    const targeted = new Set(routes.map((r) => r.target_offer_id));
    return offers.filter((o) => !targeted.has(o.id));
  }, [offers, routes]);

  // Map funnel_id → route_id so upstream funnels can resolve to containers.
  const funnelIdToRouteId = useMemo(() => {
    const m = new Map<string, string>();
    routes.forEach((r) => { if (r.funnel_id) m.set(r.funnel_id, r.id); });
    return m;
  }, [routes]);

  const funnelById = useMemo(
    () => new Map(workspaceFunnels.map((f) => [f.id, f] as const)),
    [workspaceFunnels],
  );

  const { nodes, edges } = useMemo(() => {
    const rawNodes: Array<{ id: string; width: number; height: number; render: Node }> = [];
    const edges: Edge[] = [];

    routes.forEach((r) => {
      const sys = systems.find((s) => s.id === r.system_catalog_id);
      const bucket = routeChannelsByRoute.get(r.id) ?? { primary: null, additional: [] };
      const derived = deriveRouteState(r, [], bucket.primary?.channel_id ?? null);
      const target = offers.find((o) => o.id === r.target_offer_id);
      const funnel = r.funnel_id ? funnelById.get(r.funnel_id) : null;

      const primaryCh = bucket.primary ? channels.find((c) => c.id === bucket.primary!.channel_id) : null;
      const additionalChs = bucket.additional
        .map((a) => channels.find((c) => c.id === a.channel_id))
        .filter((c): c is AcquisitionChannelRow => !!c);

      const channelChipCount = (primaryCh ? 1 : 0) + additionalChs.length;
      const height = 250 + Math.ceil((channelChipCount || 1) / 2) * 26;

      const isActive = derived.state !== "planned";
      const borderColor = isActive ? "hsl(var(--primary))" : "hsl(var(--border))";

      rawNodes.push({
        id: `route-${r.id}`,
        width: CONTAINER_WIDTH,
        height,
        render: {
          id: `route-${r.id}`,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            label: (
              <div className="text-left w-full">
                {/* Funnel Container header */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">
                    Funnel
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize ${
                      funnel
                        ? STATUS_STYLES[funnel.status] ?? "bg-muted text-muted-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {funnel?.status ?? "planned"}
                  </span>
                </div>
                <div className="text-sm font-semibold text-foreground truncate mb-2.5">
                  {funnel?.name ?? `${sys?.label ?? "Funnel"} (planned)`}
                </div>

                {/* Step 1 — Traffic Sources */}
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
                    Traffic Sources
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {primaryCh && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-background"
                        style={{ borderColor: primaryCh.color ?? "hsl(var(--border))", color: primaryCh.color ?? undefined }}
                      >
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {primaryCh.label}
                      </span>
                    )}
                    {additionalChs.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border border-dashed bg-background"
                        style={{ borderColor: c.color ?? "hsl(var(--border))", color: c.color ?? undefined }}
                      >
                        {c.label}
                      </span>
                    ))}
                    {channelChipCount === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">No external channels</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-center py-0.5">
                  <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Step 2 — Growth System */}
                <div className="rounded-md border border-border bg-background px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    Growth System
                  </div>
                  <div className="text-[12px] font-medium truncate flex items-center gap-1">
                    <Workflow className="w-3 h-3 text-primary shrink-0" />
                    {sys?.label ?? "System"}
                  </div>
                </div>

                <div className="flex justify-center py-0.5">
                  <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Step 3 — Offer */}
                <div className="rounded-md border border-primary/40 bg-primary/5 px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    Offer · {target?.tier.replace("_", " ") ?? "offer"}
                  </div>
                  <div className="text-[12px] font-medium truncate">{target?.name ?? "Unknown offer"}</div>
                </div>
              </div>
            ) as any,
          },
          style: {
            background: "hsl(var(--card))",
            border: `1.5px solid ${borderColor}`,
            borderRadius: 12,
            padding: 12,
            width: CONTAINER_WIDTH,
          },
        },
      });
    });

    // Funnel-to-funnel edges: persisted connections (built targets)
    funnelConnections.forEach((c) => {
      const sourceRouteId = funnelIdToRouteId.get(c.source_funnel_id);
      const targetRouteId = funnelIdToRouteId.get(c.target_funnel_id);
      if (!sourceRouteId || !targetRouteId) return;
      edges.push({
        id: `fc-${c.id}`,
        source: `route-${sourceRouteId}`,
        target: `route-${targetRouteId}`,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    // Pending upstream (planned targets) — dashed
    routes.forEach((r) => {
      (r.pending_upstream_funnel_ids ?? []).forEach((sourceFunnelId) => {
        const sourceRouteId = funnelIdToRouteId.get(sourceFunnelId);
        if (!sourceRouteId) return;
        edges.push({
          id: `pend-${r.id}-${sourceFunnelId}`,
          source: `route-${sourceRouteId}`,
          target: `route-${r.id}`,
          style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5, strokeDasharray: "4 4" },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      });
    });

    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 100, marginx: 20, marginy: 20 });
    rawNodes.forEach((n) => g.setNode(n.id, { width: n.width, height: n.height }));
    edges.forEach((e) => g.setEdge(e.source, e.target, {}, e.id));
    dagre.layout(g);

    const nodes: Node[] = rawNodes.map((n) => {
      const p = g.node(n.id);
      return {
        ...n.render,
        position: { x: (p?.x ?? 0) - n.width / 2, y: (p?.y ?? 0) - n.height / 2 },
      };
    });

    return { nodes, edges };
  }, [routes, systems, offers, channels, routeChannelsByRoute, funnelById, funnelConnections, funnelIdToRouteId]);

  if (offers.length === 0) {
    return (
      <div className="h-[420px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
        Add offers to see your Growth Map.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-[600px] rounded-lg border border-border bg-background">
        {routes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-6">
            No funnels yet. Add a funnel to populate your map.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.25, includeHiddenNodes: false, minZoom: 0.4, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      {orphanOffers.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Offers without a funnel</div>
              <div className="text-[11px] text-muted-foreground">
                These offers exist in your ecosystem but aren't yet the target of any funnel.
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">{orphanOffers.length}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {orphanOffers.map((o) => (
              <div key={o.id} className="rounded-md border border-border bg-background px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {o.tier.replace("_", " ")}
                </div>
                <div className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                  <Workflow className="w-3 h-3 text-muted-foreground" /> {o.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthMap;
