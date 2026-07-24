// =============================================================================
// Deterministic recommendation helpers for the Growth Architecture wizard.
// No AI. Stage-aware for Growth Systems only (channels lack stage metadata).
// =============================================================================
import type {
  GrowthSystemCatalogRow,
  AcquisitionChannelRow,
  GrowthArchitectureRow,
} from "./hooks";
import type { EcosystemOfferRow } from "@/components/business-blueprint/useEcosystemOffers";

export type Stage = "validate" | "attract" | "optimize" | "scale" | "systemize";

export interface SystemSuggestion {
  system: GrowthSystemCatalogRow;
  compatible: boolean;
  buildable: boolean; // has seed_template_id
  stageMatch: boolean;
  duplicate: boolean; // would create duplicate route
  reasons: string[];
  why: string;
  group: "best_fit" | "recommended" | "other_compatible" | "incompatible";
}

export interface ChannelSuggestion {
  channel: AcquisitionChannelRow;
  compatible: boolean;
  isSuggestedDefault: boolean;
  why: string;
}

/**
 * Rank Growth Systems for a target offer.
 *
 * @param stage May be null (unknown). When unknown, systems are grouped as
 * "other_compatible" only and ranked by sort_order; stage-copy is suppressed.
 */
export function rankSystemsForOffer(
  systems: GrowthSystemCatalogRow[],
  offer: EcosystemOfferRow | null,
  stage: Stage | null,
  existingRoutes: GrowthArchitectureRow[],
  sourceOfferId: string | null,
): SystemSuggestion[] {
  if (!offer) return [];
  const targetId = offer.id;

  const suggestions: SystemSuggestion[] = systems.map((s) => {
    const tierOk = s.suitable_offer_tiers?.includes(offer.tier) ?? false;
    const buildable = !!s.seed_template_id;
    const stageMatch = !!stage && (s.recommended_stages?.includes(stage) ?? false);
    const duplicate = existingRoutes.some(
      (r) =>
        r.system_catalog_id === s.id &&
        r.target_offer_id === targetId &&
        (r.source_offer_id ?? null) === (sourceOfferId ?? null),
    );
    const compatible = tierOk && !duplicate;

    const reasons: string[] = [];
    if (!tierOk) reasons.push(`Not compatible with ${offer.tier} offers.`);
    if (duplicate) reasons.push("A route with this exact source and target already exists.");
    if (!buildable) reasons.push("No Seed Template configured — cannot build.");

    let why = "";
    if (compatible) {
      if (stage && stageMatch) {
        why = `Recommended because ${s.label} supports ${offer.tier} offers and fits the ${stage} stage.`;
      } else if (stage) {
        why = `${s.label} supports ${offer.tier} offers.`;
      } else {
        why = `${s.label} supports ${offer.tier} offers.`;
      }
    } else {
      why = reasons.join(" ");
    }

    let group: SystemSuggestion["group"] = "incompatible";
    if (compatible) {
      if (stage && stageMatch) group = "recommended";
      else group = "other_compatible";
    }
    return { system: s, compatible, buildable, stageMatch, duplicate, reasons, why, group };
  });

  // Sort: recommended → other_compatible → incompatible, all by sort_order.
  const order = { best_fit: 0, recommended: 1, other_compatible: 2, incompatible: 3 };
  suggestions.sort((a, b) => order[a.group] - order[b.group] || a.system.sort_order - b.system.sort_order);

  // Promote first recommended to best_fit (when stage is known).
  if (stage) {
    const firstRec = suggestions.find((s) => s.group === "recommended");
    if (firstRec) firstRec.group = "best_fit";
  }
  return suggestions;
}

/**
 * Rank Acquisition Channels for a chosen system. Channels lack stage metadata,
 * so grouping is "Compatible channels" only. Suggested default = lowest sort_order.
 */
export function rankChannelsForSystem(
  channels: AcquisitionChannelRow[],
  compatChannelIds: Set<string>,
  systemLabel: string,
): ChannelSuggestion[] {
  const compat = channels
    .filter((c) => compatChannelIds.has(c.id))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  return compat.map((c, i) => ({
    channel: c,
    compatible: true,
    isSuggestedDefault: i === 0,
    why: `Compatible with ${systemLabel}.`,
  }));
}

export function suggestedDefaultChannel(
  channels: AcquisitionChannelRow[],
  compatChannelIds: Set<string>,
): AcquisitionChannelRow | null {
  const compat = channels
    .filter((c) => compatChannelIds.has(c.id))
    .sort((a, b) => a.sort_order - b.sort_order);
  return compat[0] ?? null;
}

/** Copy helper for stage-aware "why". Never mentions stage if stage unknown. */
export function whySystem(sys: GrowthSystemCatalogRow, offerTier: string, stage: Stage | null) {
  const stageMatch = stage ? sys.recommended_stages?.includes(stage) : false;
  if (stage && stageMatch) {
    return `Recommended because ${sys.label} supports ${offerTier} offers and fits the ${stage} stage.`;
  }
  return `${sys.label} supports ${offerTier} offers.`;
}
