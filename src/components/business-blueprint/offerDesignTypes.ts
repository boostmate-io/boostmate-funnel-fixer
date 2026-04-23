// Offer Design data shape — stored inside business_blueprints.offer_stack JSON column.
export interface OfferDesignData {
  // Tab 1: Offer Angle
  angle_new_vehicle?: string;
  angle_better_results?: string;
  angle_faster_outcome?: string;
  angle_easier_process?: string;
  angle_main_offer_name?: string;
  angle_core_promise?: string;
  // Tab 2: Offer Stack
  stack_core_deliverables?: string;
  stack_templates_resources?: string;
  stack_support_system?: string;
  stack_bonuses?: string;
  stack_delivery_timeline?: string;
  stack_milestones?: string;
  // Tab 3: Pricing
  pricing_core_price?: string;
  pricing_payment_plans?: string;
  pricing_recurring?: string;
  pricing_premium_upgrade?: string;
  pricing_guarantee?: string;
  // Tab 4: Value Ladder
  ladder_free_offer?: string;
  ladder_low_ticket?: string;
  ladder_core_offer?: string;
  ladder_premium_offer?: string;
  ladder_continuity?: string;
}

export type OfferSubBlock = "angle" | "stack" | "pricing" | "ladder";

export const OFFER_DESIGN_FIELDS: Record<OfferSubBlock, (keyof OfferDesignData)[]> = {
  angle: [
    "angle_new_vehicle",
    "angle_better_results",
    "angle_faster_outcome",
    "angle_easier_process",
    "angle_main_offer_name",
    "angle_core_promise",
  ],
  stack: [
    "stack_core_deliverables",
    "stack_templates_resources",
    "stack_support_system",
    "stack_bonuses",
    "stack_delivery_timeline",
    "stack_milestones",
  ],
  pricing: [
    "pricing_core_price",
    "pricing_payment_plans",
    "pricing_recurring",
    "pricing_premium_upgrade",
    "pricing_guarantee",
  ],
  ladder: [
    "ladder_free_offer",
    "ladder_low_ticket",
    "ladder_core_offer",
    "ladder_premium_offer",
    "ladder_continuity",
  ],
};

export function calculateOfferSubBlockProgress(data: OfferDesignData, block: OfferSubBlock): number {
  const fields = OFFER_DESIGN_FIELDS[block];
  const filled = fields.filter((f) => (data[f] || "").toString().trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

export function calculateOfferDesignProgress(data: OfferDesignData): number {
  const blocks: OfferSubBlock[] = ["angle", "stack", "pricing", "ladder"];
  const total = blocks.reduce((acc, b) => acc + calculateOfferSubBlockProgress(data, b), 0);
  return Math.round(total / blocks.length);
}
