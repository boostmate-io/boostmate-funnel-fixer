import { useState, useCallback, useRef, useEffect, DragEvent, useMemo } from "react";
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
  Panel,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Save, RotateCcw, FolderOpen, Plus, Trash2, Pencil,
  Share2, Camera, Copy, Hand, MousePointer2, Undo2, Redo2,
  LayoutGrid, Image, Monitor, Library, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Toggle } from "@/components/ui/toggle";
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
import { toPng } from "html-to-image";

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
  share_token?: string | null;
}

/* ── Undo/Redo History ── */
interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
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
  const [interactionMode, setInteractionMode] = useState<"pointer" | "hand">("hand");
  const [showImages, setShowImages] = useState(false);
  const nodeIdCounter = useRef(0);
  const selectedNodeRef = useRef<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<any, any> | null>(null);
  const [linkedAssetSections, setLinkedAssetSections] = useState<Record<string, Array<{ id: string; title: string; description: string }>>>({});

  // Undo/Redo
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const isUndoRedo = useRef(false);
  const [, forceUpdate] = useState(0);

  const pushHistory = useCallback(() => {
    if (isUndoRedo.current) return;
    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    redoStack.current = [];
    forceUpdate((c) => c + 1);
  }, [nodes, edges]);

  // Push history on meaningful changes (debounced)
  const prevSnapshot = useRef<string>("");
  useEffect(() => {
    const snap = JSON.stringify({ n: nodes.map(n => ({ id: n.id, p: n.position })), e: edges.map(e => e.id) });
    if (snap !== prevSnapshot.current && prevSnapshot.current !== "") {
      pushHistory();
    }
    prevSnapshot.current = snap;
  }, [nodes.length, edges.length]); // Only on add/remove

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const current = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    redoStack.current.push(current);
    const prev = undoStack.current.pop()!;
    isUndoRedo.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setTimeout(() => { isUndoRedo.current = false; }, 50);
    forceUpdate((c) => c + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const current = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    undoStack.current.push(current);
    const next = redoStack.current.pop()!;
    isUndoRedo.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    setTimeout(() => { isUndoRedo.current = false; }, 50);
    forceUpdate((c) => c + 1);
  }, [nodes, edges, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (mod && e.key === "d") {
        e.preventDefault();
        cloneSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

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

  const linkedAssetIds = useMemo(
    () => Array.from(new Set(
      nodes.flatMap((node) =>
        node.type === "funnelPage" && (node.data as any)?.linkedAssetId
          ? [String((node.data as any).linkedAssetId)]
          : []
      )
    )).sort(),
    [nodes]
  );

  useEffect(() => {
    if (linkedAssetIds.length === 0) {
      setLinkedAssetSections({});
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("asset_sections")
        .select("id, asset_id, title, description")
        .in("asset_id", linkedAssetIds)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      const nextSections: Record<string, Array<{ id: string; title: string; description: string }>> = Object.fromEntries(
        linkedAssetIds.map((assetId) => [assetId, []])
      );

      for (const section of data ?? []) {
        nextSections[section.asset_id]?.push({
          id: section.id,
          title: section.title,
          description: section.description,
        });
      }

      setLinkedAssetSections(nextSections);
    })();

    return () => {
      cancelled = true;
    };
  }, [linkedAssetIds]);

  const resolveNodeCopySections = useCallback((node: Node) => {
    if (node.type !== "funnelPage") return [] as Array<{ id: string; title: string; description: string }>;

    const nodeData = node.data as any;
    if (nodeData.linkedAssetId) {
      return linkedAssetSections[String(nodeData.linkedAssetId)] ?? [];
    }

    return nodeData.copySections ?? [];
  }, [linkedAssetSections]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (type: string, category: "traffic" | "page") => {
      nodeIdCounter.current += 1;
      const id = `node_${Date.now()}_${nodeIdCounter.current}`;
      if (category === "traffic") {
        const source = TRAFFIC_SOURCES.find((s) => s.type === type);
        if (!source) return;
        setNodes((nds) => [...nds, {
          id, type: "trafficSource",
          position: { x: 50, y: 100 + nodes.length * 120 },
          data: { label: source.label, icon: source.icon, color: source.color },
        }]);
      } else {
        const el = FUNNEL_ELEMENTS.find((p) => p.type === type);
        if (!el) return;
        setNodes((nds) => [...nds, {
          id, type: "funnelPage",
          position: { x: 300 + nodes.length * 200, y: 150 },
          data: {
            label: el.label, pageType: el.type, icon: el.icon, color: el.color,
            isDecision: el.isDecision, renderStyle: el.renderStyle,
          },
        }]);
        if (el.renderStyle === "note" || el.renderStyle === "text") setDetailsNodeId(id);
      }
      toast.success(t("funnelDesigner.nodeAdded"));
    },
    [nodes.length, setNodes, t]
  );

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
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      nodeIdCounter.current += 1;
      const id = `node_${Date.now()}_${nodeIdCounter.current}`;
      if (category === "traffic") {
        setNodes((nds) => [...nds, { id, type: "trafficSource", position, data: { label, icon, color } }]);
      } else {
        const el = FUNNEL_ELEMENTS.find((e) => e.type === type);
        const actualRenderStyle = renderStyle || el?.renderStyle || "page";
        setNodes((nds) => [...nds, {
          id, type: "funnelPage", position,
          data: { label, pageType: type, icon, color, isDecision: el?.isDecision ?? false, renderStyle: actualRenderStyle },
        }]);
        if (actualRenderStyle === "note" || actualRenderStyle === "text") setDetailsNodeId(id);
      }
      toast.success(t("funnelDesigner.nodeAdded"));
    },
    [reactFlowInstance, setNodes, t]
  );

  const saveFunnel = useCallback(async () => {
    if (!userId || !activeProject) return;
    const persistedNodes = nodes.map((node) => node.type === "funnelPage"
      ? { ...node, data: { ...node.data, copySections: resolveNodeCopySections(node) } }
      : node);

    const payload = {
      user_id: userId,
      name: currentFunnel?.name || "Untitled Funnel",
      nodes: JSON.parse(JSON.stringify(persistedNodes)),
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
  }, [currentFunnel, nodes, edges, t, loadFunnels, userId, activeProject, resolveNodeCopySections]);

  const saveAsTemplate = useCallback(async () => {
    if (!userId || !activeProject) return;
    const rawNodes = JSON.parse(JSON.stringify(nodes));
    const linkedAssetIds = rawNodes
      .filter((n: any) => n.type === "funnelPage" && n.data?.linkedAssetId)
      .map((n: any) => n.data.linkedAssetId) as string[];
    let assetSectionsMap: Record<string, Array<{ id: string; title: string; description: string }>> = {};
    if (linkedAssetIds.length > 0) {
      const { data: sections } = await supabase
        .from("asset_sections")
        .select("id, asset_id, title, description")
        .in("asset_id", linkedAssetIds)
        .order("sort_order", { ascending: true });
      if (sections) {
        for (const s of sections) {
          if (!assetSectionsMap[s.asset_id]) assetSectionsMap[s.asset_id] = [];
          assetSectionsMap[s.asset_id].push({ id: s.id, title: s.title, description: s.description });
        }
      }
    }
    const cleanedNodes = rawNodes.map((node: any) => {
      if (node.type === "funnelPage" && node.data) {
        const d = node.data;
        const localSections = d.linkedAssetId && assetSectionsMap[d.linkedAssetId]
          ? assetSectionsMap[d.linkedAssetId] : (d.copySections || []);
        return { ...node, data: { ...d, linkedAssetId: undefined, nodeUrl: undefined, nodeImage: undefined, copySections: localSections } };
      }
      return node;
    });
    const { error } = await supabase.from("funnels").insert({
      user_id: userId, name: templateName || "Untitled Template",
      nodes: cleanedNodes, edges: JSON.parse(JSON.stringify(edges)),
      is_template: true, project_id: activeProject.id,
    });
    if (error) toast.error(t("funnelDesigner.saveError"));
    else {
      toast.success(t("funnelDesigner.templateSaved"));
      setShowSaveTemplate(false);
      setTemplateName("");
      loadTemplates();
    }
  }, [templateName, nodes, edges, t, loadTemplates, userId, activeProject]);

  const loadFunnel = useCallback((funnel: Funnel) => {
    setNodes(funnel.nodes || []);
    setEdges(funnel.edges || []);
    setCurrentFunnel(funnel);
    setShowFunnelList(false);
    undoStack.current = [];
    redoStack.current = [];
    toast.success(t("funnelDesigner.loaded"));
  }, [setNodes, setEdges, t]);

  const createFromTemplate = useCallback((template: Funnel) => {
    setNodes(template.nodes || []);
    setEdges(template.edges || []);
    setCurrentFunnel(null);
    setFunnelName(template.name + " (copy)");
    setShowTemplates(false);
    setShowNewFunnel(true);
  }, [setNodes, setEdges]);

  const createNewFunnel = useCallback(async () => {
    if (!userId || !activeProject) return;
    const persistedNodes = nodes.map((node) => node.type === "funnelPage"
      ? { ...node, data: { ...node.data, copySections: resolveNodeCopySections(node) } }
      : node);

    const { data, error } = await supabase.from("funnels").insert({
      user_id: userId, name: funnelName || "Untitled Funnel",
      nodes: JSON.parse(JSON.stringify(persistedNodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      is_template: false, project_id: activeProject.id,
    }).select().single();
    if (error) toast.error(t("funnelDesigner.saveError"));
    else {
      setCurrentFunnel(data as unknown as Funnel);
      setShowNewFunnel(false);
      setFunnelName("");
      toast.success(t("funnelDesigner.created"));
      loadFunnels();
    }
  }, [funnelName, nodes, edges, t, loadFunnels, userId, activeProject, resolveNodeCopySections]);

  const deleteFunnel = useCallback(async (id: string) => {
    const { error } = await supabase.from("funnels").delete().eq("id", id);
    if (error) toast.error(t("funnelDesigner.deleteError"));
    else {
      if (currentFunnel?.id === id) resetCanvas();
      toast.success(t("funnelDesigner.deleted"));
      loadFunnels();
      loadTemplates();
    }
  }, [currentFunnel, t, loadFunnels, loadTemplates]);

  const resetCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setCurrentFunnel(null);
    selectedNodeRef.current = null;
    setDetailsNodeId(null);
    undoStack.current = [];
    redoStack.current = [];
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectedNodeRef.current = node.id;
  }, []);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "funnelPage") setDetailsNodeId(node.id);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId;
      if (nodeId) setDetailsNodeId(nodeId);
    };
    window.addEventListener("funnel-node-dblclick", handler);
    return () => window.removeEventListener("funnel-node-dblclick", handler);
  }, []);

  const handleLinkAsset = useCallback((assetId: string | null) => {
    if (!detailsNodeId) return;
    setNodes((nds) => nds.map((n) => n.id === detailsNodeId ? { ...n, data: { ...n.data, linkedAssetId: assetId } } : n));
  }, [detailsNodeId, setNodes]);

  const handleRenameNode = useCallback((name: string) => {
    if (!detailsNodeId) return;
    setNodes((nds) => nds.map((n) => n.id === detailsNodeId ? { ...n, data: { ...n.data, customLabel: name || undefined } } : n));
  }, [detailsNodeId, setNodes]);

  const handleNoteContentChange = useCallback((content: string) => {
    if (!detailsNodeId) return;
    setNodes((nds) => nds.map((n) => n.id === detailsNodeId ? { ...n, data: { ...n.data, noteContent: content } } : n));
  }, [detailsNodeId, setNodes]);

  const handleDataChange = useCallback((key: string, value: any) => {
    if (!detailsNodeId) return;
    setNodes((nds) => nds.map((n) => n.id === detailsNodeId ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [detailsNodeId, setNodes]);

  /* ── Clone selected node ── */
  const cloneSelected = useCallback(() => {
    const selectedId = selectedNodeRef.current;
    if (!selectedId) { toast.error(t("funnelDesigner.selectToClone")); return; }
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;
    nodeIdCounter.current += 1;
    const id = `node_${Date.now()}_${nodeIdCounter.current}`;
    const clone: Node = {
      ...JSON.parse(JSON.stringify(node)),
      id,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: false,
    };
    setNodes((nds) => [...nds, clone]);
    toast.success(t("funnelDesigner.cloned"));
  }, [nodes, setNodes, t]);

  /* ── Share funnel ── */
  const shareFunnel = useCallback(async () => {
    if (!currentFunnel?.id) { toast.error(t("funnelDesigner.saveFirst")); return; }
    let token = currentFunnel.share_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { error } = await supabase.from("funnels").update({ share_token: token } as any).eq("id", currentFunnel.id);
      if (error) { toast.error(t("funnelDesigner.shareError")); return; }
      setCurrentFunnel({ ...currentFunnel, share_token: token });
    }
    const url = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("funnelDesigner.shareCopied"));
  }, [currentFunnel, t]);

  /* ── Download as PNG ── */
  const downloadPng = useCallback(async () => {
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${currentFunnel?.name || "funnel"}.png`;
      a.click();
    } catch {
      toast.error("Error exporting PNG");
    }
  }, [currentFunnel]);

  /* ── Auto Layout ── */
  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const children: Record<string, string[]> = {};
    const parents: Record<string, string[]> = {};
    nodes.forEach((n) => { children[n.id] = []; parents[n.id] = []; });
    edges.forEach((e) => {
      if (children[e.source]) children[e.source].push(e.target);
      if (parents[e.target]) parents[e.target].push(e.source);
    });
    const roots = nodes.filter((n) => parents[n.id].length === 0);
    if (roots.length === 0) return;

    const X_GAP = 250;
    const Y_GAP = 160;

    /* Estimate node height so we can compute the center anchor */
    const getNodeHeight = (id: string): number => {
      const n = nodeMap.get(id);
      if (!n) return 80;
      const d = n.data as any;
      const rs = d?.renderStyle ?? "page";
      if (rs === "note" || rs === "text") return 60;
      if (rs === "icon") return 80;
      return 220;
    };

    const visitedLayout = new Set<string>();
    const positions: Record<string, { x: number; y: number }> = {};

    /*
     * Strategy: walk from each root left→right.
     * - For a node with 1 child the child gets the SAME centerY as the parent → straight line.
     * - For a node with N children they fan out symmetrically around the parent's centerY.
     * centerY is the vertical midpoint of the node (position.y + height/2).
     */
    const layoutNode = (nodeId: string, col: number, centerY: number) => {
      if (visitedLayout.has(nodeId)) return;
      visitedLayout.add(nodeId);
      const nh = getNodeHeight(nodeId);
      positions[nodeId] = { x: col * X_GAP, y: centerY - nh / 2 };

      const kids = (children[nodeId] || []).filter((k) => !visitedLayout.has(k));
      if (kids.length === 0) return;

      if (kids.length === 1) {
        // Single child → same centerY → produces a straight horizontal line
        layoutNode(kids[0], col + 1, centerY);
      } else {
        // Multiple children → fan out symmetrically
        const totalSpan = (kids.length - 1) * Y_GAP;
        let childCenterY = centerY - totalSpan / 2;
        kids.forEach((kid) => {
          layoutNode(kid, col + 1, childCenterY);
          childCenterY += Y_GAP;
        });
      }
    };

    // Place roots, each spaced apart
    let rootCenterY = 0;
    roots.forEach((r, i) => {
      if (i > 0) rootCenterY += Y_GAP * 2;
      layoutNode(r.id, 0, rootCenterY);
    });

    // Orphan nodes (no connections)
    nodes.forEach((n) => {
      if (!visitedLayout.has(n.id)) {
        rootCenterY += Y_GAP;
        positions[n.id] = { x: 0, y: rootCenterY };
      }
    });

    setNodes((nds) => nds.map((n) => positions[n.id] ? { ...n, position: positions[n.id] } : n));
    setEdges((eds) => eds.map((e) => ({ ...e, animated: true })));
    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.2 }), 100);
    toast.success(t("funnelDesigner.autoLayoutDone"));
  }, [nodes, edges, setNodes, setEdges, reactFlowInstance, t]);

  const detailsNode = nodes.find((n) => n.id === detailsNodeId);

  return (
    <div className="flex h-full bg-background-dashboard overflow-hidden">
      <ElementsPanel onAddNode={addNode} />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            {currentFunnel && renamingFunnel ? (
              <Input
                autoFocus
                className="h-7 text-sm font-display font-bold w-56"
                value={currentFunnel.name}
                onChange={(e) => setCurrentFunnel({ ...currentFunnel, name: e.target.value })}
                onBlur={() => setRenamingFunnel(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setRenamingFunnel(false); }}
              />
            ) : (
              <h2
                className="font-display font-bold text-foreground text-sm cursor-pointer group flex items-center gap-1.5"
                onClick={() => currentFunnel && setRenamingFunnel(true)}
                title={currentFunnel ? t("funnelDesigner.renameFunnel") : undefined}
              >
                {currentFunnel?.name || t("funnelDesigner.title")}
                {currentFunnel && <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { setShowNewFunnel(true); setFunnelName(""); setNodes([]); setEdges([]); }}>
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{t("funnelDesigner.new")}</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { loadFunnels(); setShowFunnelList(true); }}>
                <FolderOpen className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{t("funnelDesigner.myFunnels")}</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { loadTemplates(); setShowTemplates(true); }}>
                <Library className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{t("funnelDesigner.templates")}</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)}>
                <Save className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{t("funnelDesigner.saveTemplate")}</TooltipContent></Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={shareFunnel}>
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{t("funnelDesigner.share")}</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={downloadPng}>
                <Camera className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{t("funnelDesigner.downloadPng")}</TooltipContent></Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={resetCanvas}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{t("funnelDesigner.reset")}</TooltipContent></Tooltip>

            <Button size="sm" onClick={saveFunnel}>
              <Save className="w-4 h-4 mr-1" /> {t("funnelDesigner.save")}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes.map((n) => n.type === "funnelPage"
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    showImages,
                    copySections: resolveNodeCopySections(n),
                  },
                }
              : n)}
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
            panOnDrag={interactionMode === "hand"}
            selectionOnDrag={interactionMode === "pointer"}
            zoomOnScroll
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

            {/* Bottom-left canvas toolbar */}
            <Panel position="bottom-left" className="!m-3">
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-sm">
                <Tooltip><TooltipTrigger asChild>
                  <Toggle size="sm" pressed={interactionMode === "hand"} onPressedChange={() => setInteractionMode("hand")} className="h-8 w-8 p-0">
                    <Hand className="w-4 h-4" />
                  </Toggle>
                </TooltipTrigger><TooltipContent>{t("funnelDesigner.handMode")}</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Toggle size="sm" pressed={interactionMode === "pointer"} onPressedChange={() => setInteractionMode("pointer")} className="h-8 w-8 p-0">
                    <MousePointer2 className="w-4 h-4" />
                  </Toggle>
                </TooltipTrigger><TooltipContent>{t("funnelDesigner.pointerMode")}</TooltipContent></Tooltip>

                <div className="w-px h-5 bg-border mx-0.5" />

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} disabled={undoStack.current.length === 0}>
                    <Undo2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Undo (Ctrl+Z)</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={redo} disabled={redoStack.current.length === 0}>
                    <Redo2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Redo (Ctrl+Y)</TooltipContent></Tooltip>

                <div className="w-px h-5 bg-border mx-0.5" />

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={cloneSelected}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>{t("funnelDesigner.clone")} (Ctrl+D)</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={autoLayout}>
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>{t("funnelDesigner.autoLayout")}</TooltipContent></Tooltip>

                <div className="w-px h-5 bg-border mx-0.5" />

                <Tooltip><TooltipTrigger asChild>
                  <Toggle size="sm" pressed={showImages} onPressedChange={setShowImages} className="h-8 w-8 p-0">
                    {showImages ? <Image className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                  </Toggle>
                </TooltipTrigger><TooltipContent>{showImages ? t("funnelDesigner.showWireframes") : t("funnelDesigner.showImages")}</TooltipContent></Tooltip>

                <div className="w-px h-5 bg-border mx-0.5" />

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => reactFlowInstance?.zoomIn()}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Zoom In</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => reactFlowInstance?.zoomOut()}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Zoom Out</TooltipContent></Tooltip>
              </div>
            </Panel>
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
          copySections={resolveNodeCopySections(detailsNode)}
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
          <DialogHeader><DialogTitle>{t("funnelDesigner.myFunnels")}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {funnels.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("funnelDesigner.noFunnels")}</p>}
            {funnels.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                <button onClick={() => loadFunnel(f)} className="text-left flex-1">
                  <p className="text-sm font-medium text-foreground">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
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
          <DialogHeader><DialogTitle>{t("funnelDesigner.templates")}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("funnelDesigner.noTemplates")}</p>}
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors">
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
          <DialogHeader><DialogTitle>{t("funnelDesigner.saveAsTemplate")}</DialogTitle></DialogHeader>
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={t("funnelDesigner.templateNamePlaceholder")} />
          <DialogFooter><Button onClick={saveAsTemplate}>{t("funnelDesigner.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFunnel} onOpenChange={setShowNewFunnel}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("funnelDesigner.newFunnel")}</DialogTitle></DialogHeader>
          <Input value={funnelName} onChange={(e) => setFunnelName(e.target.value)} placeholder={t("funnelDesigner.funnelNamePlaceholder")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { loadTemplates(); setShowNewFunnel(false); setShowTemplates(true); }}>
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
