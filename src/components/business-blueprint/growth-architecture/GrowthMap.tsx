// =============================================================================
// GrowthMap — read-only React Flow view of offers + relationships + routes.
// Channels sourced from growth_architecture_channels (junction).
// =============================================================================

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
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

const GrowthMap = ({ offers, relationships, routes, channels, systems, routeChannelsByRoute }: Props) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const columnByTier: Record<string, number> = {};
    TIER_ORDER.forEach((t, i) => { columnByTier[t] = i; });

    const rowCounters: Record<string, number> = {};
    offers.forEach((o) => {
      const col = columnByTier[o.tier] ?? 0;
      const row = rowCounters[o.tier] = (rowCounters[o.tier] ?? 0) + 1;
      nodes.push({
        id: `offer-${o.id}`,
        position: { x: col * 260, y: (row - 1) * 110 + 60 },
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
        style: {
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 10,
          padding: 10,
          width: 220,
        },
      });
    });

    // Resolve primary channel per external route via junction
    const primaryChannelIdFor = (routeId: string): string | null =>
      routeChannelsByRoute.get(routeId)?.primary?.channel_id ?? null;

    const externalRoutes = routes.filter((r) => r.source_offer_id == null);
    const externalPrimaryChannelIds = Array.from(
      new Set(externalRoutes.map((r) => primaryChannelIdFor(r.id)).filter(Boolean) as string[]),
    );
    const untaggedExternal = externalRoutes.some((r) => !primaryChannelIdFor(r.id));

    let extRow = 0;
    externalPrimaryChannelIds.forEach((cid) => {
      const ch = channels.find((c) => c.id === cid);
      nodes.push({
        id: `ext-${cid}`,
        position: { x: -280, y: extRow * 90 + 40 },
        data: {
          label: (
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Channel</div>
              <div className="text-sm font-semibold">{ch?.label ?? "Unknown"}</div>
            </div>
          ) as any,
        },
        style: {
          background: "hsl(var(--muted))",
          border: "1px dashed hsl(var(--border))",
          borderRadius: 10,
          padding: 10,
          width: 200,
        },
      });
      extRow++;
    });
    if (untaggedExternal) {
      nodes.push({
        id: "ext-none",
        position: { x: -280, y: extRow * 90 + 40 },
        data: { label: "External acquisition" as any },
        style: {
          background: "hsl(var(--muted))",
          border: "1px dashed hsl(var(--border))",
          borderRadius: 10,
          padding: 10,
          width: 200,
        },
      });
    }

    relationships.forEach((r) => {
      edges.push({
        id: `rel-${r.id}`,
        source: `offer-${r.source_offer_id}`,
        target: `offer-${r.target_offer_id}`,
        label: r.relationship_type.replace("_", " "),
        style: { stroke: REL_COLOR[r.relationship_type] ?? "hsl(var(--border))", strokeWidth: 1, opacity: 0.55 },
        labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    routes.forEach((r) => {
      const sys = systems.find((s) => s.id === r.system_catalog_id);
      const bucket = routeChannelsByRoute.get(r.id);
      const primaryCid = bucket?.primary?.channel_id ?? null;
      const additionalCount = bucket?.additional.length ?? 0;
      const derived = deriveRouteState(r, relationships, primaryCid);
      const source = r.source_offer_id
        ? `offer-${r.source_offer_id}`
        : primaryCid
          ? `ext-${primaryCid}`
          : "ext-none";
      const isReady = derived.state === "ready_to_build" || derived.state === "in_progress" || derived.state === "built" || derived.state === "locked";
      const label = additionalCount > 0
        ? `${sys?.label ?? "System"} · ${derived.label} · +${additionalCount}`
        : `${sys?.label ?? "System"} · ${derived.label}`;
      edges.push({
        id: `route-${r.id}`,
        source,
        target: `offer-${r.target_offer_id}`,
        label,
        style: {
          stroke: isReady ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          strokeWidth: isReady ? 2.5 : 1.5,
          strokeDasharray: derived.state === "planned" ? "4 4" : undefined,
        },
        labelStyle: { fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "hsl(var(--background))" },
        labelBgPadding: [6, 4],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    return { nodes, edges };
  }, [offers, relationships, routes, channels, systems, routeChannelsByRoute]);

  if (offers.length === 0) {
    return (
      <div className="h-[420px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
        Add offers to see your Growth Map.
      </div>
    );
  }

  return (
    <div className="h-[520px] rounded-lg border border-border bg-background">
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
    </div>
  );
};

export default GrowthMap;
