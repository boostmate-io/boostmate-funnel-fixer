// Growth Systems catalog (static now, dynamic-ready).
// The AI Action reads this list at call time and picks a system id from it.
//
// V2 note: to make this dynamic, replace `getGrowthSystems()` with a
// database read (e.g. a `growth_systems` table). Callers already use the
// getter, so no other code has to change.

import type { GrowthStage, RelatedModule } from "./types";

export interface GrowthSystem {
  id: string;
  name: string;
  summary: string;
  stage_relevance: GrowthStage[];
  addresses: string;                // primary dimension it fixes
  related_module?: RelatedModule;
}

const CATALOG: GrowthSystem[] = [
  {
    id: "outcome-delivery-loop",
    name: "Outcome Delivery Loop",
    summary: "A repeatable delivery structure that proves the offer works before scaling anything.",
    stage_relevance: ["validate"],
    addresses: "outcome delivery consistency",
    related_module: "offer-creator",
  },
  {
    id: "proof-collection-system",
    name: "Proof Collection System",
    summary: "Systematic capture of testimonials, case studies, and result artifacts from every client.",
    stage_relevance: ["validate", "attract"],
    addresses: "social proof / credibility",
    related_module: "blueprint",
  },
  {
    id: "primary-lead-channel",
    name: "Primary Lead Channel",
    summary: "One focused acquisition channel (organic, outreach, or ads) run consistently every week.",
    stage_relevance: ["attract"],
    addresses: "lead flow consistency",
    related_module: "funnels",
  },
  {
    id: "lead-capture-funnel",
    name: "Lead Capture Funnel",
    summary: "Capture form + follow-up automation so no lead falls through the cracks.",
    stage_relevance: ["attract"],
    addresses: "lead capture and follow-up",
    related_module: "funnels",
  },
  {
    id: "outreach-machine",
    name: "Outreach Machine",
    summary: "Structured cold outreach with tracked cadences and reply routing.",
    stage_relevance: ["attract"],
    addresses: "outbound lead generation",
    related_module: "outreach",
  },
  {
    id: "conversion-audit",
    name: "Conversion Audit",
    summary: "Map every step of the buyer journey and instrument drop-off between them.",
    stage_relevance: ["optimize"],
    addresses: "journey visibility and drop-off",
    related_module: "analytics",
  },
  {
    id: "revenue-per-customer-lift",
    name: "Revenue-per-Customer Lift",
    summary: "Bumps, upsells, and continuity engineered into the offer to raise avg. order value.",
    stage_relevance: ["optimize", "scale"],
    addresses: "revenue per customer / LTV",
    related_module: "offer-creator",
  },
  {
    id: "nurture-recovery-sequence",
    name: "Nurture & Recovery Sequence",
    summary: "Long-term email/DM nurture to convert leads that didn't buy the first time.",
    stage_relevance: ["optimize"],
    addresses: "handling of leads that didn't buy",
    related_module: "copy",
  },
  {
    id: "paid-acquisition-system",
    name: "Paid Acquisition System",
    summary: "Predictable paid channel with tracked CAC/LTV and reinvestment rules.",
    stage_relevance: ["scale"],
    addresses: "predictable acquisition economics",
    related_module: "funnels",
  },
  {
    id: "delivery-capacity-system",
    name: "Delivery Capacity System",
    summary: "Team, tooling, and SOPs sized to hold quality as volume grows.",
    stage_relevance: ["scale", "systemize"],
    addresses: "delivery scalability",
    related_module: "assets",
  },
  {
    id: "sop-and-delegation-stack",
    name: "SOP & Delegation Stack",
    summary: "Every recurring task documented and assigned to someone other than the founder.",
    stage_relevance: ["systemize"],
    addresses: "founder dependency",
    related_module: "assets",
  },
  {
    id: "owner-ceo-dashboard",
    name: "Owner CEO Dashboard",
    summary: "Weekly review structure that keeps the owner working ON the business.",
    stage_relevance: ["systemize"],
    addresses: "operational stability & oversight",
    related_module: "analytics",
  },
];

export function getGrowthSystems(): GrowthSystem[] {
  return CATALOG;
}

export function getGrowthSystemsForStage(stage: GrowthStage): GrowthSystem[] {
  return CATALOG.filter(s => s.stage_relevance.includes(stage));
}

export function getGrowthSystemById(id: string): GrowthSystem | undefined {
  return CATALOG.find(s => s.id === id);
}

/** Serialize the catalog for injection into an AI prompt. */
export function serializeCatalogForPrompt(): string {
  return CATALOG.map(s =>
    `- id: ${s.id}\n  name: ${s.name}\n  stages: ${s.stage_relevance.join(", ")}\n  addresses: ${s.addresses}\n  summary: ${s.summary}`
  ).join("\n");
}
