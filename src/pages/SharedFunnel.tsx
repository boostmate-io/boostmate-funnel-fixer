import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import FunnelNode from "@/components/funnel-designer/FunnelNode";
import TrafficSourceNode from "@/components/funnel-designer/TrafficSourceNode";
import NodeDetailsPanel from "@/components/funnel-designer/NodeDetailsPanel";
import logo from "@/assets/logo-boostmate.svg";

const nodeTypes = {
  funnelPage: FunnelNode,
  trafficSource: TrafficSourceNode,
};

const defaultEdgeOptions = {
  style: { stroke: "hsl(252, 100%, 64%)", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(252, 100%, 64%)" },
  animated: true,
};

interface FunnelData {
  name: string;
  nodes: Node[];
  edges: Edge[];
}

const SharedFunnelInner = () => {
  const { token } = useParams<{ token: string }>();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("funnels")
        .select("name, nodes, edges")
        .eq("share_token", token)
        .single();
      if (err || !data) {
        setError(true);
      } else {
        setFunnel(data as unknown as FunnelData);
      }
      setLoading(false);
    })();
  }, [token]);

  // Double-click to open read-only details
  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId;
      if (nodeId) setDetailsNodeId(nodeId);
    };
    window.addEventListener("funnel-node-dblclick", handler);
    return () => window.removeEventListener("funnel-node-dblclick", handler);
  }, []);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "funnelPage") setDetailsNodeId(node.id);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={logo} alt="Boostmate" className="h-8" />
        <p className="text-muted-foreground">This funnel link is invalid or has been removed.</p>
      </div>
    );
  }

  const readOnlyNodes = funnel.nodes.map((n) => ({
    ...n,
    draggable: false,
    connectable: false,
  }));

  const detailsNode = readOnlyNodes.find((n) => n.id === detailsNodeId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Boostmate" className="h-5" />
          <span className="text-sm font-display font-bold text-foreground">{funnel.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">Read-only view</span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1">
          <ReactFlow
            nodes={readOnlyNodes}
            edges={funnel.edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
            deleteKeyCode={[]}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>

        {detailsNode && detailsNode.type === "funnelPage" && (
          <NodeDetailsPanel
            nodeId={detailsNode.id}
            nodeLabel={(detailsNode.data as any).label || ""}
            customLabel={(detailsNode.data as any).customLabel || ""}
            linkedAssetId={null}
            noteContent={(detailsNode.data as any).noteContent || ""}
            renderStyle={(detailsNode.data as any).renderStyle || "page"}
            pageType={(detailsNode.data as any).pageType || ""}
            nodeNotes={(detailsNode.data as any).nodeNotes || ""}
            nodeUrl={(detailsNode.data as any).nodeUrl || ""}
            nodeImage={(detailsNode.data as any).nodeImage || ""}
            waitType={(detailsNode.data as any).waitType || "days"}
            waitDuration={(detailsNode.data as any).waitDuration}
            copySections={(detailsNode.data as any).copySections || []}
            readOnly
            onLinkAsset={() => {}}
            onRename={() => {}}
            onClose={() => setDetailsNodeId(null)}
          />
        )}
      </div>
    </div>
  );
};

const SharedFunnel = () => (
  <ReactFlowProvider>
    <SharedFunnelInner />
  </ReactFlowProvider>
);

export default SharedFunnel;
