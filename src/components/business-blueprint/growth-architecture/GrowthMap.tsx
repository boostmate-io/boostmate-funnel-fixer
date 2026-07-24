// =============================================================================
// GrowthMap — read-only React Flow view of the Growth Architecture.
//
// V5 layout: nodes and edges are constructed logically (channels, canonical
// offer nodes, route + relationship edges) and then positioned by dagre in a
// top-to-bottom layered graph. Dagre handles multi-route separation so shared
// offer nodes remain canonical while distinct routes never overlap.
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
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import type {
  OfferRelationshipRow,
  GrowthArchitectureRow,
  AcquisitionChannelRow,
  GrowthSystemCatalogRow,
  RouteChannelRow,
} from "@/lib/growth-architecture/hooks";
import { deriveRouteState } from "@/lib/growth-architecture/deriveStatus";

interface Props {
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[];
  routes: GrowthArchitectureRow[];
  channels: AcquisitionChannelRow[];
  systems: GrowthSystemCatalogRow[];
  routeChannelsByRoute: Map<string, { primary: RouteChannelRow | null; additional: RouteChannelRow[] }>;
}

const REL_COLOR: Record<string, string> = {
  ascends_to: "hsl(var(--primary))",
  leads_into: "hsl(220 70% 55%)",
  retention: "hsl(160 60% 45%)",
  downsell: "hsl(30 80% 55%)",
};

const NODE_WIDTH = 220;
const OFFER_HEIGHT = 78;
const CHANNEL_HEIGHT = 60;

