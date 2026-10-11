import { describe, it, expect, vi } from "vitest";
import { applyScopedOfferWrites, checkTierApproval } from "./scopedOfferWrites";
import { emptyOfferDesign, type OfferDesignData } from "@/components/business-blueprint/offerDesignTypes";
import { applyScopedWrites } from "@/components/business-blueprint/offer/useOfferCoach";
import { OFFER_TIER_LAYOUTS } from "@shared/blueprintRegistry";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
import { toast } from "sonner";

const w = (path: string, value: string) => ({ path, label: path, value });
const design = (name: string): OfferDesignData => {
  const d = emptyOfferDesign();
  d.angle.main_offer_name = name;
  d.angle.offer_description = "Unsaved manual description";
  (d as any).recurring_offer = { hidden: "keep-me" };
  d.stack.deliverables = [{ id: "d1", name: "First" } as any, { id: "d2", name: "Second" } as any];
  return d;
};
const tabOf = (tier: string, path: string) =>
  (OFFER_TIER_LAYOUTS as any)[tier].tabs.find((t: any) => JSON.stringify(t).includes(`"${path}"`))?.id as string;

const NAME = "offer_stack.angle.main_offer_name";
const DESC = "offer_stack.angle.offer_description";
const PRICE = "offer_stack.pricing.core_price";

describe("Phase 3B — approval guard", () => {
  it("blocks unnamed offers with unsaved edits (no save, edits kept)", () => {
    const d = design("");
    const tab = tabOf("mid_ticket", DESC);
    expect(checkTierApproval({ tier: "mid_ticket", tabId: tab, design: d, writes: [w(DESC, "x")] })).toBe("name_required");
  });
  it("allows named offers on the correct tab", () => {
    const tab = tabOf("mid_ticket", DESC);
    expect(checkTierApproval({ tier: "mid_ticket", tabId: tab, design: design("Named"), writes: [w(DESC, "x")] })).toBeNull();
  });
  it("rejects writes for a field on another tab (e.g. after switching tabs)", () => {
    const angleTab = tabOf("mid_ticket", DESC);
    const priceTab = tabOf("mid_ticket", PRICE);
    expect(angleTab).not.toBe(priceTab);
    expect(checkTierApproval({ tier: "mid_ticket", tabId: priceTab, design: design("N"), writes: [w(DESC, "x")] })).toBe("wrong_tab");
  });
  it("never broadens when the tab is missing or invalid", () => {
    for (const tabId of [null, undefined, "nope"]) {
      expect(checkTierApproval({ tier: "premium", tabId, design: design("N"), writes: [w(DESC, "x")] })).toBe("tab_unknown");
    }
    expect(checkTierApproval({ tier: "bogus", tabId: "offer", design: design("N"), writes: [] })).toBe("tab_unknown");
  });
});

describe("Phase 3B — merge into live editor state", () => {
  it("only approved fields change; hidden fields and list ids/order preserved", () => {
    const live = design("Named");
    const tab = tabOf("mid_ticket", DESC);
    const r = applyScopedOfferWrites(live, [w("offer_stack.stack.deliverables.1.name", "Second+")], "mid_ticket", tabOf("mid_ticket", "offer_stack.stack.deliverables"));
    expect(r.applied.length).toBe(1);
    expect(r.next.angle.offer_description).toBe("Unsaved manual description");
    expect((r.next as any).recurring_offer.hidden).toBe("keep-me");
    expect(r.next.stack.deliverables.map((x: any) => x.id)).toEqual(["d1", "d2"]);
    expect(r.next.stack.deliverables[1].name).toBe("Second+");
    expect(tab).toBeTruthy();
  });
  it("approving while manual edits are pending merges onto the pending edits, not persisted data", async () => {
    const persisted = design("Named"); persisted.angle.offer_description = "OLD persisted";
    const live = design("Named"); // pending manual edit in editor
    const tab = tabOf("mid_ticket", NAME);
    const persist = vi.fn(async (writes: any[], ctx: any) => {
      const r = applyScopedOfferWrites(ctx.baseDesign ?? persisted, writes, "mid_ticket", ctx.tabId);
      return { appliedPaths: r.applied.map((x) => x.path), rejected: r.rejected, saved: true, design: r.next };
    });
    const res = await persist([w(NAME, "Renamed")], { tabId: tab, baseDesign: live });
    expect(res.design.angle.main_offer_name).toBe("Renamed");
    expect(res.design.angle.offer_description).toBe("Unsaved manual description");
  });
});

describe("Phase 3B — clear messages", () => {
  const scope = (reason: string) => ({
    mode: "scoped" as const, offerId: "o", offerName: "O", getDesign: () => emptyOfferDesign(),
    persistWrites: vi.fn(async (writes: any[]) => ({ appliedPaths: [], rejected: writes.map((write) => ({ write, reason })), saved: false })),
  });
  it.each([["name_required", /name/], ["wrong_tab", /another tab/], ["tab_unknown", /which tab/]])("%s", async (reason, msg) => {
    await expect(applyScopedWrites(scope(reason) as any, [w(DESC, "x")])).rejects.toThrow();
    expect((toast.error as any).mock.calls.at(-1)[0]).toMatch(msg);
  });
});

describe("Phase 3B — Core unchanged", () => {
  it("Core writes still apply without a tab", () => {
    const r = applyScopedOfferWrites(emptyOfferDesign(), [w(NAME, "Core X")]);
    expect(r.applied.length).toBe(1);
  });
});
