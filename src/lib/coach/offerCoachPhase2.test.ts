// Universal Offer Coach — Phase 2: per-offer conversations + safe write-backs.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import { coachConversationKey } from "./useCoachChat";
import { applyScopedOfferWrites } from "./scopedOfferWrites";
import { gateOfferCoachWrites, resolveVirtualListPaths, validTierTab } from "@shared/offerAiPolicy";
import type { CoachContext } from "./types";

const ctx = (activeOffer: any): CoachContext => ({ businessContext: { subAccountId: "ws", activeOffer } } as any);
const A = "33333333-3333-3333-3333-333333333333";
const B = "44444444-4444-4444-4444-444444444444";

describe("conversation selection", () => {
  it("each non-Primary offer gets its own thread", () => {
    const a = coachConversationKey(ctx({ id: A, isPrimary: false, name: "A", tier: "free" }));
    const b = coachConversationKey(ctx({ id: B, isPrimary: false, name: "B", tier: "continuity" }));
    expect(a).toMatchObject({ scope: "offer", targetId: A });
    expect(b.targetId).toBe(B);
    // Reopening resolves to the same key
    expect(coachConversationKey(ctx({ id: A, isPrimary: false, name: "A", tier: "free" }))).toEqual(a);
  });
  it("Primary Core and Blueprint keep the existing workspace thread", () => {
    expect(coachConversationKey(ctx({ id: "primary", isPrimary: true, name: "P", tier: "core" }))).toEqual({ scope: "global", targetId: "__workspace__", label: "Business Coach" });
    expect(coachConversationKey(ctx(undefined)).scope).toBe("global");
    expect(coachConversationKey(null).scope).toBe("global");
  });
});

