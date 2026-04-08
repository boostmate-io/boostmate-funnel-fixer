import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import BriefFiller from "@/components/funnel-brief/BriefFiller";
import { BriefStructure, BriefValues, BriefApprovedFields } from "@/components/funnel-brief/types";
import OfferEditor from "@/components/offers/OfferEditor";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image, Monitor, ZoomIn, ZoomOut, Camera, ClipboardList, CheckCircle2, Circle, Save, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  id?: string;
  linked_offer_id?: string | null;
}

interface BriefData {
  id: string;
  structure: BriefStructure;
  values: BriefValues;
  approved_fields: BriefApprovedFields;
  is_approved: boolean;
  share_permission: string;
}

const SharedFunnelInner = () => {
  const { token } = useParams<{ token: string }>();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const initDone = useRef(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [briefValues, setBriefValues] = useState<BriefValues>({});
  const [briefApprovedFields, setBriefApprovedFields] = useState<BriefApprovedFields>({});
  const [showBrief, setShowBrief] = useState(false);
  const [savingBrief, setSavingBrief] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [linkedOfferId, setLinkedOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("funnels")
        .select("id, name, nodes, edges, linked_offer_id")
        .eq("share_token", token)
        .single();
      if (err || !data) {
        setError(true);
      } else {
        const fd = data as any;
        setFunnel(fd as unknown as FunnelData);
        setLinkedOfferId(fd.linked_offer_id || null);
        if (data.id) {
          const { data: briefRow } = await supabase
            .from("funnel_briefs")
            .select("id, structure, values, approved_fields, is_approved, share_permission")
            .eq("funnel_id", data.id)
            .maybeSingle();
          if (briefRow) {
            const bd = briefRow as any;
            setBriefData({
              id: bd.id,
              structure: bd.structure || { sections: [] },
              values: bd.values || {},
              approved_fields: bd.approved_fields || {},
              is_approved: !!bd.is_approved,
              share_permission: bd.share_permission || "view",
            });
            setBriefValues(bd.values || {});
            setBriefApprovedFields(bd.approved_fields || {});
          }
        }
      }
      setLoading(false);
    })();
  }, [token]);

  useEffect(() => {
    setSelectedNodeId(null);
    setDetailsNodeId(null);
  }, [token]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const canOpenReadOnlyDetails = useCallback((node: Node | undefined) => {
    if (!node || node.type !== "funnelPage") return false;
    const nodeData = node.data as any;
    const renderStyle = nodeData.renderStyle ?? "page";
    if (nodeData.pageType === "wait") return false;
    if (renderStyle === "note" || renderStyle === "text") {
      return Boolean(nodeData.noteContent?.trim());
    }
    return Boolean(
      nodeData.nodeNotes?.trim() ||
      nodeData.nodeUrl?.trim() ||
      nodeData.nodeImage?.trim() ||
      ((nodeData.copySections ?? []) as Array<unknown>).length > 0
    );
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId;
      if (!nodeId) return;
      const node = (funnel?.nodes ?? []).find((item) => item.id === nodeId);
      if (!canOpenReadOnlyDetails(node)) return;
      setSelectedNodeId(nodeId);
      setDetailsNodeId(nodeId);
    };
    window.addEventListener("funnel-node-dblclick", handler);
    return () => window.removeEventListener("funnel-node-dblclick", handler);
  }, [funnel?.nodes, canOpenReadOnlyDetails]);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(node.id);
    if (canOpenReadOnlyDetails(node)) setDetailsNodeId(node.id);
  }, [canOpenReadOnlyDetails]);

  const canEditBrief = briefData && !briefData.is_approved;

  const saveBriefValues = useCallback(async () => {
    if (!briefData?.id) return;
    setSavingBrief(true);
    const { error } = await supabase
      .from("funnel_briefs")
      .update({ values: briefValues as any, approved_fields: briefApprovedFields as any, updated_at: new Date().toISOString() } as any)
      .eq("id", briefData.id);
    if (error) toast.error("Error saving brief");
    else toast.success("Brief saved");
    setSavingBrief(false);
  }, [briefData, briefValues, briefApprovedFields]);

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

  const connectedHandlesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const e of (funnel?.edges ?? []) as Edge[]) {
      if (!map[e.source]) map[e.source] = new Set();
      map[e.source].add(`source-${e.sourceHandle || "right"}`);
      if (!map[e.target]) map[e.target] = new Set();
      map[e.target].add(`target-${e.targetHandle || "left"}`);
    }
    const result: Record<string, string[]> = {};
    for (const [id, s] of Object.entries(map)) result[id] = Array.from(s);
    return result;
  }, [funnel?.edges]);

  const readOnlyNodes = useMemo(
    () => (funnel?.nodes ?? []).map((n) => ({
      ...n,
      selected: n.id === selectedNodeId,
      draggable: false,
      connectable: false,
      data: { ...n.data, showImages, readOnly: true, connectedHandles: connectedHandlesMap[n.id] || [] },
    })),
    [funnel?.nodes, selectedNodeId, showImages, connectedHandlesMap]
  );

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

  const detailsNode = readOnlyNodes.find((n) => n.id === detailsNodeId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Boostmate" className="h-5" />
          <span className="text-sm font-display font-bold text-foreground">{funnel.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {linkedOfferId && (
            <Button
              variant={showOffer ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setShowOffer(!showOffer); if (!showOffer) { setShowBrief(false); setDetailsNodeId(null); } }}
            >
              <Gem className="w-3.5 h-3.5" />
              Offer
            </Button>
          )}
          {briefData && (
            <Button
              variant={showBrief ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setShowBrief(!showBrief); if (!showBrief) { setShowOffer(false); setDetailsNodeId(null); } }}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Brief
              {briefData.is_approved ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : (
                <Circle className="w-3 h-3 text-muted-foreground" />
              )}
            </Button>
          )}
          <span className="text-xs text-muted-foreground">Read-only view</span>
        </div>
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
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onSelectionChange={({ nodes: selectedNodes }) => setSelectedNodeId(selectedNodes[0]?.id ?? null)}
            onInit={(instance) => {
              setRfInstance(instance);
              setTimeout(() => {
                if (initDone.current) return;
                initDone.current = true;
                instance.fitView({ padding: 0.45 });
                setTimeout(() => {
                  const nodes = instance.getNodes();
                  if (!nodes.length) return;
                  const minX = Math.min(...nodes.map((n: any) => n.position.x));
                  const viewport = instance.getViewport();
                  const paddingPx = 40;
                  const leftEdgeInScreen = minX * viewport.zoom + viewport.x;
                  if (leftEdgeInScreen < paddingPx) {
                    instance.setViewport({
                      x: -minX * viewport.zoom + paddingPx,
                      y: viewport.y,
                      zoom: viewport.zoom,
                    });
                  }
                }, 50);
              }, 50);
            }}
            fitView={false}
            deleteKeyCode={[]}
            proOptions={{ hideAttribution: true }}
            elementsSelectable
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

        {detailsNode && detailsNode.type === "funnelPage" && !showBrief && !showOffer && (
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

      {/* Offer fullscreen modal */}
      <Dialog open={showOffer} onOpenChange={setShowOffer}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {linkedOfferId && (
            <OfferEditor offerId={linkedOfferId} onBack={() => setShowOffer(false)} readOnly={false} />
          )}
        </DialogContent>
      </Dialog>

      {/* Brief fullscreen modal */}
      <Dialog open={showBrief} onOpenChange={setShowBrief}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0">
          {briefData && (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Boostmate" className="h-5" />
                  <div>
                    <h2 className="text-sm font-display font-bold text-foreground">{funnel.name}</h2>
                    <p className="text-[10px] text-muted-foreground">
                      {canEditBrief ? "You can fill in and save this brief" : "Read-only view"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${briefData.is_approved ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/50 text-muted-foreground"}`}>
                    {briefData.is_approved ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    {briefData.is_approved ? "Approved" : "Pending"}
                  </div>
                  {canEditBrief && (
                    <Button size="sm" onClick={saveBriefValues} disabled={savingBrief} className="h-7 text-xs">
                      <Save className="w-3.5 h-3.5 mr-1" /> {savingBrief ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto px-6 py-6">
                <div className="max-w-xl mx-auto">
                  <BriefFiller
                    structure={briefData.structure}
                    values={briefValues}
                    onChange={canEditBrief ? setBriefValues : () => {}}
                    readOnly={!canEditBrief}
                    approvedFields={briefApprovedFields}
                    onApprovedFieldsChange={canEditBrief ? setBriefApprovedFields : undefined}
                    canApprove={!!canEditBrief}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SharedFunnel = () => (
  <ReactFlowProvider>
    <SharedFunnelInner />
  </ReactFlowProvider>
);

export default SharedFunnel;
