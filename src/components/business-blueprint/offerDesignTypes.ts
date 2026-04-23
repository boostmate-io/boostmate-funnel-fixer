// =============================================================================
// Offer Design — structured data shape (v2 redesign)
// =============================================================================
// Stored inside business_blueprints.offer_stack JSON column.
// IMPORTANT: This is a clean-slate shape. Legacy free-text keys from the
// previous version (angle_main_offer_name as textarea, ladder_*, etc.) are
// stripped on load — see useBlueprint.ts.
// =============================================================================

import { Lightbulb, Layers, DollarSign, Network, type LucideIcon } from "lucide-react";

// ---------- Tab 1: Offer Angle ----------------------------------------------

export type TimeframeOption =
  | "7_days" | "30_days" | "60_days" | "90_days" | "6_months" | "12_months" | "custom";

export interface CoreTransformationPromise {
  desired_outcome: string;
  timeframe: TimeframeOption;
  timeframe_custom?: string;
  guarantee?: string;
}

export interface FrameworkPillar {
  id: string;
  name: string;
  description?: string;
}

export interface SignatureFramework {
  name?: string;
  description?: string;
  pillars: FrameworkPillar[];
}

export interface OfferAngleData {
  // 🆕 Top-of-tab essentials
  main_offer_name?: string;
  short_description?: string;
  core_outcome?: string;
  // Gusten 4-part differentiation
  angle_new_vehicle?: string;
  angle_better_results?: string;
  angle_faster_outcome?: string;
  angle_easier_process?: string;
  // 🆕 Signature framework / mechanism
  framework?: SignatureFramework;
  // Structured promise builder
  core_promise?: CoreTransformationPromise;
}

// ---------- Tab 2: Offer Stack ----------------------------------------------

export type DeliveryFrequency =
  | "one_time" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "ongoing";

export interface DeliverableCard {
  id: string;
  name: string;
  description?: string;
  delivery_types?: string[]; // 🆕 multi-select from delivery library
  frequency?: DeliveryFrequency;
}

export interface BonusCard {
  id: string;
  name: string;
  description?: string;
  perceived_value?: string;
}

export interface MilestoneCard {
  id: string;
  phase_name: string;
  description?: string;
  expected_outcome?: string;
}

// 🆕 Editable resource cards (replaces chips-only)
export interface ResourceCard {
  id: string;
  name: string;
  resource_type?: string; // optional, from delivery library
  description?: string;
}

// 🆕 Editable support channel cards (replaces chips-only)
export interface SupportChannelCard {
  id: string;
  name: string;
  description?: string;
  frequency?: string; // free-text e.g. "Daily 9-5", "Weekly office hours"
}

export interface OfferStackData {
  deliverables: DeliverableCard[];
  resources: ResourceCard[]; // 🆕 cards
  support_channels: SupportChannelCard[]; // 🆕 cards
  bonuses: BonusCard[];
  delivery_timeline: TimeframeOption | "";
  delivery_timeline_custom?: string;
  milestones: MilestoneCard[];
}

// ---------- Tab 3: Pricing --------------------------------------------------

export type PaymentPlanType = "full_pay" | "split_2" | "split_3" | "split_6" | "monthly" | "custom";

export interface PaymentPlan {
  id: string;
  type: PaymentPlanType;
  custom_label?: string;
  amount: number | "";
  duration?: string; // e.g. "3 months", "12 weeks"
}

export type GuaranteeType =
  | "none"
  | "refund"
  | "performance"
  | "milestone"
  | "custom";

export interface PremiumUpgrade {
  name?: string;
  price?: number | "";
  description?: string;
  additional_value?: string; // 🆕
}

// 🆕 Structured recurring offer mini-builder
export interface RecurringOffer {
  name?: string;
  monthly_price?: number | "";
  description?: string;
  ongoing_value?: string;
  delivery_types?: string[];
  interval?: "monthly" | "quarterly" | "yearly";
}

export interface PricingData {
  core_price: number | "";
  payment_plans: PaymentPlan[];
  recurring_enabled: boolean;
  recurring_offer?: RecurringOffer; // 🆕 structured
  premium_enabled: boolean;
  premium_upgrade?: PremiumUpgrade;
  guarantee_type: GuaranteeType;
  guarantee_details?: string; // 🆕 explains how the guarantee works
  guarantee_custom?: string; // legacy: only used when guarantee_type === "custom" label
}

// ---------- Top-level Offer Design Data --------------------------------------

