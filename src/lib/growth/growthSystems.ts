// Canonical Boostmate Growth Systems registry.
//
// This is the ONLY source of truth for Growth Systems the AI and the Roadmap
// are allowed to reference. Never invent new systems — extend this list here
// (or promote it to a `growth_systems` table later) instead.
//
// The AI Action `growth_assessment_analysis` receives this list via prompt
// injection, and `growth-analyze` rejects any `recommended_growth_system.id`
// that isn't in `GROWTH_SYSTEM_IDS`.

import type { GrowthStage, RelatedModule } from "./types";

export interface GrowthSystem {
  id: string;
  name: string;
  summary: string;
  stage_relevance: GrowthStage[];
  addresses: string;
  related_module?: RelatedModule;
}

const CATALOG: GrowthSystem[] = [
  {
    id: "audience-builder",
    name: "Audience Builder",
    summary:
      "Grow a warm audience of the right people through consistent content and outreach so future offers have somewhere to land.",
    stage_relevance: ["validate", "attract"],
    addresses: "audience growth and warm-lead flow",
    related_module: "funnels",
  },
  {
    id: "client-converter",
    name: "Client Converter",
    summary:
      "The core conversion path that turns interested prospects into paying clients — capture, nurture, and sales conversation.",
    stage_relevance: ["validate", "attract", "optimize"],
    addresses: "prospect-to-client conversion",
    related_module: "funnels",
  },
  {
    id: "offer-launcher",
    name: "Offer Launcher",
    summary:
      "A structured launch mechanic for validating or relaunching an offer to an existing audience with clear demand signals.",
    stage_relevance: ["validate", "optimize"],
    addresses: "offer validation and revenue events",
    related_module: "funnels",
  },
  {
    id: "launch-engine",
    name: "Launch Engine",
    summary:
      "A repeatable, scalable acquisition engine combining paid traffic, funnel, and delivery capacity for predictable growth.",
    stage_relevance: ["scale", "systemize"],
    addresses: "predictable, scalable acquisition",
    related_module: "funnels",
  },
];

/** Canonical set of allowed Growth System ids. */
export const GROWTH_SYSTEM_IDS = CATALOG.map((s) => s.id);

export function getGrowthSystems(): GrowthSystem[] {
  return CATALOG;
}

export function getGrowthSystemsForStage(stage: GrowthStage): GrowthSystem[] {
  return CATALOG.filter((s) => s.stage_relevance.includes(stage));
}

export function getGrowthSystemById(id: string): GrowthSystem | undefined {
  return CATALOG.find((s) => s.id === id);
}

export function isValidGrowthSystemId(id: unknown): id is string {
  return typeof id === "string" && GROWTH_SYSTEM_IDS.includes(id);
}

/** Serialize the catalog for injection into an AI prompt. */
export function serializeCatalogForPrompt(): string {
  return CATALOG.map(
    (s) =>
      `- id: ${s.id}\n  name: ${s.name}\n  stages: ${s.stage_relevance.join(", ")}\n  addresses: ${s.addresses}\n  summary: ${s.summary}`,
  ).join("\n");
}
