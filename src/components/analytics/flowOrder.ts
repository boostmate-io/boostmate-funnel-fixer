// Sort funnel nodes in flow order using edges (BFS from roots).
export function sortNodesByFlow<T extends { id: string }>(nodes: T[], edges: any[]): T[] {
  if (!edges?.length) return nodes;
  const targetSet = new Set(edges.map((e: any) => e.target));
  const roots = nodes.filter((n) => !targetSet.has(n.id));
  const childMap = new Map<string, string[]>();
  edges.forEach((e: any) => {
    const arr = childMap.get(e.source) || [];
    arr.push(e.target);
    childMap.set(e.source, arr);
  });
  const ordered: T[] = [];
  const visited = new Set<string>();
  const queue = [...roots];
  while (queue.length) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    ordered.push(node);
    (childMap.get(node.id) || []).forEach((childId) => {
      const child = nodes.find((n) => n.id === childId);
      if (child && !visited.has(child.id)) queue.push(child);
    });
  }
  nodes.forEach((n) => {
    if (!visited.has(n.id)) ordered.push(n);
  });
  return ordered;
}
