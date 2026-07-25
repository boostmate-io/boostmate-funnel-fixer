// =============================================================================
// deriveRouteStatus — computes a route's implementation state instead of
// persisting a manual status.
//
// States:
//   - planned          : Prerequisites incomplete (missing offer relationship
//                        for offer-to-offer routes, or no primary channel for
//                        external acquisition routes).
//   - ready_to_build   : Prerequisites satisfied; no funnel has been created.
//   - in_progress      : Funnel exists but no attached build guides or some
//                        active tasks still incomplete.
//   - built            : Funnel exists, has attached build guides, and every
//                        active task is complete.
//
// The DB column `status` is deprecated and ignored by the app (kept for
// backward compatibility). The UI must treat this as read-only.
// =============================================================================
import type {
  GrowthArchitectureRow,
  OfferRelationshipRow,
} from "./hooks";

export type DerivedRouteState =
  | "planned"
  | "ready_to_build"
  | "in_progress"
  | "built"
  | "locked";

export interface DerivedRouteMeta {
  state: DerivedRouteState;
  label: string;
  reason: string;
}

export const ROUTE_STATE_STYLES: Record<DerivedRouteState, string> = {
  planned: "bg-muted text-muted-foreground",
  ready_to_build: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  built: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  locked: "bg-primary/15 text-primary",
};

const LABELS: Record<DerivedRouteState, string> = {
  planned: "Planned",
  ready_to_build: "Ready to build",
  in_progress: "In progress",
  built: "Built",
  locked: "Locked",
};

export interface RouteBuildInfo {
  guideCount: number;
  activeTaskCount: number;
  completedTaskCount: number;
}

export function deriveRouteState(
  route: GrowthArchitectureRow,
  _relationships: OfferRelationshipRow[], // deprecated — kept for signature compatibility
  primaryChannelId?: string | null,
  buildInfo?: RouteBuildInfo,
  upstreamFunnelCount?: number,
): DerivedRouteMeta {
  // Prerequisite: at least one traffic source — either an external primary
  // channel or an upstream funnel (persisted or pending).
  const pendingUpstream = (route.pending_upstream_funnel_ids ?? []).length;
  const totalUpstream = (upstreamFunnelCount ?? 0) + pendingUpstream;
  const hasChannel = !!primaryChannelId;

  if (!hasChannel && totalUpstream === 0) {
    return {
      state: "planned",
      label: LABELS.planned,
      reason: "Add at least one traffic source — an external channel or an upstream funnel.",
    };
  }

  const prereqReason = hasChannel
    ? (totalUpstream > 0
        ? `Primary channel selected · ${totalUpstream} upstream funnel${totalUpstream > 1 ? "s" : ""}.`
        : "Primary channel selected.")
    : `${totalUpstream} upstream funnel${totalUpstream > 1 ? "s" : ""} selected.`;

  // No funnel yet
  if (!route.funnel_id) {
    return {
      state: "ready_to_build",
      label: LABELS.ready_to_build,
      reason: `${prereqReason} Start building to generate your funnel.`,
    };
  }

  // Funnel exists — evaluate build guides
  const info = buildInfo ?? { guideCount: 0, activeTaskCount: 0, completedTaskCount: 0 };
  if (info.guideCount === 0 || info.activeTaskCount === 0) {
    return {
      state: "in_progress",
      label: LABELS.in_progress,
      reason: "Funnel created. Attach build guides to track progress.",
    };
  }
  if (info.completedTaskCount >= info.activeTaskCount) {
    return {
      state: "built",
      label: LABELS.built,
      reason: `All ${info.activeTaskCount} build tasks complete.`,
    };
  }
  return {
    state: "in_progress",
    label: LABELS.in_progress,
    reason: `${info.completedTaskCount}/${info.activeTaskCount} build tasks complete.`,
  };
}
