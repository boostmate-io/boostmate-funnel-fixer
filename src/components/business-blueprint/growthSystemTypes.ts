// =============================================================================
// Growth System — strategic data shape (v2 redesign).
// Stored inside business_blueprints.growth_system JSON column.
// Funnel mappings live in their own table: public.growth_funnel_mappings.
// =============================================================================

import { Megaphone, Workflow, TrendingUp, type LucideIcon } from "lucide-react";

// ---------- Tab 1: Acquisition ----------------------------------------------

export interface AcquisitionData {
  traffic_sources: string[];           // multi-select + custom
  primary_entry_offer_id?: string;     // FK to a Free offer in public.offers
  lead_capture_method?: string;        // single value, predefined or custom
}

// ---------- Tab 3: Ascension ------------------------------------------------

export interface AscensionData {
  next_offer_after_core_id?: string;
  retention_offer_id?: string;
  referral_enabled: boolean;
  referral_description?: string;
  reactivation_enabled: boolean;
  reactivation_description?: string;
}

// ---------- Top-level -------------------------------------------------------

export interface GrowthSystemData {
  acquisition: AcquisitionData;
  ascension: AscensionData;
}

export type GrowthTab = "acquisition" | "architecture" | "ascension";

export interface GrowthTabConfig {
  id: GrowthTab;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const GROWTH_TABS: GrowthTabConfig[] = [
  {
    id: "acquisition",
    label: "Acquisition",
    icon: Megaphone,
    description: "How strangers enter your business ecosystem.",
  },
  {
    id: "architecture",
    label: "Funnel Architecture",
    icon: Workflow,
    description: "Map each offer to the funnel that sells it.",
  },
  {
    id: "ascension",
    label: "Ascension",
    icon: TrendingUp,
    description: "How buyers move deeper into your ecosystem.",
  },
];

// ---------- Defaults --------------------------------------------------------

export function emptyGrowthSystem(): GrowthSystemData {
  return {
    acquisition: {
      traffic_sources: [],
    },
    ascension: {
      referral_enabled: false,
      reactivation_enabled: false,
    },
  };
}

export function normalizeGrowthSystem(raw: unknown): GrowthSystemData {
  const empty = emptyGrowthSystem();
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, any>;
  const hasNewShape = r.acquisition && typeof r.acquisition === "object";
  if (!hasNewShape) return empty;
  return {
    acquisition: {
      traffic_sources: Array.isArray(r.acquisition?.traffic_sources)
        ? r.acquisition.traffic_sources
        : [],
      primary_entry_offer_id: r.acquisition?.primary_entry_offer_id ?? undefined,
      lead_capture_method: r.acquisition?.lead_capture_method ?? undefined,
    },
    ascension: {
      next_offer_after_core_id: r.ascension?.next_offer_after_core_id ?? undefined,
      retention_offer_id: r.ascension?.retention_offer_id ?? undefined,
      referral_enabled: !!r.ascension?.referral_enabled,
      referral_description: r.ascension?.referral_description ?? undefined,
      reactivation_enabled: !!r.ascension?.reactivation_enabled,
      reactivation_description: r.ascension?.reactivation_description ?? undefined,
    },
  };
}

// ---------- Static option lists ---------------------------------------------

export const TRAFFIC_SOURCE_OPTIONS = [
  "Organic Social",
  "Paid Ads",
  "SEO",
  "Referrals",
  "Partnerships",
  "Cold Outreach",
  "Affiliates",
  "Events",
];

export const LEAD_CAPTURE_OPTIONS = [
  "Landing Page",
  "Webinar Registration",
  "Quiz",
  "DM Funnel",
  "Free Call",
  "Application",
  "In-Person",
];

// ---------- Funnel types (also used as bridge to Funnel Builder) ------------

export type FunnelType =
  | "lead_magnet"
  | "slo_low_ticket"
  | "mid_ticket_sales"
  | "webinar_vsl"
  | "high_ticket_application"
  | "event_challenge";

export interface FunnelTypeConfig {
  id: FunnelType;
  label: string;
  short: string;
}

export const FUNNEL_TYPES: FunnelTypeConfig[] = [
  { id: "lead_magnet", label: "Lead Magnet Funnel", short: "Lead Magnet" },
  { id: "slo_low_ticket", label: "SLO / Low-Ticket Course Funnel", short: "SLO" },
  { id: "mid_ticket_sales", label: "Mid-Ticket Sales Funnel", short: "Mid-Ticket Sales" },
  { id: "webinar_vsl", label: "Webinar / VSL Funnel", short: "Webinar / VSL" },
  { id: "high_ticket_application", label: "High Ticket Application Funnel", short: "Application" },
  { id: "event_challenge", label: "Event / Challenge Funnel", short: "Event / Challenge" },
];

export function getFunnelTypeLabel(t: string): string {
  return FUNNEL_TYPES.find((f) => f.id === t)?.label || t;
}

// ---------- Funnel Mapping row (matches DB table) ---------------------------

export interface FunnelMappingRow {
  id: string;
  blueprint_id: string;
  sub_account_id: string;
  user_id: string;
  offer_id: string | null;
  funnel_type: FunnelType;
  purpose: string;
  traffic_sources: string[];
  next_offer_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---------- Progress calculation --------------------------------------------

export function calcAcquisitionProgress(a: AcquisitionData): number {
  if (!a) return 0;
  let score = 0;
  if ((a.traffic_sources?.length ?? 0) > 0) score += 40;
  if (a.primary_entry_offer_id) score += 30;
  if (a.lead_capture_method?.trim()) score += 30;
  return Math.min(100, score);
}

export function calcArchitectureProgress(mappings: FunnelMappingRow[]): number {
  if (!mappings || mappings.length === 0) return 0;
  // Reward count + completeness of each mapping
  const perMapping = mappings.map((m) => {
    let s = 0;
    if (m.offer_id) s += 50;
    if (m.funnel_type) s += 25;
    if (m.purpose?.trim()) s += 15;
    if ((m.traffic_sources?.length ?? 0) > 0) s += 10;
    return Math.min(100, s);
  });
  const avg = perMapping.reduce((a, b) => a + b, 0) / perMapping.length;
  // Soft cap: 1 mapping = max 60%, 2 = 80%, 3+ = 100% of avg
  const countMultiplier = mappings.length >= 3 ? 1 : mappings.length === 2 ? 0.8 : 0.6;
  return Math.round(avg * countMultiplier);
}

export function calcAscensionProgress(a: AscensionData): number {
  if (!a) return 0;
  let score = 0;
  if (a.next_offer_after_core_id) score += 30;
  if (a.retention_offer_id) score += 30;
  if (a.referral_enabled) {
    score += 10;
    if (a.referral_description?.trim()) score += 10;
  } else {
    score += 10;
  }
  if (a.reactivation_enabled) {
    score += 5;
    if (a.reactivation_description?.trim()) score += 5;
  } else {
    score += 10;
  }
  return Math.min(100, score);
}

export function calculateGrowthSystemProgress(
  data: GrowthSystemData,
  mappings: FunnelMappingRow[],
): number {
  const a = calcAcquisitionProgress(data.acquisition);
  const f = calcArchitectureProgress(mappings);
  const x = calcAscensionProgress(data.ascension);
  return Math.round((a + f + x) / 3);
}
