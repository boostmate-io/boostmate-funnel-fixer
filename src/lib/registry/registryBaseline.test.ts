// Baseline compatibility snapshots for the Blueprint Registry.
// These must stay byte-identical when the registry is extended with
// optional / editor-only metadata. Update snapshots ONLY for intentional
// Coach-facing changes.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  BLUEPRINT_FIELDS,
  BLUEPRINT_LISTS,
  BLUEPRINT_SUB_BLOCKS,
  BLUEPRINT_COLUMNS,
  renderBlueprintFieldPathsPrompt,
  renderBlueprintStructurePrompt,
} from "@shared/blueprintRegistry";
import { isWritablePath } from "@/lib/coach/applyBlueprintWrites";
import {
  calcAngleProgress,
  calcStackProgress,
  calcPricingProgress,
  calcEcosystemProgress,
  calculateOfferDesignProgress,
  emptyOfferDesign,
} from "@/components/business-blueprint/offerDesignTypes";

const coachView = () =>
  BLUEPRINT_FIELDS.map((f) => ({
    path: f.path, key: f.key, label: f.label, helper: f.helper ?? null, kind: f.kind,
    aiWritable: f.aiWritable, countsTowardProgress: f.countsTowardProgress, aliases: f.aliases,
    options: f.options ?? null,
  }));

const listView = () =>
  BLUEPRINT_LISTS.map((l) => ({
    basePath: l.basePath, label: l.label, itemLabel: l.itemLabel, aiWritable: l.aiWritable,
    countsTowardProgress: l.countsTowardProgress, aiIndexedCount: l.aiIndexedCount,
    suggestedCount: l.suggestedCount ?? null,
    itemFields: l.itemFields.map((i) => ({ key: i.key, label: i.label, kind: i.kind, helper: i.helper ?? null })),
  }));

export const PROBE_PATHS = [
  ...BLUEPRINT_FIELDS.map((f) => f.path),
  "offer_stack.stack.deliverables.7.name",
  "offer_stack.stack.deliverables.0.delivery_types",
  "offer_stack.stack.bonuses.0.delivery_types",
  "offer_stack.pricing.recurring_enabled",
  "offer_stack.pricing.premium_enabled",
  "offer_stack.pricing.recurring_offer.name",
  "offer_stack.pricing.recurring_offer.monthly_price",
  "offer_stack.pricing.premium_upgrade.price",
  "offer_stack.pricing.payment_plans.5.amount",
  "offer_stack.angle.framework.pillars.9.description",
  "offer_ecosystem.free.new_0.name",
  "customer_clarity.unknown_field",
  "name",
  "data.description",
];

describe("registry baseline (Coach-facing)", () => {
  it("field-paths prompt is unchanged", () => {
    expect(renderBlueprintFieldPathsPrompt()).toMatchSnapshot();
  });
  it("structure prompt is unchanged", () => {
    expect(renderBlueprintStructurePrompt()).toMatchSnapshot();
  });
  it("fields, lists, sub-blocks and columns are unchanged", () => {
    expect(coachView()).toMatchSnapshot();
    expect(listView()).toMatchSnapshot();
    expect(BLUEPRINT_SUB_BLOCKS).toMatchSnapshot();
    expect(BLUEPRINT_COLUMNS).toMatchSnapshot();
  });
  it("write-back validation accepts/rejects the same paths", () => {
    expect(Object.fromEntries(PROBE_PATHS.map((p) => [p, isWritablePath(p)]))).toMatchSnapshot();
  });
});

describe("offer progress baseline", () => {
  const full = {
    angle: {
      main_offer_name: "X", short_description: "d", core_outcome: "o",
      framework: { name: "F", pillars: [{ id: "1", name: "a" }, { id: "2", name: "b" }, { id: "3", name: "c" }] },
      core_promise: { desired_outcome: "r", timeframe: "custom", timeframe_custom: "" },
    },
    stack: {
      deliverables: [{ id: "1", name: "a" }], resources: [], support_channels: [{ id: "s", name: "x" }],
      bonuses: [], delivery_timeline: "30_days", milestones: [{ id: "m", phase_name: "p" }],
    },
    pricing: {
      core_price: 997, payment_plans: [{ id: "p", type: "split_3", amount: 350 }],
      recurring_enabled: true, premium_enabled: false, guarantee_type: "refund", guarantee_details: "",
    },
  } as any;
  it("progress values are unchanged", () => {
    const empty = emptyOfferDesign();
    expect({
      emptyAngle: calcAngleProgress(empty.angle),
      emptyStack: calcStackProgress(empty.stack),
      emptyPricing: calcPricingProgress(empty.pricing),
      angle: calcAngleProgress(full.angle),
      stack: calcStackProgress(full.stack),
      pricing: calcPricingProgress(full.pricing),
      eco: calcEcosystemProgress({ free: 2, core: 1, premium: 0 }),
      total: calculateOfferDesignProgress(full, { free: 1, core: 1 }),
    }).toMatchSnapshot();
  });
});
