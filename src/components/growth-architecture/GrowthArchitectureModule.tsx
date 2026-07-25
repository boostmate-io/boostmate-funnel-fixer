// =============================================================================
// GrowthArchitectureModule — V2.1 top-level module.
//
// Visualises the workspace's funnels as Funnel Containers on a graph.
// Each container displays the funnel's name, status, linked offer, and its
// external traffic sources. Funnel-to-funnel connections are drawn as edges
// between containers and are derived from funnel_connections (which are
// managed via the Traffic Sources dialog).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { Workflow, Loader2, Radio, GitBranch, ExternalLink, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useWorkspaceFunnels,
  useFunnelConnections,
  extractExternalSources,
  type WorkspaceFunnelRow,
  type FunnelStatus,
} from "@/lib/growth-architecture/funnelConnections";
import { supabase } from "@/integrations/supabase/client";
import FunnelContainerNode, { type FunnelContainerData } from "./FunnelContainerNode";
import FunnelTrafficSourcesDialog from "./FunnelTrafficSourcesDialog";

const nodeTypes = { funnelContainer: FunnelContainerNode };

const STATUS_LABEL: Record<FunnelStatus, string> = {
  building: "Building",
  live: "Live",
  paused: "Paused",
  archived: "Archived",
};

const STATUS_DOT: Record<FunnelStatus, string> = {
  building: "bg-amber-500",
  live: "bg-emerald-500",
  paused: "bg-muted-foreground",
  archived: "bg-muted-foreground",
};

function layoutFunnels(
  funnels: WorkspaceFunnelRow[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  const W = 260;
  const H = 160;
  for (const f of funnels) g.setNode(f.id, { width: W, height: H });
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  const nodes: Node[] = funnels.map((f) => {
    const p = g.node(f.id);
    return {
      id: f.id,
      type: "funnelContainer",
      position: { x: (p?.x ?? 0) - W / 2, y: (p?.y ?? 0) - H / 2 },
      data: {} as any, // filled in by caller with handlers/offers
      draggable: false,
    };
  });
  return { nodes, edges };
}

interface Props {
  onOpenFunnel?: (funnelId: string) => void;
}

const GrowthArchitectureModule = ({ onOpenFunnel }: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { rows: funnels, loading: loadingFunnels, reload: reloadFunnels } = useWorkspaceFunnels(activeSubAccountId ?? null);
  const { rows: connections, add, removeBetween } = useFunnelConnections(activeSubAccountId ?? null);

  // Offer names (for container display)
  const [offerNames, setOfferNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const ids = Array.from(new Set(funnels.map((f) => f.linked_offer_id).filter((v): v is string => !!v)));
    if (!activeSubAccountId || ids.length === 0) { setOfferNames(new Map()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("offers").select("id,name").in("id", ids);
      if (cancelled || !data) return;
      setOfferNames(new Map(data.map((o: any) => [o.id as string, (o.name as string) ?? ""])));
    })();
    return () => { cancelled = true; };
  }, [funnels.map((f) => f.linked_offer_id).join(","), activeSubAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [trafficFunnelId, setTrafficFunnelId] = useState<string | null>(null);
  const openTraffic = useCallback((funnelId: string) => setTrafficFunnelId(funnelId), []);

  const openFunnel = useCallback((funnelId: string) => {
    if (onOpenFunnel) return onOpenFunnel(funnelId);
    window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "funnels" }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("boostmate:open-funnel", { detail: { funnelId } }));
    }, 50);
  }, [onOpenFunnel]);

  // Build edges from funnel_connections (only for funnels present)
  const funnelIdSet = useMemo(() => new Set(funnels.map((f) => f.id)), [funnels]);
  const rfEdges: Edge[] = useMemo(
    () => connections
      .filter((c) => funnelIdSet.has(c.source_funnel_id) && funnelIdSet.has(c.target_funnel_id))
      .map((c) => ({
        id: c.id,
        source: c.source_funnel_id,
        target: c.target_funnel_id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "hsl(252, 100%, 64%)", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(252, 100%, 64%)" },
      })),
    [connections, funnelIdSet],
  );

  // Compute laid-out nodes with data
  const laidOut = useMemo(() => layoutFunnels(funnels, rfEdges), [funnels, rfEdges]);
  const rfNodes: Node[] = useMemo(() => laidOut.nodes.map((n) => {
    const f = funnels.find((x) => x.id === n.id)!;
    const data: FunnelContainerData = {
      funnelId: f.id,
      name: f.name,
      status: f.status,
      offerName: f.linked_offer_id ? offerNames.get(f.linked_offer_id) ?? null : null,
      externalSources: extractExternalSources(f.nodes),
      onOpen: openFunnel,
      onEditTraffic: openTraffic,
    };
    return { ...n, data: data as any };
  }), [laidOut.nodes, funnels, offerNames, openFunnel, openTraffic]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  useEffect(() => { setNodes(rfNodes); }, [rfNodes, setNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges, setEdges]);

  const activeFunnel = trafficFunnelId ? funnels.find((f) => f.id === trafficFunnelId) ?? null : null;

  return (
    <div className="h-full flex flex-col bg-background-dashboard">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Workflow className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-display font-bold text-foreground">Growth Architecture</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Your customer journey across funnels. Each container is a funnel with its linked offer and traffic sources.
              Connections show how customers flow from one funnel to the next.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "funnels" }))}
            className="gap-1.5 shrink-0"
          >
            <GitBranch className="w-4 h-4" /> Manage funnels
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {loadingFunnels ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : funnels.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <GitBranch className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-display font-bold text-foreground">No funnels yet</h2>
              <p className="text-sm text-muted-foreground">
                Create your first funnel to see it appear here as a container. Then wire funnels together using each
                funnel's Traffic Sources.
              </p>
              <Button
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "funnels" }))}
                className="gap-1.5"
              >
                <GitBranch className="w-4 h-4" /> Go to Funnels
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] h-full">
            {/* Graph */}
            <div className="min-h-[500px] h-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>

            {/* Side list */}
            <div className="border-l border-border bg-card overflow-y-auto">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Funnels</h3>
                <p className="text-[11px] text-muted-foreground">{funnels.length} in this workspace</p>
              </div>
              <div className="divide-y divide-border">
                {funnels.map((f) => {
                  const externals = extractExternalSources(f.nodes);
                  return (
                    <div key={f.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                          {f.linked_offer_id && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {offerNames.get(f.linked_offer_id) ?? "Offer"}
                            </p>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[f.status]}`} />
                          {STATUS_LABEL[f.status]}
                        </span>
                      </div>
                      {externals.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {externals.map((e) => (
                            <span key={e.nodeId} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                              <Circle className="w-1.5 h-1.5 fill-current" style={{ color: e.color ?? undefined }} />
                              {e.label}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => openTraffic(f.id)}>
                          <Radio className="w-3 h-3" /> Traffic Sources
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1" onClick={() => openFunnel(f.id)}>
                          Open <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <FunnelTrafficSourcesDialog
        open={!!trafficFunnelId}
        onOpenChange={(o) => { if (!o) setTrafficFunnelId(null); }}
        funnel={activeFunnel}
        allFunnels={funnels}
        connections={connections}
        onAddConnection={(s, t) => add(s, t)}
        onRemoveConnectionBetween={(s, t) => removeBetween(s, t)}
        onExternalChanged={() => { void reloadFunnels(); }}
      />
    </div>
  );
};

export default GrowthArchitectureModule;
