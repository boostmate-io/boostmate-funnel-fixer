// =============================================================================
// GrowthMap — read-only React Flow view of the Growth Architecture.
//
// V5 layout (top-to-bottom layered):
//   Layer 0 : Acquisition channel nodes (explicit, one per (route, channel)
//             junction — primary and additional).
//   Layer 1+: Offer nodes, grouped by tier order (top = earliest tier).
//
// Only route-participating offers appear on the active graph. Offers without
// any route render below the graph in a separate "Offers without a growth
// route" section.
// =============================================================================

import { useMemo } from "react";
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
import { ECOSYSTEM_TIERS } from "../offerDesignTypes";

interface Props {
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[];
  routes: GrowthArchitectureRow[];
  channels: AcquisitionChannelRow[];
  systems: GrowthSystemCatalogRow[];
  routeChannelsByRoute: Map<string, { primary: RouteChannelRow | null; additional: RouteChannelRow[] }>;
}

const TIER_ORDER = ECOSYSTEM_TIERS.map((t) => t.id);
const REL_COLOR: Record<string, string> = {
  ascends_to: "hsl(var(--primary))",
  leads_into: "hsl(220 70% 55%)",
  retention: "hsl(160 60% 45%)",
  downsell: "hsl(30 80% 55%)",
};

const NODE_WIDTH = 220;
const COL_GAP = 60;
const ROW_GAP = 60;
const OFFER_ROW_HEIGHT = 90;
const CHANNEL_ROW_HEIGHT = 70;

const GrowthMap = ({ offers, relationships, routes, channels, systems, routeChannelsByRoute }: Props) => {
  // Route-participating offer IDs
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
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Group offers by tier (present tiers only), preserving TIER_ORDER
    const offersByTier = new Map<string, EcosystemOfferRow[]>();
    graphOffers.forEach((o) => {
      const list = offersByTier.get(o.tier) ?? [];
      list.push(o);
      offersByTier.set(o.tier, list);
    });
    const presentTiers = TIER_ORDER.filter((t) => (offersByTier.get(t)?.length ?? 0) > 0);

    // Build a per-(route, channel) explicit channel-node id and collect them.
    type ChannelJunction = { key: string; channelId: string; routeId: string };
    const channelJunctionsForRoute = new Map<string, ChannelJunction[]>(); // routeId -> its junctions (primary + additional)
    const externalChannelJunctions: ChannelJunction[] = []; // channel nodes to render for external routes (source==null)

    routes.forEach((r) => {
      const bucket = routeChannelsByRoute.get(r.id);
      const junctions: ChannelJunction[] = [];
      if (bucket?.primary) {
        junctions.push({ key: `ch-${r.id}-${bucket.primary.channel_id}`, channelId: bucket.primary.channel_id, routeId: r.id });
      }
      (bucket?.additional ?? []).forEach((a) => {
        junctions.push({ key: `ch-${r.id}-${a.channel_id}`, channelId: a.channel_id, routeId: r.id });
      });
      channelJunctionsForRoute.set(r.id, junctions);
      // External routes surface channel nodes at the top layer
      if (r.source_offer_id == null) {
        externalChannelJunctions.push(...junctions);
      }
    });

    // Compute layout widths per layer
    const channelCount = externalChannelJunctions.length;
    const layerCounts = [channelCount, ...presentTiers.map((t) => offersByTier.get(t)?.length ?? 0)];
    const maxLayerWidth = Math.max(1, ...layerCounts);
    const layerPixelWidth = (count: number) =>
      count * NODE_WIDTH + Math.max(0, count - 1) * COL_GAP;
    const canvasWidth = layerPixelWidth(maxLayerWidth);
    const xForIndex = (index: number, count: number) => {
      const totalWidth = layerPixelWidth(count);
      const offset = (canvasWidth - totalWidth) / 2;
      return offset + index * (NODE_WIDTH + COL_GAP);
    };

    // Layer 0: channel nodes for external routes
    const channelLayerY = 20;
    externalChannelJunctions.forEach((junction, i) => {
      const ch = channels.find((c) => c.id === junction.channelId);
      nodes.push({
        id: junction.key,
        position: { x: xForIndex(i, channelCount), y: channelLayerY },
        data: {
          label: (
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Channel</div>
              <div className="text-sm font-semibold truncate max-w-[190px]">{ch?.label ?? "Unknown"}</div>
            </div>
          ) as any,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background: "hsl(var(--muted))",
          border: `1px ${ch?.color ? "solid" : "dashed"} ${ch?.color ?? "hsl(var(--border))"}`,
          borderRadius: 10,
          padding: 10,
          width: NODE_WIDTH,
        },
      });
    });

    // Offer layers — canonical single node per offer
    const offerLayerBaseY = channelLayerY + CHANNEL_ROW_HEIGHT + ROW_GAP;
    presentTiers.forEach((tier, layerIndex) => {
      const list = offersByTier.get(tier) ?? [];
      const y = offerLayerBaseY + layerIndex * (OFFER_ROW_HEIGHT + ROW_GAP);
      list.forEach((o, i) => {
        nodes.push({
          id: `offer-${o.id}`,
          position: { x: xForIndex(i, list.length), y },
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
        });
      });
    });

    // Relationship edges — only between routed offers (both endpoints must be on graph)
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
          opacity: 0.45,
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
      const isActive = derived.state === "ready_to_build" || derived.state === "in_progress" || derived.state === "built" || derived.state === "locked";
      const stroke = isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
      const strokeWidth = isActive ? 2.5 : 1.5;
      const dash = derived.state === "planned" ? "4 4" : undefined;

      if (r.source_offer_id == null) {
        // External route: explicit channel node(s) -> target offer
        const junctions = channelJunctionsForRoute.get(r.id) ?? [];
        if (junctions.length === 0) return; // nothing to draw without a channel
        junctions.forEach((junction, idx) => {
          const isPrimary = idx === 0 && bucket?.primary?.channel_id === junction.channelId;
          edges.push({
            id: `route-${r.id}-${junction.channelId}`,
            source: junction.key,
            target: `offer-${r.target_offer_id}`,
            label: isPrimary ? `${sys?.label ?? "System"} · ${derived.label}` : undefined,
            style: {
              stroke,
              strokeWidth: isPrimary ? strokeWidth : 1.25,
              strokeDasharray: dash,
              opacity: isPrimary ? 1 : 0.55,
            },
            labelStyle: { fontSize: 11, fontWeight: 600 },
            labelBgStyle: { fill: "hsl(var(--background))" },
            labelBgPadding: [6, 4],
            labelBgBorderRadius: 4,
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        });
      } else {
        // Ascension route: canonical offer -> canonical offer, labelled with system
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
      <div className="h-[560px] rounded-lg border border-border bg-background">
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
