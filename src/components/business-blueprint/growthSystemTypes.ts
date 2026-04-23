// Growth System data shape — stored inside business_blueprints.growth_system JSON column.
export interface GrowthSystemData {
  // Tab 1: Traffic Engine
  traffic_primary_source?: string;
  traffic_secondary_source?: string;
  traffic_best_performing?: string;
  traffic_bottleneck?: string;
  // Tab 2: Funnel Ecosystem
  funnel_free_offer?: string;
  funnel_low_ticket?: string;
  funnel_core_offer?: string;
  funnel_application?: string;
  funnel_webinar_vsl?: string;
  funnel_missing_opportunities?: string;
  // Tab 3: Conversion System
  conversion_primary_mechanism?: string;
  conversion_followup_process?: string;
  conversion_sales_cycle?: string;
  conversion_bottleneck?: string;
  // Tab 4: Nurture System
  nurture_email?: string;
  nurture_retargeting?: string;
  nurture_organic_content?: string;
  nurture_dm_followup?: string;
  nurture_community?: string;
  nurture_biggest_gap?: string;
  // Tab 5: Ascension Flow
  ascension_entry_point?: string;
  ascension_next_upgrade?: string;
  ascension_premium_path?: string;
  ascension_retention_path?: string;
  ascension_monetization_gap?: string;
}

export type GrowthSubBlock = "traffic" | "funnels" | "conversion" | "nurture" | "ascension";

export const GROWTH_SYSTEM_FIELDS: Record<GrowthSubBlock, (keyof GrowthSystemData)[]> = {
  traffic: [
    "traffic_primary_source",
    "traffic_secondary_source",
    "traffic_best_performing",
    "traffic_bottleneck",
  ],
  funnels: [
    "funnel_free_offer",
    "funnel_low_ticket",
    "funnel_core_offer",
    "funnel_application",
    "funnel_webinar_vsl",
    "funnel_missing_opportunities",
  ],
  conversion: [
    "conversion_primary_mechanism",
    "conversion_followup_process",
    "conversion_sales_cycle",
    "conversion_bottleneck",
  ],
  nurture: [
    "nurture_email",
    "nurture_retargeting",
    "nurture_organic_content",
    "nurture_dm_followup",
    "nurture_community",
    "nurture_biggest_gap",
  ],
  ascension: [
    "ascension_entry_point",
    "ascension_next_upgrade",
    "ascension_premium_path",
    "ascension_retention_path",
    "ascension_monetization_gap",
  ],
};

export function calculateGrowthSubBlockProgress(data: GrowthSystemData, block: GrowthSubBlock): number {
  const fields = GROWTH_SYSTEM_FIELDS[block];
  const filled = fields.filter((f) => (data[f] || "").toString().trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

export function calculateGrowthSystemProgress(data: GrowthSystemData): number {
  const blocks: GrowthSubBlock[] = ["traffic", "funnels", "conversion", "nurture", "ascension"];
  const total = blocks.reduce((acc, b) => acc + calculateGrowthSubBlockProgress(data, b), 0);
  return Math.round(total / blocks.length);
}
