// Helpers for analytics: exclude decorative/utility funnel nodes and pure timing
// elements. These serve as annotations or flow control in the Funnel Designer
// and should not be tracked with metrics.

// Element types that never carry trackable KPIs.
const NON_TRACKABLE_TYPES = new Set<string>([
  "notes",
  "text",
  "shape",
  "wait",
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

