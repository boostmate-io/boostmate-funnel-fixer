import { useState, useCallback, useRef, useEffect, DragEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, RotateCcw, Download, FolderOpen, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ElementsPanel from "./ElementsPanel";
import FunnelNode from "./FunnelNode";
import TrafficSourceNode from "./TrafficSourceNode";
import NodeDetailsPanel from "./NodeDetailsPanel";
import { TRAFFIC_SOURCES, FUNNEL_ELEMENTS } from "./constants";

const nodeTypes = {
  funnelPage: FunnelNode,
  trafficSource: TrafficSourceNode,
};

const defaultEdgeOptions = {
  style: { stroke: "hsl(252, 100%, 64%)", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(252, 100%, 64%)" },
  animated: true,
};

interface Funnel {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  is_template: boolean;
  created_at: string;
}

const FunnelDesigner = () => {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [currentFunnel, setCurrentFunnel] = useState<Funnel | null>(null);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [templates, setTemplates] = useState<Funnel[]>([]);
  const [showFunnelList, setShowFunnelList] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showNewFunnel, setShowNewFunnel] = useState(false);
  const [funnelName, setFunnelName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);
  const [renamingFunnel, setRenamingFunnel] = useState(false);
  const nodeIdCounter = useRef(0);
  const selectedNodeRef = useRef<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<any, any> | null>(null);

  const loadFunnels = useCallback(async () => {
    if (!userId || !activeProject) return;
    const { data } = await supabase
      .from("funnels")
      .select("*")
      .eq("user_id", userId)
      .eq("is_template", false)
      .eq("project_id", activeProject.id)
      .order("updated_at", { ascending: false });
    if (data) setFunnels(data as unknown as Funnel[]);
  }, [userId, activeProject]);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("funnels")
      .select("*")
      .eq("is_template", true)
      .order("name", { ascending: true });
    if (data) setTemplates(data as unknown as Funnel[]);
  }, []);

  useEffect(() => {
    loadFunnels();
    loadTemplates();
    resetCanvas();
  }, [loadFunnels, loadTemplates, activeProject]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Click-to-add fallback
  const addNode = useCallback(
    (type: string, category: "traffic" | "page") => {
      nodeIdCounter.current += 1;
      const id = `node_${Date.now()}_${nodeIdCounter.current}`;

      if (category === "traffic") {
        const source = TRAFFIC_SOURCES.find((s) => s.type === type);
        if (!source) return;
        const newNode: Node = {
          id,
          type: "trafficSource",
          position: { x: 50, y: 100 + nodes.length * 120 },
          data: { label: source.label, icon: source.icon, color: source.color },
        };
        setNodes((nds) => [...nds, newNode]);
      } else {
        const el = FUNNEL_ELEMENTS.find((p) => p.type === type);
        if (!el) return;
        const newNode: Node = {
          id,
          type: "funnelPage",
          position: { x: 300 + nodes.length * 200, y: 150 },
          data: {
            label: el.label,
            pageType: el.type,
            icon: el.icon,
            color: el.color,
            isDecision: el.isDecision,
            renderStyle: el.renderStyle,
          },
        };
        setNodes((nds) => [...nds, newNode]);
      }
      toast.success(t("funnelDesigner.nodeAdded"));
    },
    [nodes.length, setNodes, t]
  );

  // Drag-and-drop from panel to canvas
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw || !reactFlowInstance) return;

      const { type, category, label, icon, color, renderStyle } = JSON.parse(raw);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      nodeIdCounter.current += 1;
      const id = `node_${Date.now()}_${nodeIdCounter.current}`;

      if (category === "traffic") {
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: "trafficSource",
            position,
            data: { label, icon, color },
          },
        ]);
      } else {
        const el = FUNNEL_ELEMENTS.find((e) => e.type === type);
        const actualRenderStyle = renderStyle || el?.renderStyle || "page";
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: "funnelPage",
            position,
            data: {
              label,
              pageType: type,
              icon,
              color,
              isDecision: el?.isDecision ?? false,
              renderStyle: actualRenderStyle,
            },
          },
        ]);
        // Auto-open details panel for notes/text elements
        if (actualRenderStyle === "note" || actualRenderStyle === "text") {
          setDetailsNodeId(id);
        }
      }
      toast.success(t("funnelDesigner.nodeAdded"));
    },
    [reactFlowInstance, setNodes, t]
  );

  const saveFunnel = useCallback(async () => {
    if (!userId || !activeProject) return;
    const payload = {
      user_id: userId,
      name: currentFunnel?.name || "Untitled Funnel",
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      is_template: false,
      project_id: activeProject.id,
    };
    if (currentFunnel?.id) {
      const { error } = await supabase
        .from("funnels")
        .update({ nodes: payload.nodes, edges: payload.edges, name: payload.name })
        .eq("id", currentFunnel.id);
      if (error) toast.error(t("funnelDesigner.saveError"));
      else toast.success(t("funnelDesigner.saved"));
    } else {
      const { data, error } = await supabase.from("funnels").insert(payload).select().single();
      if (error) toast.error(t("funnelDesigner.saveError"));
      else {
        setCurrentFunnel(data as unknown as Funnel);
        toast.success(t("funnelDesigner.saved"));
      }
    }
    loadFunnels();
  }, [currentFunnel, nodes, edges, t, loadFunnels, userId, activeProject]);

  const saveAsTemplate = useCallback(async () => {
    if (!userId || !activeProject) return;
    // Clean nodes for template: remove linked assets, urls, images but keep notes and copy sections (as local)
    const cleanedNodes = JSON.parse(JSON.stringify(nodes)).map((node: any) => {
      if (node.type === "funnelPage" && node.data) {
        const d = node.data;
        // If there's a linked asset, fetch its sections into local copySections
        // (sections are already in copySections or we keep them from local)
        // Remove asset link, url, image
        const localSections = d.copySections || [];
        return {
          ...node,
          data: {
            ...d,
            linkedAssetId: undefined,
            nodeUrl: undefined,
            nodeImage: undefined,
            copySections: localSections,
          },
        };
      }
      return node;
    });
    const { error } = await supabase.from("funnels").insert({
      user_id: userId,
      name: templateName || "Untitled Template",
      nodes: cleanedNodes,
      edges: JSON.parse(JSON.stringify(edges)),
      is_template: true,
      project_id: activeProject.id,
    });
    if (error) toast.error(t("funnelDesigner.saveError"));
    else {
      toast.success(t("funnelDesigner.templateSaved"));
      setShowSaveTemplate(false);
      setTemplateName("");
      loadTemplates();
    }
  }, [templateName, nodes, edges, t, loadTemplates, userId, activeProject]);

  const loadFunnel = useCallback(
    (funnel: Funnel) => {
      setNodes(funnel.nodes || []);
      setEdges(funnel.edges || []);
      setCurrentFunnel(funnel);
      setShowFunnelList(false);
      toast.success(t("funnelDesigner.loaded"));
    },
    [setNodes, setEdges, t]
  );

  const createFromTemplate = useCallback(
    (template: Funnel) => {
      setNodes(template.nodes || []);
      setEdges(template.edges || []);
      setCurrentFunnel(null);
      setFunnelName(template.name + " (copy)");
      setShowTemplates(false);
      setShowNewFunnel(true);
    },
    [setNodes, setEdges]
  );

  const createNewFunnel = useCallback(async () => {
    if (!userId || !activeProject) return;
    const { data, error } = await supabase
      .from("funnels")
      .insert({
        user_id: userId,
        name: funnelName || "Untitled Funnel",
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        is_template: false,
        project_id: activeProject.id,
      })
      .select()
      .single();
    if (error) toast.error(t("funnelDesigner.saveError"));
    else {
      setCurrentFunnel(data as unknown as Funnel);
      setShowNewFunnel(false);
      setFunnelName("");
      toast.success(t("funnelDesigner.created"));
      loadFunnels();
    }
  }, [funnelName, nodes, edges, t, loadFunnels, userId, activeProject]);

  const deleteFunnel = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("funnels").delete().eq("id", id);
      if (error) toast.error(t("funnelDesigner.deleteError"));
      else {
        if (currentFunnel?.id === id) resetCanvas();
        toast.success(t("funnelDesigner.deleted"));
        loadFunnels();
        loadTemplates();
      }
    },
    [currentFunnel, t, loadFunnels, loadTemplates]
  );

  const resetCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setCurrentFunnel(null);
    selectedNodeRef.current = null;
    setDetailsNodeId(null);
  }, [setNodes, setEdges]);

  // Single click = select (visual highlight via CSS, no state re-render)
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectedNodeRef.current = node.id;
  }, []);

  // Double click = open details panel (for funnelPage nodes)
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "funnelPage") {
      setDetailsNodeId(node.id);
    }
  }, []);

  // Also listen for custom double-click events from nodes (fallback)
  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId;
      if (nodeId) setDetailsNodeId(nodeId);
    };
    window.addEventListener("funnel-node-dblclick", handler);
    return () => window.removeEventListener("funnel-node-dblclick", handler);
  }, []);
  const handleLinkAsset = useCallback(
    (assetId: string | null) => {
      if (!detailsNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === detailsNodeId ? { ...n, data: { ...n.data, linkedAssetId: assetId } } : n
        )
      );
    },
    [detailsNodeId, setNodes]
  );

  const handleRenameNode = useCallback(
    (name: string) => {
      if (!detailsNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === detailsNodeId
            ? { ...n, data: { ...n.data, customLabel: name || undefined } }
            : n
        )
      );
    },
    [detailsNodeId, setNodes]
  );

  const handleNoteContentChange = useCallback(
    (content: string) => {
      if (!detailsNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === detailsNodeId ? { ...n, data: { ...n.data, noteContent: content } } : n
        )
      );
    },
    [detailsNodeId, setNodes]
  );

  const handleDataChange = useCallback(
    (key: string, value: any) => {
      if (!detailsNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === detailsNodeId ? { ...n, data: { ...n.data, [key]: value } } : n
        )
      );
    },
    [detailsNodeId, setNodes]
  );

  const detailsNode = nodes.find((n) => n.id === detailsNodeId);

  return (
    <div className="flex h-full bg-background-dashboard overflow-hidden">
      <ElementsPanel onAddNode={addNode} />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            {currentFunnel && renamingFunnel ? (
              <Input
                autoFocus
                className="h-7 text-sm font-display font-bold w-56"
                value={currentFunnel.name}
                onChange={(e) => setCurrentFunnel({ ...currentFunnel, name: e.target.value })}
                onBlur={() => setRenamingFunnel(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setRenamingFunnel(false);
                }}
              />
            ) : (
              <h2
                className="font-display font-bold text-foreground text-sm cursor-pointer group flex items-center gap-1.5"
                onClick={() => currentFunnel && setRenamingFunnel(true)}
                title={currentFunnel ? t("funnelDesigner.renameFunnel") : undefined}
              >
                {currentFunnel?.name || t("funnelDesigner.title")}
                {currentFunnel && (
                  <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNewFunnel(true);
                setFunnelName("");
                setNodes([]);
                setEdges([]);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> {t("funnelDesigner.new")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadFunnels();
                setShowFunnelList(true);
              }}
            >
              <FolderOpen className="w-4 h-4 mr-1" /> {t("funnelDesigner.myFunnels")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadTemplates();
                setShowTemplates(true);
              }}
            >
              <Download className="w-4 h-4 mr-1" /> {t("funnelDesigner.templates")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)}>
              <Save className="w-4 h-4 mr-1" /> {t("funnelDesigner.saveTemplate")}
            </Button>
            <Button variant="outline" size="sm" onClick={resetCanvas}>
              <RotateCcw className="w-4 h-4 mr-1" /> {t("funnelDesigner.reset")}
            </Button>
            <Button size="sm" onClick={saveFunnel}>
              <Save className="w-4 h-4 mr-1" /> {t("funnelDesigner.save")}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={() => { selectedNodeRef.current = null; }}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onInit={setReactFlowInstance}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            edgesReconnectable
            edgesFocusable
            elementsSelectable
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>

      {detailsNode && detailsNode.type === "funnelPage" && (
        <NodeDetailsPanel
          nodeId={detailsNode.id}
          nodeLabel={t((detailsNode.data as any).label)}
          customLabel={(detailsNode.data as any).customLabel || ""}
          linkedAssetId={(detailsNode.data as any).linkedAssetId || null}
          noteContent={(detailsNode.data as any).noteContent || ""}
          renderStyle={(detailsNode.data as any).renderStyle || "page"}
          pageType={(detailsNode.data as any).pageType || ""}
          nodeNotes={(detailsNode.data as any).nodeNotes || ""}
          nodeUrl={(detailsNode.data as any).nodeUrl || ""}
          nodeImage={(detailsNode.data as any).nodeImage || ""}
          waitType={(detailsNode.data as any).waitType || "days"}
          waitDuration={(detailsNode.data as any).waitDuration}
          copySections={(detailsNode.data as any).copySections || []}
          funnelName={currentFunnel?.name || ""}
          onLinkAsset={handleLinkAsset}
          onRename={handleRenameNode}
          onNoteContentChange={handleNoteContentChange}
          onDataChange={handleDataChange}
          onClose={() => setDetailsNodeId(null)}
        />
      )}

      {/* Dialogs */}
      <Dialog open={showFunnelList} onOpenChange={setShowFunnelList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("funnelDesigner.myFunnels")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {funnels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("funnelDesigner.noFunnels")}
              </p>
            )}
            {funnels.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <button onClick={() => loadFunnel(f)} className="text-left flex-1">
                  <p className="text-sm font-medium text-foreground">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => deleteFunnel(f.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("funnelDesigner.templates")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("funnelDesigner.noTemplates")}
              </p>
            )}
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <button onClick={() => createFromTemplate(tmpl)} className="text-left flex-1">
                  <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => deleteFunnel(tmpl.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("funnelDesigner.saveAsTemplate")}</DialogTitle>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={t("funnelDesigner.templateNamePlaceholder")}
          />
          <DialogFooter>
            <Button onClick={saveAsTemplate}>{t("funnelDesigner.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFunnel} onOpenChange={setShowNewFunnel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("funnelDesigner.newFunnel")}</DialogTitle>
          </DialogHeader>
          <Input
            value={funnelName}
            onChange={(e) => setFunnelName(e.target.value)}
            placeholder={t("funnelDesigner.funnelNamePlaceholder")}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                loadTemplates();
                setShowNewFunnel(false);
                setShowTemplates(true);
              }}
            >
              {t("funnelDesigner.startFromTemplate")}
            </Button>
            <Button onClick={createNewFunnel}>{t("funnelDesigner.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FunnelDesigner;
