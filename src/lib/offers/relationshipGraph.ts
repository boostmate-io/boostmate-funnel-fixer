// Pure helpers for offer relationship graphs (no DB access).

export interface RelEdge { source_offer_id: string; target_offer_id: string }

/** Would adding source → target create a loop (target already reaches source)? */
export function wouldCreateCycle(edges: RelEdge[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return true;
  const next = new Map<string, string[]>();
  for (const e of edges) {
    const list = next.get(e.source_offer_id) ?? [];
    list.push(e.target_offer_id);
    next.set(e.source_offer_id, list);
  }
  const seen = new Set<string>();
  const stack = [targetId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === sourceId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(next.get(cur) ?? []));
  }
  return false;
}

/** Source/target for a relationship created from the current offer's editor. */
export function relationshipEndpoints(direction: "incoming" | "outgoing", currentId: string, otherId: string) {
  return direction === "incoming"
    ? { source_offer_id: otherId, target_offer_id: currentId }
    : { source_offer_id: currentId, target_offer_id: otherId };
}