export interface OfferDesignData {
  angle: OfferAngleData;
  stack: OfferStackData;
  pricing: PricingData;
  // Note: ecosystem (Tab 4) is stored in the public.offers table, NOT here.
}

// ---------- Tabs ------------------------------------------------------------

export type OfferTab = "angle" | "stack" | "pricing" | "ecosystem";

export interface OfferTabConfig {
  id: OfferTab;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const OFFER_TABS: OfferTabConfig[] = [
  { id: "angle", label: "Offer Angle", icon: Lightbulb,
    description: "Differentiate your method and craft your transformation promise." },
  { id: "stack", label: "Offer Stack", icon: Layers,
    description: "Define exactly what your clients receive." },
  { id: "pricing", label: "Pricing", icon: DollarSign,
    description: "Architect a pricing structure that converts." },
  { id: "ecosystem", label: "Offer Ecosystem", icon: Network,
    description: "Build your full value ladder — free to premium." },
];

// ---------- Defaults --------------------------------------------------------

export function emptyOfferDesign(): OfferDesignData {
  return {
    angle: {
      framework: { pillars: [] },
    },
    stack: {
      deliverables: [],
      resources: [],
      support_channels: [],
      bonuses: [],
      delivery_timeline: "",
      milestones: [],
    },
    pricing: {
      core_price: "",
      payment_plans: [],
      recurring_enabled: false,
      premium_enabled: false,
      guarantee_type: "none",
    },
  };
}

/**
 * Normalize raw JSON from the database into the v2 shape.
 * Drops any legacy keys (clean slate). Preserves new shape if already present.
 */
export function normalizeOfferDesign(raw: unknown): OfferDesignData {
  const empty = emptyOfferDesign();
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, any>;

  // Detect legacy format and discard.
  const hasNewShape = r.angle && typeof r.angle === "object"
    && r.stack && typeof r.stack === "object"
    && r.pricing && typeof r.pricing === "object";

  if (!hasNewShape) return empty;

  const angleRaw = r.angle || {};
  const stackRaw = r.stack || {};
  const pricingRaw = r.pricing || {};

  return {
    angle: {
      ...empty.angle,
      ...angleRaw,
      framework: {
        name: angleRaw.framework?.name,
        description: angleRaw.framework?.description,
        pillars: Array.isArray(angleRaw.framework?.pillars) ? angleRaw.framework.pillars : [],
      },
    },
    stack: {
      ...empty.stack,
      ...stackRaw,
      deliverables: Array.isArray(stackRaw.deliverables) ? stackRaw.deliverables : [],
      // 🆕 handle migration from old string[] templates_resources/support_system to card arrays
      resources: Array.isArray(stackRaw.resources)
        ? stackRaw.resources
        : Array.isArray(stackRaw.templates_resources)
          ? stackRaw.templates_resources.map((s: string) => ({
              id: crypto.randomUUID(), name: s, resource_type: s, description: "",
            }))
          : [],
      support_channels: Array.isArray(stackRaw.support_channels)
        ? stackRaw.support_channels
        : Array.isArray(stackRaw.support_system)
          ? stackRaw.support_system.map((s: string) => ({
              id: crypto.randomUUID(), name: s, description: "", frequency: "",
            }))
          : [],
      bonuses: Array.isArray(stackRaw.bonuses) ? stackRaw.bonuses : [],
      milestones: Array.isArray(stackRaw.milestones) ? stackRaw.milestones : [],
    },
    pricing: {
      ...empty.pricing,
      ...pricingRaw,
      payment_plans: Array.isArray(pricingRaw.payment_plans) ? pricingRaw.payment_plans : [],
      recurring_offer: pricingRaw.recurring_offer ?? (
        pricingRaw.recurring_enabled
          ? {
              monthly_price: pricingRaw.recurring_price ?? "",
              interval: pricingRaw.recurring_interval ?? "monthly",
            }
          : undefined
      ),
    },
  };
}

// ---------- Progress calculation --------------------------------------------

export function calcAngleProgress(a: OfferAngleData): number {
  if (!a) return 0;
  let score = 0;
  if (a.main_offer_name?.trim()) score += 10;
  if (a.short_description?.trim()) score += 10;
  if (a.core_outcome?.trim()) score += 10;
  if (a.angle_new_vehicle?.trim()) score += 10;
  if (a.angle_better_results?.trim()) score += 10;
  if (a.angle_faster_outcome?.trim()) score += 10;
  if (a.angle_easier_process?.trim()) score += 10;
  if (a.framework?.name?.trim()) score += 8;
  if ((a.framework?.pillars?.length ?? 0) >= 3) score += 7;
  const p = a.core_promise;
  if (p?.desired_outcome?.trim()) score += 10;
  if (p?.timeframe && (p.timeframe !== "custom" || p.timeframe_custom?.trim())) score += 5;
  return Math.min(100, score);
}

export function calcStackProgress(s: OfferStackData): number {
  if (!s) return 0;
  let score = 0;
  const deliverables = s.deliverables ?? [];
  const resources = s.resources ?? [];
  const supportChannels = s.support_channels ?? [];
  const bonuses = s.bonuses ?? [];
  const milestones = s.milestones ?? [];
  if (deliverables.length > 0) score += 25;
  if (deliverables.length >= 3) score += 10;
  if (resources.length > 0) score += 15;
  if (supportChannels.length > 0) score += 15;
  if (bonuses.length > 0) score += 10;
  if (s.delivery_timeline && (s.delivery_timeline !== "custom" || s.delivery_timeline_custom?.trim())) score += 10;
  if (milestones.length > 0) score += 10;
  if (milestones.length >= 3) score += 5;
  return Math.min(100, score);
}

export function calcPricingProgress(p: PricingData): number {
  let score = 0;
  if (typeof p.core_price === "number" && p.core_price > 0) score += 30;
  if (p.payment_plans.length > 0) score += 20;
  if (p.recurring_enabled) {
    if (p.recurring_offer?.name?.trim() && typeof p.recurring_offer?.monthly_price === "number") score += 15;
  } else {
    score += 5;
  }
  if (p.premium_enabled) {
    if (p.premium_upgrade?.name?.trim()) score += 15;
  } else {
    score += 5;
  }
  if (p.guarantee_type !== "none") {
    score += 10;
    if (p.guarantee_details?.trim()) score += 5;
  }
  return Math.min(100, score);
}

export function calcEcosystemProgress(tierCounts: Record<string, number>): number {
  const tiers = ["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"];
  const filled = tiers.filter((t) => (tierCounts[t] || 0) > 0).length;
  return Math.round((filled / tiers.length) * 100);
}

export function calculateOfferDesignProgress(
  data: OfferDesignData,
  ecosystemTierCounts: Record<string, number> = {},
): number {
  const a = calcAngleProgress(data.angle);
  const s = calcStackProgress(data.stack);
  const p = calcPricingProgress(data.pricing);
  const e = calcEcosystemProgress(ecosystemTierCounts);
  return Math.round((a + s + p + e) / 4);
}

// ---------- Helpers (preview text, labels) ----------------------------------

export const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  "7_days": "7 days",
  "30_days": "30 days",
  "60_days": "60 days",
  "90_days": "90 days",
  "6_months": "6 months",
  "12_months": "12 months",
  custom: "Custom",
};