const GrowthMap = ({ offers, relationships, routes, channels, systems, routeChannelsByRoute }: Props) => {
  const routedOfferIds = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (r.source_offer_id) set.add(r.source_offer_id);
      set.add(r.target_offer_id);
    });
    return set;
  }, [routes]);

  const graphOffers = useMemo(
    () => offers.filter((o) => routedOfferIds.has(o.id)),
    [offers, routedOfferIds],
  );
  const orphanOffers = useMemo(
    () => offers.filter((o) => !routedOfferIds.has(o.id)),
    [offers, routedOfferIds],
  );

  const { nodes, edges } = useMemo(() => {
    // Nodes built without positions; dagre assigns them below.
    const rawNodes: Array<{ id: string; width: number; height: number; render: Node }> = [];
    const edges: Edge[] = [];

    // Canonical offer nodes
    graphOffers.forEach((o) => {
      rawNodes.push({
        id: `offer-${o.id}`,
        width: NODE_WIDTH,
        height: OFFER_HEIGHT,
        render: {
          id: `offer-${o.id}`,
          position: { x: 0, y: 0 },
          data: {
            label: (
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {o.tier.replace("_", " ")}
                </div>
                <div className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                  {o.name}
                </div>
                {typeof o.data?.price === "number" && o.data.price > 0 && (
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    ${o.data.price.toLocaleString()}
                  </div>
                )}
              </div>
            ) as any,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 10,
            padding: 10,
            width: NODE_WIDTH,
          },
        },
      });
    });

    // Explicit channel nodes, one per (route, channel) junction for external routes
    type Junction = { key: string; channelId: string; routeId: string; isPrimary: boolean };
    const junctionsByRoute = new Map<string, Junction[]>();
    routes.forEach((r) => {
      if (r.source_offer_id != null) return; // ascension routes: no channel node
      const bucket = routeChannelsByRoute.get(r.id);
      const list: Junction[] = [];
      if (bucket?.primary) {
        list.push({ key: `ch-${r.id}-${bucket.primary.channel_id}`, channelId: bucket.primary.channel_id, routeId: r.id, isPrimary: true });
      }
      (bucket?.additional ?? []).forEach((a) => {
        list.push({ key: `ch-${r.id}-${a.channel_id}`, channelId: a.channel_id, routeId: r.id, isPrimary: false });
      });
      junctionsByRoute.set(r.id, list);
      list.forEach((j) => {
        const ch = channels.find((c) => c.id === j.channelId);
        rawNodes.push({
          id: j.key,
          width: NODE_WIDTH,
          height: CHANNEL_HEIGHT,
          render: {
            id: j.key,
            position: { x: 0, y: 0 },
            data: {
              label: (
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {j.isPrimary ? "Primary channel" : "Channel"}
                  </div>
                  <div className="text-sm font-semibold truncate max-w-[190px]">{ch?.label ?? "Unknown"}</div>
                </div>
              ) as any,
            },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            style: {
              background: "hsl(var(--muted))",
              border: `1px ${j.isPrimary ? "solid" : "dashed"} ${ch?.color ?? "hsl(var(--border))"}`,
              borderRadius: 10,
              padding: 8,
              width: NODE_WIDTH,
            },
          },
        });
      });
    });

    // Relationship edges (between routed offers only) — soft, thin
    relationships.forEach((r) => {
      if (!routedOfferIds.has(r.source_offer_id) || !routedOfferIds.has(r.target_offer_id)) return;
      edges.push({
        id: `rel-${r.id}`,
        source: `offer-${r.source_offer_id}`,
        target: `offer-${r.target_offer_id}`,
        label: r.relationship_type.replace("_", " "),
        style: {
          stroke: REL_COLOR[r.relationship_type] ?? "hsl(var(--border))",
          strokeWidth: 1,
          opacity: 0.4,
        },
        labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    // Route edges
    routes.forEach((r) => {
      const sys = systems.find((s) => s.id === r.system_catalog_id);
      const bucket = routeChannelsByRoute.get(r.id);
      const primaryCid = bucket?.primary?.channel_id ?? null;
      const derived = deriveRouteState(r, relationships, primaryCid);
      const isActive = derived.state !== "planned";
      const stroke = isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
      const strokeWidth = isActive ? 2.5 : 1.5;
      const dash = derived.state === "planned" ? "4 4" : undefined;

      if (r.source_offer_id == null) {
        const junctions = junctionsByRoute.get(r.id) ?? [];
        if (junctions.length === 0) return;
        junctions.forEach((j) => {
          edges.push({
            id: `route-${r.id}-${j.channelId}`,
            source: j.key,
            target: `offer-${r.target_offer_id}`,
            label: j.isPrimary ? `${sys?.label ?? "System"} · ${derived.label}` : undefined,
            style: {
              stroke,
              strokeWidth: j.isPrimary ? strokeWidth : 1.25,
              strokeDasharray: dash,
              opacity: j.isPrimary ? 1 : 0.55,
            },
            labelStyle: { fontSize: 11, fontWeight: 600 },
            labelBgStyle: { fill: "hsl(var(--background))" },
            labelBgPadding: [6, 4],
            labelBgBorderRadius: 4,
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        });
      } else {
        const additionalCount = bucket?.additional.length ?? 0;
        const label = additionalCount > 0
          ? `${sys?.label ?? "System"} · ${derived.label} · +${additionalCount}`
          : `${sys?.label ?? "System"} · ${derived.label}`;
        edges.push({
          id: `route-${r.id}`,
          source: `offer-${r.source_offer_id}`,
          target: `offer-${r.target_offer_id}`,
          label,
          style: { stroke, strokeWidth, strokeDasharray: dash },
          labelStyle: { fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: "hsl(var(--background))" },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    });

    // Dagre layout — top→bottom, with generous spacing so routes never overlap.
    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 90, marginx: 20, marginy: 20 });
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
  }, [graphOffers, relationships, routes, channels, systems, routeChannelsByRoute, routedOfferIds]);

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
        {graphOffers.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-6">
            No routes yet. Add a growth route to populate your map.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
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
              <div className="text-sm font-semibold text-foreground">Offers without a growth route</div>
              <div className="text-[11px] text-muted-foreground">
                These offers exist in your ecosystem but aren't yet connected to a route.
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
                <div className="text-sm font-medium text-foreground truncate">{o.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthMap;
