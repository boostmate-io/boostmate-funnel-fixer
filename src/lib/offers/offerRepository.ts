// =============================================================================
// offerRepository — thin, storage-aware data access for offers.
//
// Offers currently live in two places (no migration, by design):
//  - Primary Core Offer  → business_blueprints.offer_stack (Angle/Stack/Pricing)
//  - All other offers    → public.offers rows (summary + optional data.design)
//
// Future editors, the AI Coach and the Irresistible Offer Builder should go
// through these helpers instead of talking to the tables directly.
// =============================================================================

import { supabase } from "@/integrations/supabase/client";
import {
  emptyOfferDesign,
  normalizeOfferDesign,
  type EcosystemTier,
  type OfferDesignData,
} from "@/components/business-blueprint/offerDesignTypes";
import type { EcosystemOfferRow } from "@/components/business-blueprint/useEcosystemOffers";
import { summarizeOfferDesign, summaryToRowData } from "./offerSummary";

export const OFFER_ROW_COLUMNS =
  "id,name,tier,source,blueprint_id,sort_order,data,user_id,sub_account_id";

/** Identifies an offer independent of where it is stored. */
export type OfferRef =
  | { kind: "primary"; blueprintId: string }
  | { kind: "ecosystem"; offerId: string };

export const isPrimaryRow = (row: Pick<EcosystemOfferRow, "source">) =>
  row.source === "blueprint_core";

// ---- Ecosystem rows ---------------------------------------------------------

export async function fetchEcosystemOffers(blueprintId: string) {
  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_ROW_COLUMNS)
    .eq("blueprint_id", blueprintId)
    .order("sort_order", { ascending: true });
  return { rows: (data ?? []) as unknown as EcosystemOfferRow[], error };
}

export async function insertEcosystemOffer(payload: {
  name: string;
  tier: EcosystemTier;
  source: EcosystemOfferRow["source"];
  blueprint_id: string;
  sub_account_id: string;
  user_id: string;
  sort_order: number;
  data: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("offers")
    .insert(payload as any)
    .select(OFFER_ROW_COLUMNS)
    .single();
  return { row: (data ?? null) as unknown as EcosystemOfferRow | null, error };
}

export async function updateEcosystemOffer(
  id: string,
  values: { name?: string; data?: Record<string, unknown> },
) {
  const { error } = await supabase.from("offers").update(values as any).eq("id", id);
  return { error };
}

export async function deleteEcosystemOffer(id: string) {
  const { error } = await supabase.from("offers").delete().eq("id", id);
  return { error };
}

// ---- Full design (Angle/Stack/Pricing) by OfferRef --------------------------

/** Load the full design for any offer, regardless of storage location. */
export async function loadOfferDesign(ref: OfferRef): Promise<OfferDesignData> {
  if (ref.kind === "primary") {
    const { data } = await supabase
      .from("business_blueprints")
      .select("offer_stack")
      .eq("id", ref.blueprintId)
      .maybeSingle();
    return normalizeOfferDesign((data as any)?.offer_stack);
  }
  const { data } = await supabase
    .from("offers")
    .select("data")
    .eq("id", ref.offerId)
    .maybeSingle();
  const stored = (data as any)?.data?.design;
  return stored ? normalizeOfferDesign(stored) : emptyOfferDesign();
}

/** Build the row values for saving a design onto a non-primary offer row. */
export function designToRowValues(
  design: OfferDesignData,
  existing: { name?: string; data?: Record<string, unknown> },
) {
  const s = summarizeOfferDesign(design);
  return {
    name: s.name || existing.name || "Untitled Core Offer",
    data: { ...summaryToRowData(existing.data, s), design },
  };
}

/** Persist a full design. Primary → blueprint column; others → offer row. */
export async function saveOfferDesign(ref: OfferRef, design: OfferDesignData) {
  if (ref.kind === "primary") {
    const { error } = await supabase
      .from("business_blueprints")
      .update({ offer_stack: design as any })
      .eq("id", ref.blueprintId);
    return { error };
  }
  const { data: current } = await supabase
    .from("offers")
    .select("name,data")
    .eq("id", ref.offerId)
    .maybeSingle();
  return updateEcosystemOffer(
    ref.offerId,
    designToRowValues(design, (current ?? {}) as any),
  );
}