export const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string }[] = [
  { value: "7_days", label: "7 days" },
  { value: "30_days", label: "30 days" },
  { value: "60_days", label: "60 days" },
  { value: "90_days", label: "90 days" },
  { value: "6_months", label: "6 months" },
  { value: "12_months", label: "12 months" },
  { value: "custom", label: "Custom" },
];

export const FREQUENCY_OPTIONS: { value: DeliveryFrequency; label: string }[] = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "ongoing", label: "Ongoing" },
];

export const PAYMENT_PLAN_TYPES: { value: PaymentPlanType; label: string }[] = [
  { value: "full_pay", label: "Full Pay" },
  { value: "split_2", label: "2 Pay" },
  { value: "split_3", label: "3 Pay" },
  { value: "split_6", label: "6 Pay" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export const GUARANTEE_OPTIONS: { value: GuaranteeType; label: string }[] = [
  { value: "none", label: "No Guarantee" },
  { value: "refund", label: "Refund Guarantee" },
  { value: "performance", label: "Performance Guarantee" },
  { value: "milestone", label: "Milestone Guarantee" },
  { value: "custom", label: "Custom" },
];

// ---------- 🆕 SHARED DELIVERY LIBRARY (used across all tabs) ---------------

export interface DeliveryCategory {
  id: string;
  label: string;
  items: string[];
}

export const DELIVERY_LIBRARY: DeliveryCategory[] = [
  {
    id: "resources",
    label: "Cheatsheets / Resources",
    items: [
      "Templates", "Ebooks", "Scripts", "Checklists", "Guides", "Swipe Files",
      "Vaults", "Calculators", "Calendars", "Workbooks", "Frameworks", "SOPs",
      "Resource Lists", "Blueprints", "Roadmaps", "Playbooks",
    ],
  },
  {
    id: "case_studies",
    label: "Case Studies / Content",
    items: [
      "Transformations", "VSL", "Customer Results", "Webinars", "BTS",
      "Project Walkthroughs", "Breakdowns", "Reports", "Deep Dives", "Documentary",
    ],
  },
  {
    id: "courses",
    label: "Courses",
    items: [
      "Masterclasses", "Trainings", "Workshops", "Tutorials", "Events",
      "Video Courses", "Summits", "Cohorts", "Bootcamps", "Guest Experts",
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      "Private Community", "Challenges", "Gamified Assignments", "Awards",
      "Certifications", "Accountability Groups", "VIP Groups", "Masterminds",
      "Progress Tracking", "Meetups", "Interviews",
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    items: [
      "Onboarding Calls", "Kickoff Calls", "1:1 Coaching Calls",
      "Consulting Calls", "Implementation Calls", "Q&A Calls", "Walkthrough Calls",
      "Mastermind Calls", "Group Calls", "Feedback Calls", "Intensives",
    ],
  },
];

// Flat list helper (for autocomplete fallbacks)
export const DELIVERY_LIBRARY_FLAT = DELIVERY_LIBRARY.flatMap((c) => c.items);

// Quick subsets for tabs that want focused chips
export const RESOURCE_QUICK_PICKS = DELIVERY_LIBRARY.find((c) => c.id === "resources")!.items;
export const SUPPORT_QUICK_PICKS = [
  "Slack", "WhatsApp", "Telegram", "Discord", "Email Support",
  "Private Community", "Weekly Calls", "Office Hours", "Voxer",
  "Q&A Calls", "1:1 Coaching Calls",
];

// ---------- Promise preview --------------------------------------------------

export function buildPromisePreview(p?: CoreTransformationPromise): string {
  if (!p?.desired_outcome?.trim()) return "";
  const outcome = p.desired_outcome.trim().replace(/[.!?]+$/, "");
  const tf = p.timeframe === "custom"
    ? p.timeframe_custom?.trim()
    : (p.timeframe ? TIMEFRAME_LABELS[p.timeframe] : "");
  return tf ? `${outcome} in ${tf}.` : `${outcome}.`;
}

// ---------- Ecosystem tier definitions --------------------------------------

export type EcosystemTier = "free" | "low_ticket" | "mid_ticket" | "core" | "premium" | "continuity";

export interface EcosystemTierConfig {
  id: EcosystemTier;
  label: string;
  description: string;
  examples: string;
  addLabel: string;
  emptyHint: string;
}

export const ECOSYSTEM_TIERS: EcosystemTierConfig[] = [
  {
    id: "free",
    label: "Free Offers",
    description: "Used to generate leads and build trust.",
    examples: "Lead magnets · free trainings · audits · webinars · quizzes",
    addLabel: "Add Free Offer",
    emptyHint: "No free offers yet. Generate lead magnet ideas.",
  },
  {
    id: "low_ticket",
    label: "Low Ticket Offers",
    description: "Convert leads into buyers quickly.",
    examples: "Workshops · mini courses · templates",
    addLabel: "Add Low Ticket Offer",
    emptyHint: "No low ticket offers yet. Generate buyer-qualifier ideas.",
  },
  {
    id: "mid_ticket",
    label: "Mid Ticket Offers",
    description: "Bridge between low ticket and core offers.",
    examples: "Courses · group programs · smaller consulting offers",
    addLabel: "Add Mid Ticket Offer",
    emptyHint: "No mid ticket offers yet. Generate bridge offer ideas.",
  },
  {
    id: "core",
    label: "Core Offer",
    description: "Auto-generated from your Offer Angle, Stack & Pricing.",
    examples: "Your flagship offer — synced from tabs 1–3.",
    addLabel: "Edit Core Offer",
    emptyHint: "Complete tabs 1–3 to auto-generate your core offer.",
  },
  {
    id: "premium",
    label: "Premium Offers",
    description: "Higher-touch premium offers.",
    examples: "VIP days · consulting · DFY · masterminds",
    addLabel: "Add Premium Offer",
    emptyHint: "No premium offers yet. Generate high-ticket ideas.",
  },
  {
    id: "continuity",
    label: "Continuity Offers",
    description: "Recurring retention offers.",
    examples: "Memberships · subscriptions · retainers · communities",
    addLabel: "Add Continuity Offer",
    emptyHint: "No continuity offers yet. Generate recurring revenue ideas.",
  },
];
