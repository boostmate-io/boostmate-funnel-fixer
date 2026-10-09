// =============================================================================
// offerSummary — single source of truth for turning a full Offer Design
// (Angle + Stack + Pricing) into the flat summary stored on an offer row
// (name, description, core_outcome, price, delivery_types).
//
// Used by:
//  - the primary Core Offer auto-sync (blueprint → blueprint_core offer row)
//  - the additional Core Offer editor (offer.data.design → offer row summary)
// =============================================================================

import {
  buildPromisePreview,
  type OfferDesignData,
} from "@/components/business-blueprint/offerDesignTypes";

export interface OfferSummary {
  /** Trimmed offer name, or "" when the design has none. */
  name: string;
  description: string;
  core_outcome: string;
  price: number | "";
  delivery_types: string[];
}

export function summarizeOfferDesign(design: OfferDesignData): OfferSummary {
  const angle = design?.angle ?? ({} as OfferDesignData["angle"]);
  const stack = design?.stack ?? ({} as OfferDesignData["stack"]);
  const pricing = design?.pricing ?? ({} as OfferDesignData["pricing"]);

  const promise = buildPromisePreview(angle.core_promise);
  const name = angle.main_offer_name?.trim() || "";
  const description = angle.short_description?.trim() || promise || "";
  const core_outcome =
    angle.core_outcome?.trim() || angle.core_promise?.desired_outcome?.trim() || "";
  const rawPrice = pricing.core_price;
  const price: number | "" = typeof rawPrice === "number" && Number.isFinite(rawPrice) ? rawPrice : "";

  const delivery_types = Array.from(
    new Set([
      ...(stack.deliverables ?? []).flatMap((d) => d?.delivery_types ?? []),
      ...(stack.support_channels ?? []).map((s) => s?.name).filter(Boolean),
    ]),
  ) as string[];

  return { name, description, core_outcome, price, delivery_types };
}

/** True when the design carries nothing worth syncing to a summary row. */
export function isSummaryEmpty(s: OfferSummary): boolean {
  return !s.name && !s.description && s.price === "";
}

/** Shape written into offers.data for a summary (keeps other keys intact). */
export function summaryToRowData<T extends Record<string, unknown>>(
  existing: T | undefined,
  s: OfferSummary,
) {
  return {
    ...(existing ?? {}),
    description: s.description,
    core_outcome: s.core_outcome,
    price: s.price,
    delivery_types: s.delivery_types,
  };
}
