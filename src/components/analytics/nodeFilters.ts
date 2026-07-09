// Helpers for analytics: exclude decorative/utility funnel nodes (notes, text, shapes)
// that only serve as annotations in the Funnel Designer and should not be tracked.

export function isTrackableNode(node: any): boolean {
  const rs = node?.data?.renderStyle;
  if (rs === "note" || rs === "text" || rs === "shape") return false;
  return true;
}

export function filterTrackableNodes<T extends { data?: any }>(nodes: T[]): T[] {
  return (nodes || []).filter(isTrackableNode);
}
