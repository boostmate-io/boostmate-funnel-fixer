import { describe, it, expect, vi, beforeEach } from "vitest";

const applyBlueprintWritesSpy = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/coach/applyBlueprintWrites", async (orig) => {
  const real: any = await orig();
  return { ...real, applyBlueprintWrites: (...a: any[]) => applyBlueprintWritesSpy(...a) };
});

import { applyScopedOfferWrites } from "./scopedOfferWrites";
import { applyScopedWrites } from "@/components/business-blueprint/offer/useOfferCoach";
import { emptyOfferDesign, type OfferDesignData } from "@/components/business-blueprint/offerDesignTypes";
import type { ScopedOfferCoach } from "@/components/business-blueprint/offer/OfferCoachScope";

const w = (path: string, value: string) => ({ path, label: path, value });

function makeScope(initial: OfferDesignData) {
  let design = structuredClone(initial);
  const scope: ScopedOfferCoach = {
    mode: "scoped", offerId: "extra-1", offerName: "Extra",
    getDesign: () => design,
    persistWrites: vi.fn(async (writes) => {
      const r = applyScopedOfferWrites(design, writes);
      design = r.next;
      return { appliedPaths: r.applied.map((x) => x.path), rejected: r.rejected, saved: true };
    }),
  };
  return { scope, get: () => design };
}

beforeEach(() => applyBlueprintWritesSpy.mockReset());

describe("applyScopedOfferWrites (pure)", () => {
  it("applies valid offer paths, coerces numbers, does not mutate input", () => {
    const base = emptyOfferDesign();
    const snap = JSON.stringify(base);
    const r = applyScopedOfferWrites(base, [
      w("offer_stack.angle.main_offer_name", "Extra Offer"),
      w("offer_stack.pricing.core_price", "1997"),
      w("offer_stack.stack.deliverables.0.name", "Kickoff call"),
    ]);
    expect(r.rejected).toEqual([]);
    expect(r.next.angle.main_offer_name).toBe("Extra Offer");
    expect(r.next.pricing.core_price).toBe(1997);
    expect(r.next.stack.deliverables[0].name).toBe("Kickoff call");
    expect(r.next.stack.deliverables[0].id).toBeTruthy();
    expect(JSON.stringify(base)).toBe(snap);
  });

  it("keeps existing list item keys (e.g. delivery_types) on update", () => {
    const base = emptyOfferDesign();
    base.stack.bonuses = [{ id: "b1", name: "Old", delivery_types: ["Video"] }];
    const r = applyScopedOfferWrites(base, [w("offer_stack.stack.bonuses.0.name", "New")]);
    expect(r.next.stack.bonuses[0]).toEqual({ id: "b1", name: "New", delivery_types: ["Video"] });
  });

  it.each([
    ["customer_clarity.avatar_who", "not_offer_design_path"],
    ["brand_strategy.positioning.statement", "not_offer_design_path"],
    ["offer_ecosystem.free.new_0.name", "not_offer_design_path"],
    ["offer_stack.ecosystem.x.name", "not_offer_design_path"],
    ["offer_stack.angle.__proto__.x", "not_offer_design_path"],
    ["offer_stack.angle.hook", "not_writable"],
    ["offer_stack.pricing.recurring_enabled", "not_writable"],
    ["offer_stack.pricing.premium_upgrade.price", "not_writable"],
    ["offer_stack.stack.deliverables.99.name", "invalid_list_index"],
  ])("rejects %s (%s)", (path, reason) => {
    const r = applyScopedOfferWrites(emptyOfferDesign(), [w(path, "x")]);
    expect(r.applied).toEqual([]);
    expect(r.rejected[0].reason).toBe(reason);
  });

  it("rejects non-string or oversized values", () => {
    const r = applyScopedOfferWrites(emptyOfferDesign(), [
      { path: "offer_stack.angle.core_outcome", label: "", value: 5 as any },
      w("offer_stack.angle.core_outcome", "x".repeat(6000)),
    ]);
    expect(r.rejected.map((x) => x.reason)).toEqual(["invalid_value", "invalid_value"]);
  });
});

describe("applyScopedWrites outcome reporting", () => {
  const mk = (res: any) => ({
    mode: "scoped" as const, offerId: "extra-1", offerName: "Extra",
    getDesign: () => emptyOfferDesign(), persistWrites: vi.fn(async () => res),
  });
  it("throws when every write is rejected (card must not show Applied)", async () => {
    const scope = mk({ appliedPaths: [], rejected: [{ write: w("x.y", "z"), reason: "not_offer_design_path" }], saved: false });
    await expect(applyScopedWrites(scope, [w("x.y", "z")])).rejects.toThrow();
    expect(applyBlueprintWritesSpy).not.toHaveBeenCalled();
  });
  it("throws when the save failed (retryable)", async () => {
    const scope = mk({ appliedPaths: ["offer_stack.angle.hook_x"], rejected: [], saved: false });
    await expect(applyScopedWrites(scope, [])).rejects.toThrow();
  });
  it("returns only accepted paths on partial success", async () => {
    const scope = mk({ appliedPaths: ["a"], rejected: [{ write: w("b", ""), reason: "not_writable" }], saved: true });
    await expect(applyScopedWrites(scope, [])).resolves.toEqual({ appliedPaths: ["a"] });
  });
});

describe("scoped Coach write-back (additional Core Offer)", () => {
  it("persists only valid writes to the open offer, never the Blueprint", async () => {
    const { scope, get } = makeScope(emptyOfferDesign());
    const res = await applyScopedWrites(scope, [
      w("offer_stack.angle.main_offer_name", "Extra v2"),
      w("customer_clarity.avatar_who", "should be rejected"),
    ]);
    expect(res).toEqual({ appliedPaths: ["offer_stack.angle.main_offer_name"] });
    expect(get().angle.main_offer_name).toBe("Extra v2");
    expect(applyBlueprintWritesSpy).not.toHaveBeenCalled();
  });
});
