// Helpers for analytics: exclude decorative/utility funnel nodes and pure timing
// elements. These serve as annotations or flow control in the Funnel Designer
// and should not be tracked with metrics.

// Element types that never carry trackable KPIs.
const NON_TRACKABLE_TYPES = new Set<string>([
  "notes",
  "text",
  "shape",
  "wait",
  "sequenceGroup",
]);

// Render styles used for decorative-only nodes.
const NON_TRACKABLE_RENDER_STYLES = new Set<string>(["note", "text", "shape"]);

export function isTrackableNode(node: any): boolean {
  const rs = node?.data?.renderStyle;
  if (rs && NON_TRACKABLE_RENDER_STYLES.has(rs)) return false;

  const pageType = node?.data?.pageType;
  if (pageType && NON_TRACKABLE_TYPES.has(pageType)) return false;

  const t = node?.type;
  if (t && NON_TRACKABLE_TYPES.has(t)) return false;

  return true;
}

export function filterTrackableNodes<T extends { data?: any }>(nodes: T[]): T[] {
  return (nodes || []).filter(isTrackableNode);
}

// Rewire edges so that when a non-trackable node is removed, its predecessors
// are connected directly to its successors. Keeps the analytics funnel view
// visually consistent with the designer flow.
export function filterAndRewireEdges(nodes: any[], edges: any[]): { nodes: any[]; edges: any[] } {
  const keep = new Set(nodes.filter(isTrackableNode).map((n) => n.id));
  const filteredNodes = nodes.filter((n) => keep.has(n.id));

  // Build adjacency
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  edges.forEach((e: any) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e.target);
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e.source);
  });

  // For each kept edge, walk through removed nodes if either end is removed
  const resultEdges: any[] = [];
  const seen = new Set<string>();

  const resolveDown = (nodeId: string, visited: Set<string>): string[] => {
    if (keep.has(nodeId)) return [nodeId];
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const outs = outgoing.get(nodeId) || [];
    return outs.flatMap((n) => resolveDown(n, visited));
  };
  const resolveUp = (nodeId: string, visited: Set<string>): string[] => {
    if (keep.has(nodeId)) return [nodeId];
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const ins = incoming.get(nodeId) || [];
    return ins.flatMap((n) => resolveUp(n, visited));
  };

  edges.forEach((e: any) => {
    const sources = keep.has(e.source) ? [e.source] : resolveUp(e.source, new Set());
    const targets = keep.has(e.target) ? [e.target] : resolveDown(e.target, new Set());
    sources.forEach((s) => {
      targets.forEach((t) => {
        if (s === t) return;
        const key = `${s}->${t}`;
        if (seen.has(key)) return;
        seen.add(key);
        resultEdges.push({ id: `${e.id || key}-rw`, source: s, target: t });
      });
    });
  });

  return { nodes: filteredNodes, edges: resultEdges };
}
