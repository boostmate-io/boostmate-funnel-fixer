// Per-tier Offer Editor layouts in the central registry.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  BLUEPRINT_FIELD_BY_PATH,
  BLUEPRINT_LISTS,
  OFFER_FORMAT_VALUES,
  OFFER_TIERS,
  OFFER_TIER_LAYOUTS,
  fieldsForTier,
  getOfferEditorFieldByPath,
  offerFieldStatus,
  offerLayoutItems,
  offerTabsForTier,
  renderBlueprintFieldPathsPrompt,
  renderBlueprintStructurePrompt,
} from "@shared/blueprintRegistry";
import { isWritablePath } from "@/lib/coach/applyBlueprintWrites";
import { offerEditorField } from "@/components/business-blueprint/registryUi";

const NEW_FIELDS = [
  "offer_stack.angle.problem_solved",
  "offer_stack.angle.quick_win",
  "offer_stack.angle.offer_format",
  "offer_stack.angle.next_step_cta",
  "offer_stack.pricing.cancellation_terms",
  "offer_stack.angle.premium_mode",
  "offer_stack.stack.touch_level",
];

describe("tab structure per tier", () => {
  const expected: Record<string, string[]> = {
    free: ["offer"],
    low_ticket: ["offer"],
    mid_ticket: ["angle", "stack", "pricing"],
    core: ["angle", "stack", "pricing"],
    premium: ["angle", "stack", "pricing"],
    continuity: ["angle", "delivery", "pricing"],
  };
  it.each(OFFER_TIERS)("%s", (tier) => {
    expect(offerTabsForTier(tier).map((t) => t.id)).toEqual(expected[tier]);
    expect(fieldsForTier(tier).layout).toBe(OFFER_TIER_LAYOUTS[tier]);
  });
  it("tab labels", () => {
    expect(offerTabsForTier("continuity").map((t) => t.label)).toEqual(["Offer Angle", "Delivery & Value", "Pricing"]);
    expect(offerTabsForTier("free")[0].label).toBe("Offer");
  });
});

describe("layout integrity", () => {
  it.each(OFFER_TIERS)("%s: every item exists, no duplicates, deterministic order", (tier) => {
    const items = offerLayoutItems(tier);
    const keys = items.map((i) => (i.kind === "relationship" ? `rel:${i.relationship}` : i.path));
    expect(new Set(keys).size).toBe(keys.length);
    for (const i of items) {
      if (i.kind === "field") expect(getOfferEditorFieldByPath(i.path), i.path).toBeDefined();
      if (i.kind === "list") expect(BLUEPRINT_LISTS.some((l) => l.basePath === i.path), i.path).toBe(true);
    }
    expect(offerLayoutItems(tier).map((i) => (i.kind === "relationship" ? i.relationship : i.path))).toEqual(
      keys.map((k) => k.replace(/^rel:/, "")),
    );
  });
  it.each(OFFER_TIERS)("%s: only the name is 'min' besides the price", (tier) => {
    const mins = offerLayoutItems(tier).filter((i) => i.status === "min").map((i) => (i.kind === "relationship" ? "" : i.path));
    expect(mins[0]).toBe("offer_stack.angle.main_offer_name");
    for (const p of mins.slice(1)) expect(p).toMatch(/price/);
  });
  it("free has no pricing; low ticket has no payment plans", () => {
    expect(offerLayoutItems("free").some((i) => i.kind !== "relationship" && i.path.includes("pricing"))).toBe(false);
    expect(offerFieldStatus("low_ticket", "offer_stack.pricing.payment_plans")).toBeUndefined();
    expect(offerFieldStatus("low_ticket", "offer_stack.pricing.core_price")).toBe("min");
  });
});

describe("Core layout mirrors the existing sub-blocks", () => {
  it("covers exactly the existing Coach-visible Core fields and lists, in order", () => {
    const paths = offerLayoutItems("core").map((i) => (i.kind === "relationship" ? "" : i.path));
    const existing = fieldsForTier("core").subBlocks.flatMap((sb) => [...sb.fields.map((f) => f.path), ...sb.lists.map((l) => l.basePath)]);
    expect(paths).toEqual(existing);
    for (const p of NEW_FIELDS) expect(paths).not.toContain(p);
  });
  it("has no wording overrides", () => {
    expect(offerLayoutItems("core").every((i) => !("editor" in i))).toBe(true);
    expect(offerEditorField("offer_stack.angle.main_offer_name", undefined, "core").label).toBe("Main Offer Name");
  });
});

describe("tier-specific wording", () => {
  it("non-core name/price labels resolve per tier, Core unchanged", () => {
    expect(offerEditorField("offer_stack.angle.main_offer_name").label).toBe("Main Offer Name");
    expect(offerEditorField("offer_stack.angle.main_offer_name", undefined, "low_ticket").label).toBe("Offer Name");
    expect(offerEditorField("offer_stack.pricing.core_price", undefined, "premium").label).toBe("Price");
    expect(offerEditorField("offer_stack.pricing.recurring_offer.monthly_price", undefined, "continuity").label).toBe("Recurring Price");
    // Core-only helpers keep their existing copy when no tier override applies
    expect(offerEditorField("offer_stack.pricing.core_price", undefined, "premium").helper).toBe("What buyers pay for this offer.");
  });
  it("free formats are registry-configured", () => {
    expect(offerEditorField("offer_stack.angle.offer_format").options).toBe(OFFER_FORMAT_VALUES);
    expect(OFFER_FORMAT_VALUES.map((v) => v.label)).toEqual(["PDF", "Assessment", "Webinar", "Challenge", "Consultation", "Mini-Course", "Other"]);
  });
});

describe("new fields stay editor-only", () => {
  it.each(NEW_FIELDS)("%s is not Coach-visible or writable", (p) => {
    const f = getOfferEditorFieldByPath(p)!;
    expect(f.editorOnly).toBe(true);
    expect(f.aiWritable).toBe(false);
    expect(f.countsTowardProgress).toBe(false);
    expect(BLUEPRINT_FIELD_BY_PATH[p]).toBeUndefined();
    expect(isWritablePath(p)).toBe(false);
  });
  it("do not appear in Coach prompts", () => {
    const prompts = renderBlueprintFieldPathsPrompt() + renderBlueprintStructurePrompt();
    for (const p of NEW_FIELDS) expect(prompts).not.toContain(p);
    expect(prompts).not.toContain("Quick Win");
  });
});
