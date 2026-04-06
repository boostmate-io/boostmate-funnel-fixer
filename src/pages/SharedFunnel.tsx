import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  MarkerType,
  ReactFlowProvider,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import FunnelNode from "@/components/funnel-designer/FunnelNode";
import TrafficSourceNode from "@/components/funnel-designer/TrafficSourceNode";
import NodeDetailsPanel from "@/components/funnel-designer/NodeDetailsPanel";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Image, Monitor, ZoomIn, ZoomOut, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [showImages, setShowImages] = useState(false);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const flowRef = useRef<HTMLDivElement>(null);

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

  // Double-click via custom event from FunnelNode
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

  const handleDownloadPng = useCallback(() => {
    const viewport = flowRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewport) return;
    toPng(viewport, { backgroundColor: "#09090b", cacheBust: true }).then((dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${funnel?.name || "funnel"}.png`;
      a.click();
    });
  }, [funnel?.name]);

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
    data: { ...n.data, showImages },
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
        <div className="flex-1" ref={flowRef}>
          <ReactFlow
            nodes={readOnlyNodes}
            edges={funnel.edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeDoubleClick={onNodeDoubleClick}
            onInit={setRfInstance}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={[]}
            proOptions={{ hideAttribution: true }}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            zoomOnDoubleClick={false}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

            <Panel position="bottom-left" className="!m-3">
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-sm">
                <Tooltip><TooltipTrigger asChild>
                  <Toggle size="sm" pressed={showImages} onPressedChange={setShowImages} className="h-8 w-8 p-0">
                    {showImages ? <Image className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                  </Toggle>
                </TooltipTrigger><TooltipContent>{showImages ? "Show wireframes" : "Show images"}</TooltipContent></Tooltip>

                <div className="w-px h-5 bg-border mx-0.5" />

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => rfInstance?.zoomIn()}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Zoom In</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => rfInstance?.zoomOut()}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Zoom Out</TooltipContent></Tooltip>

                <div className="w-px h-5 bg-border mx-0.5" />

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleDownloadPng}>
                    <Camera className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Download PNG</TooltipContent></Tooltip>
              </div>
            </Panel>
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
