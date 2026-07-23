// =============================================================================
// deriveRouteStatus — computes a route's implementation state instead of
// persisting a manual status. Signals available today:
//   - target offer present (required — DB constraint)
//   - source offer present + matching offer_relationship
//   - acquisition channel selected (external routes)
//   - notes filled (loose signal of intent)
//
// Roadmap/stage state and Funnel Designer completion are not yet wired here;
// when those signals are available they should be added below. The UI must
// treat this as read-only: the DB column `status` is deprecated and ignored
// by the app (kept for backward compatibility only).
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

export function deriveRouteState(
  route: GrowthArchitectureRow,
  relationships: OfferRelationshipRow[],
  primaryChannelId?: string | null,
): DerivedRouteMeta {
  // Offer-to-offer route
  if (route.source_offer_id) {
    const relExists = relationships.some(
      (r) =>
        r.source_offer_id === route.source_offer_id &&
        r.target_offer_id === route.target_offer_id,
    );
    if (!relExists) {
      return {
        state: "planned",
        label: LABELS.planned,
        reason: "Missing offer relationship — add one on the source offer.",
      };
    }
    return {
      state: "ready_to_build",
      label: LABELS.ready_to_build,
      reason: "Offer relationship in place. Build the funnel to progress.",
    };
  }

  // External acquisition route
  if (primaryChannelId) {
    return {
      state: "ready_to_build",
      label: LABELS.ready_to_build,
      reason: "Primary channel selected. Build the acquisition funnel to progress.",
    };
  }

  return {
    state: "planned",
    label: LABELS.planned,
    reason: "Pick a primary channel or wire the offer relationship to move forward.",
  };
}