describe("non-Core write-back", () => {
  it("Free: format + value fields persist, price never written", () => {
    const r = applyScopedOfferWrites({} as any, [
      { path: "offer_stack.angle.offer_format", label: "", value: "Webinar" },
      { path: "offer_stack.angle.quick_win", label: "", value: "Script" },
      { path: "offer_stack.angle.next_step_cta", label: "", value: "Book a call" },
    ], "free");
    expect(r.rejected).toEqual([]);
    expect((r.next as any).angle).toEqual({ offer_format: "webinar", quick_win: "Script", next_step_cta: "Book a call" });
    expect(applyScopedOfferWrites({} as any, [{ path: "offer_stack.pricing.core_price", label: "", value: "49" }], "free").applied).toEqual([]);
  });
  it("Low/Mid: positive prices; zero/empty rejected; lists keep ids", () => {
    const design: any = { pricing: { core_price: "" }, stack: { deliverables: [{ id: "keep", name: "A", frequency: "weekly" }] } };
    expect(applyScopedOfferWrites(design, [{ path: "offer_stack.pricing.core_price", label: "", value: "0" }], "low_ticket").applied).toEqual([]);
    const r = applyScopedOfferWrites(design, [
      { path: "offer_stack.stack.deliverables.new_0.name", label: "", value: "B" },
      { path: "offer_stack.stack.deliverables.new_0.description", label: "", value: "b" },
      { path: "offer_stack.stack.deliverables.new_1.name", label: "", value: "C" },
    ], "mid_ticket", "stack");
    const list = (r.next as any).stack.deliverables;
    expect(list.map((d: any) => d.name)).toEqual(["A", "B", "C"]);
    expect(list[0]).toEqual({ id: "keep", name: "A", frequency: "weekly" });
    expect(list[1].id).toBeTruthy();
    expect(list[1].id).not.toBe(list[2].id);
    expect(design.stack.deliverables).toHaveLength(1);
  });
  it("Premium: mode + touch level validated, relationships untouched", () => {
    const ok = applyScopedOfferWrites({} as any, [
      { path: "offer_stack.angle.premium_mode", label: "", value: "upgrade" },
      { path: "offer_stack.stack.touch_level", label: "", value: "1:1, Done-for-you" },
    ], "premium");
    expect((ok.next as any).angle.premium_mode).toBe("upgrade");
    expect((ok.next as any).stack.touch_level).toEqual(["one_on_one", "done_for_you"]);
    expect(Object.keys(ok.next as any)).not.toContain("relationships");
    expect(applyScopedOfferWrites({} as any, [{ path: "offer_stack.angle.premium_mode", label: "", value: "hybrid" }], "premium").applied).toEqual([]);
  });
  it("Continuity: price per interval, interval preserved when price changes alone", () => {
    const design: any = { pricing: { recurring_offer: { monthly_price: 49, interval: "quarterly" } } };
    const r = applyScopedOfferWrites(design, [{ path: "offer_stack.pricing.recurring_offer.monthly_price", label: "", value: "129" }], "continuity", "pricing");
    expect((r.next as any).pricing.recurring_offer).toEqual({ monthly_price: 129, interval: "quarterly" });
    const t = applyScopedOfferWrites(design, [
      { path: "offer_stack.pricing.cancellation_terms", label: "", value: "Cancel anytime" },
      { path: "offer_stack.pricing.recurring_offer.ongoing_value", label: "", value: "New templates monthly" },
    ], "continuity");
    expect(t.rejected).toEqual([]);
    expect(applyScopedOfferWrites(design, [{ path: "offer_stack.pricing.recurring_offer.interval", label: "", value: "weekly" }], "continuity").applied).toEqual([]);
  });
  it("invalid batches never partially apply and hidden fields survive", () => {
    const design: any = { angle: { short_description: "x", hidden_legacy: "keep" } };
    const r = applyScopedOfferWrites(design, [
      { path: "offer_stack.angle.quick_win", label: "", value: "ok" },
      { path: "offer_stack.angle.premium_mode", label: "", value: "upgrade" },
    ], "low_ticket");
    expect(r.applied).toEqual([]);
    expect(r.rejected).toHaveLength(2);
    expect(r.next).toBe(design);
    const ok = applyScopedOfferWrites(design, [{ path: "offer_stack.angle.quick_win", label: "", value: "ok" }], "low_ticket");
    expect((ok.next as any).angle.hidden_legacy).toBe("keep");
  });
  it("wrong tab and other-offer paths are rejected", () => {
    expect(applyScopedOfferWrites({} as any, [{ path: "offer_stack.pricing.core_price", label: "", value: "500" }], "mid_ticket", "angle").applied).toEqual([]);
    expect(applyScopedOfferWrites({} as any, [{ path: "offer_ecosystem.free.new_0.name", label: "", value: "x" }], "free").applied).toEqual([]);
    expect(applyScopedOfferWrites({} as any, [{ path: "brand_voice.tone", label: "", value: "x" }], "premium").applied).toEqual([]);
  });
  it("Core additional offers keep the existing behaviour", () => {
    const r = applyScopedOfferWrites({} as any, [{ path: "offer_stack.angle.short_description", label: "", value: "d" }]);
    expect(r.applied).toHaveLength(1);
    expect(applyScopedOfferWrites({} as any, [{ path: "offer_stack.angle.quick_win", label: "", value: "q" }]).applied).toEqual([]);
  });
});

describe("server gate", () => {
  it("returns normalized string values and keeps virtual paths for the approval card", () => {
    const g = gateOfferCoachWrites({ tier: "premium", design: {}, writes: [
      { path: "offer_stack.stack.touch_level", value: ["VIP day"] },
      { path: "offer_stack.stack.deliverables.new_0.name", value: "Kickoff" },
    ] });
    expect(g.ok && g.writes).toEqual([
      { path: "offer_stack.stack.touch_level", value: "vip_day" },
      { path: "offer_stack.stack.deliverables.new_0.name", value: "Kickoff" },
    ]);
    expect(gateOfferCoachWrites({ tier: "free", design: {}, writes: [{ path: "offer_stack.pricing.core_price", value: 9 }] }).ok).toBe(false);
  });
  it("virtual list paths append after existing items", () => {
    expect(resolveVirtualListPaths({ stack: { bonuses: [{}, {}] } }, [{ path: "offer_stack.stack.bonuses.new_3.name", value: "x" }])[0].path)
      .toBe("offer_stack.stack.bonuses.2.name");
  });
  it("tab claims are validated against the persisted tier", () => {
    expect(validTierTab("continuity", "delivery")).toBe("delivery");
    expect(validTierTab("free", "pricing")).toBeNull();
    expect(validTierTab("enterprise", "offer")).toBeNull();
  });
});
