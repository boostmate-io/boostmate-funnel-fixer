import type { Node, Edge } from "@xyflow/react";

const COLLAPSED_W = 240;
const COLLAPSED_H = 50;

/**
 * Pure transform: toggle the collapsed/expanded state of a sequence group.
 * Returns new nodes and edges arrays. Used by both the editable FunnelDesigner
 * and the read-only SharedFunnel view so behavior stays identical.
 */
export function toggleSequenceCollapse(
  nodes: Node[],
  edges: Edge[],
  groupId: string
): { nodes: Node[]; edges: Edge[] } {
  const group = nodes.find((n) => n.id === groupId);
  if (!group || group.type !== "sequenceGroup") return { nodes, edges };

  const childIds: string[] = (group.data as any)?.childIds ?? [];
  const childSet = new Set(childIds);
  const willCollapse = !(group.data as any)?.collapsed;
  const groupW = (group.data as any)?.width || 400;
  const groupH = (group.data as any)?.height || 200;

  const externalShifts: Record<string, number> = {};
  if (willCollapse) {
    const groupRight = (group.position?.x ?? 0) + groupW;
    const groupCenterX = (group.position?.x ?? 0) + groupW / 2;
    const collapsedRight = (group.position?.x ?? 0) + COLLAPSED_W;
    const deltaRight = collapsedRight - groupRight;

    const seeds = new Set<string>();
    edges.forEach((e) => {
      const sIn = childSet.has(e.source);
      const tIn = childSet.has(e.target);
      if (sIn && !tIn) seeds.add(e.target);
      if (tIn && !sIn) seeds.add(e.source);
    });

    const adj: Record<string, Set<string>> = {};
    edges.forEach((e) => {
      if (childSet.has(e.source) || childSet.has(e.target)) return;
      if (e.source === groupId || e.target === groupId) return;
      (adj[e.source] ??= new Set()).add(e.target);
      (adj[e.target] ??= new Set()).add(e.source);
    });

    const queue: string[] = [];
    seeds.forEach((id) => {
      const ext = nodes.find((n) => n.id === id);
      if (!ext) return;
      const isRight = (ext.position?.x ?? 0) >= groupCenterX;
      if (!isRight) return;
      externalShifts[id] = deltaRight;
      queue.push(id);
    });
    while (queue.length) {
      const cur = queue.shift()!;
      (adj[cur] ?? new Set()).forEach((nb) => {
        if (nb in externalShifts) return;
        if (childSet.has(nb) || nb === groupId) return;
        externalShifts[nb] = deltaRight;
        queue.push(nb);
      });
    }
  }

  const newNodes = nodes.map((n) => {
    if (n.id === groupId) {
      if (willCollapse) {
        const origPos = n.position;
        const newY = (origPos?.y ?? 0) + groupH / 2 - COLLAPSED_H / 2;
        return {
          ...n,
          position: { x: origPos?.x ?? 0, y: newY },
          data: { ...n.data, collapsed: true, _origPos: origPos },
        };
      } else {
        const orig = (n.data as any)?._origPos;
        const restored = { ...n.data, collapsed: false } as any;
        delete restored._origPos;
        return { ...n, position: orig || n.position, data: restored };
      }
    }
    if (childSet.has(n.id)) {
      return { ...n, hidden: willCollapse };
    }
    if (willCollapse && externalShifts[n.id]) {
      const shift = externalShifts[n.id];
      return {
        ...n,
        position: { x: (n.position?.x ?? 0) + shift, y: n.position?.y ?? 0 },
        data: { ...n.data, _collapseShift: { groupId, dx: shift } },
      };
    }
    if (!willCollapse) {
      const meta = (n.data as any)?._collapseShift;
      if (meta && meta.groupId === groupId) {
        const data = { ...n.data } as any;
        delete data._collapseShift;
        return { ...n, position: { x: (n.position?.x ?? 0) - meta.dx, y: n.position?.y ?? 0 }, data };
      }
    }
    return n;
  });

  const newEdges = willCollapse
    ? edges.map((e) => {
        const sIn = childSet.has(e.source);
        const tIn = childSet.has(e.target);
        if (sIn && tIn) {
          return { ...e, hidden: true, data: { ...(e.data as any), _groupId: groupId } };
        }
        if (sIn || tIn) {
          const meta: any = { ...(e.data as any), _groupId: groupId };
          const next: any = { ...e, data: meta };
          if (sIn) {
            meta._origSource = e.source;
            if (e.sourceHandle != null) meta._origSourceHandle = e.sourceHandle;
            next.source = groupId;
            next.sourceHandle = null;
          }
          if (tIn) {
            meta._origTarget = e.target;
            if (e.targetHandle != null) meta._origTargetHandle = e.targetHandle;
            next.target = groupId;
            next.targetHandle = null;
          }
          return next;
        }
        return e;
      })
    : edges.map((e) => {
        const meta = (e.data as any) || {};
        if (meta._groupId !== groupId) return e;
        const restored: any = { ...e, hidden: false };
        if (meta._origSource) {
          restored.source = meta._origSource;
          restored.sourceHandle = meta._origSourceHandle ?? null;
        }
        if (meta._origTarget) {
          restored.target = meta._origTarget;
          restored.targetHandle = meta._origTargetHandle ?? null;
        }
        const newData = { ...meta };
        delete newData._origSource;
        delete newData._origTarget;
        delete newData._origSourceHandle;
        delete newData._origTargetHandle;
        delete newData._groupId;
        restored.data = newData;
        return restored;
      });

  return { nodes: newNodes, edges: newEdges };
}
