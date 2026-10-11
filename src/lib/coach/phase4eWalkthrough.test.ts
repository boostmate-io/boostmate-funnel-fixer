import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isOfferFieldComplete, offerWalkthroughItems, nextWalkthroughItem, renderOfferWalkthroughState } from "@shared/offerWalkthrough";
import { OFFER_TIER_LAYOUTS } from "@shared/blueprintRegistry";
import { offerAiPermission } from "@shared/offerAiPolicy";

const tabsOf = (tier: string) => [...new Set(offerWalkthroughItems(tier, {}).map((i) => i.tabLabel))];
const server = readFileSync("supabase/functions/coach-chat/index.ts", "utf8");

describe("category order follows the editor layout", () => {
  it.each(["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"])("%s", (tier) => {
    const layout = (OFFER_TIER_LAYOUTS as any)[tier];
    const expected = layout.tabs.flatMap((t: any) => t.sections.flatMap((s: any) => s.items.filter((i: any) => i.kind !== "relationship").map((i: any) => i.path)));
    expect(offerWalkthroughItems(tier, {}).map((i) => i.path)).toEqual(expected);
  });
  it("tab structure per category", () => {
    expect(tabsOf("free")).toHaveLength(1);
    expect(tabsOf("low_ticket")).toHaveLength(1);
    expect(tabsOf("mid_ticket")).toHaveLength(3);
    expect(tabsOf("premium")).toHaveLength(3);
    expect(tabsOf("core")).toHaveLength(3);
    expect(tabsOf("continuity")[1]).toMatch(/Delivery/);
  });
  it("relationship items are never walkthrough fields", () => {
    expect(offerWalkthroughItems("premium", {}).some((i) => !i.path)).toBe(false);
  });
});

describe("completion logic", () => {
  it("prices: free 0 complete; paid missing/0 incomplete; continuity per interval path", () => {
    expect(isOfferFieldComplete("free", "offer_stack.pricing.core_price", { pricing: { core_price: 0 } })).toBe(true);
    expect(isOfferFieldComplete("low_ticket", "offer_stack.pricing.core_price", { pricing: {} })).toBe(false);
    expect(isOfferFieldComplete("low_ticket", "offer_stack.pricing.core_price", { pricing: { core_price: 0 } })).toBe(false);
    expect(isOfferFieldComplete("mid_ticket", "offer_stack.pricing.core_price", { pricing: { core_price: "497" } })).toBe(true);
    expect(isOfferFieldComplete("continuity", "offer_stack.pricing.recurring_offer.monthly_price", { pricing: { recurring_offer: { monthly_price: 49, interval: "yearly" } } })).toBe(true);
  });
  it("text, multi-select, lists, nested objects", () => {
    expect(isOfferFieldComplete("premium", "offer_stack.angle.premium_mode", { angle: { premium_mode: "upgrade" } })).toBe(true);
    expect(isOfferFieldComplete("premium", "offer_stack.angle.touch_level", { angle: { touch_level: [] } })).toBe(false);
    expect(isOfferFieldComplete("premium", "offer_stack.angle.touch_level", { angle: { touch_level: ["vip_day"] } })).toBe(true);
    expect(isOfferFieldComplete("core", "offer_stack.stack.deliverables", { stack: { deliverables: [{ id: "a", name: "" }] } })).toBe(false);
    expect(isOfferFieldComplete("core", "offer_stack.stack.deliverables", { stack: { deliverables: [{ id: "a", name: "Call" }] } })).toBe(true);
    expect(isOfferFieldComplete("core", "offer_stack.angle.short_description", { angle: { short_description: "  " } })).toBe(false);
  });
});

describe("next field, optional fields, tabs", () => {
  it("optional fields are never forced", () => {
    const items = offerWalkthroughItems("mid_ticket", {}).map((i) => ({ ...i, complete: i.status !== "optional" }));
    const { inTab, elsewhere } = nextWalkthroughItem(items, items[0].tabId);
    expect(inTab).toBeNull();
    expect(elsewhere).toBeNull();
  });
  it("next in active tab; when tab done, points to the other tab without writes", () => {
    const items = offerWalkthroughItems("mid_ticket", {});
    const first = items[0].tabId;
    const done = items.map((i) => ({ ...i, complete: i.tabId === first ? true : i.complete }));
    const { inTab, elsewhere } = nextWalkthroughItem(done, first);
    expect(inTab).toBeNull();
    expect(elsewhere!.tabId).not.toBe(first);
    const name = { angle: {} as any };
    for (const i of items.filter((x) => x.tabId === first)) name.angle[i.path.split(".").pop()!] = i.path.includes("framework") ? { name: "x" } : "filled";
    const text = renderOfferWalkthroughState({ tier: "mid_ticket", name: "M", design: name as any }, first)!;
    expect(text).toMatch(/do NOT propose writes for it from here/);
  });
  it("unknown tab → no writes", () => {
    expect(renderOfferWalkthroughState({ tier: "premium", name: "P", design: {} }, null)).toMatch(/make no writes/);
    expect(renderOfferWalkthroughState({ tier: "premium", name: "P", design: {} }, "bogus")).toMatch(/make no writes/);
  });
  it("each offer's state comes only from its own tier + design", () => {
    const a = renderOfferWalkthroughState({ tier: "free", name: "Lead", design: {} }, OFFER_TIER_LAYOUTS.free.tabs[0].id)!;
    const b = renderOfferWalkthroughState({ tier: "continuity", name: "Club", design: {} }, OFFER_TIER_LAYOUTS.continuity.tabs[0].id)!;
    expect(a).toContain('"Lead"');
    expect(a).not.toContain("recurring_offer");
    expect(b).toContain('"Club"');
  });
  it("discussed-but-not-applied fields are flagged", () => {
    const tab = OFFER_TIER_LAYOUTS.free.tabs[0].id;
    const first = offerWalkthroughItems("free", {})[0].path;
    expect(renderOfferWalkthroughState({ tier: "free", name: "L", design: {} }, tab, [first])).toMatch(/NEVER applied/);
  });
});

describe("server wiring", () => {
  it("non-Primary offers use the registry walkthrough; Primary keeps the Blueprint one", () => {
    expect(server).toMatch(/if \(activeOffer\) \{[\s\S]{0,300}renderOfferWalkthroughState/);
    expect(server).toContain("# Blueprint state — SINGLE SOURCE OF TRUTH (HARD CONSTRAINT)");
  });
  it("Primary-Core forced-write steps disabled for non-Core offers", () => {
    expect(server).toContain("isFocusTurn || nonCoreOffer");
  });
  it("permissions unchanged", () => {
    expect(offerAiPermission("free", "offer_stack.pricing.core_price", "offer").write).toBe(false);
  });
});
