// Universal Offer Coach — Phase 1: server authorization, tier-aware permissions,
// value validation, briefs and read-only ecosystem context.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { checkWorkspaceAccess, decideWorkspaceAccess } from "@shared/coachAuthorization";
import { offerAiPermission, offerAiWritablePaths, validateOfferAiWrites, parsePrice } from "@shared/offerAiPolicy";
import { buildOfferEcosystemContext, renderOfferEcosystemContext } from "@shared/offerEcosystemContext";
import { renderActiveOfferSection, resolveActiveOffer, renderTierCoachBrief } from "@shared/offerContext";
import {
  BLUEPRINT_FIELDS, BLUEPRINT_LISTS, DELIVERY_TYPE_VALUES, OFFER_TIERS, OFFER_TIER_COACH_BRIEFS,
  renderBlueprintFieldPathsPrompt, renderBlueprintStructurePrompt,
} from "@shared/blueprintRegistry";
import { DELIVERY_LIBRARY_FLAT } from "@/components/business-blueprint/offerDesignTypes";

const WS = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const OFFER = "33333333-3333-3333-3333-333333333333";

const rpc = (member: unknown, admin: unknown, fail = false) => ({
  rpc: vi.fn(async (fn: string) => {
    if (fail) return { data: null, error: { message: "x" } };
    return { data: fn === "is_sub_account_member" ? member : admin, error: null };
  }),
});

describe("workspace authorization", () => {
  it("allows members", async () => {
    expect(await checkWorkspaceAccess(rpc(true, false), "u", WS)).toEqual({ ok: true, via: "member" });
  });
  it("allows trusted app admins", async () => {
    expect(await checkWorkspaceAccess(rpc(false, true), "u", WS)).toEqual({ ok: true, via: "admin" });
  });
  it("rejects non-members", async () => {
    expect(await checkWorkspaceAccess(rpc(false, false), "u", WS)).toMatchObject({ ok: false, status: 403 });
  });
  it("fails closed on errors and missing session", async () => {
    expect(await checkWorkspaceAccess(rpc(true, true, true), "u", WS)).toMatchObject({ ok: false });
    expect(decideWorkspaceAccess(null, WS, { isMember: true, isAdmin: true })).toMatchObject({ ok: false, status: 401 });
  });
});

describe("server offer validation", () => {
  const row = (ws: string, tier: string) => ({ id: OFFER, name: "X", tier, source: "ecosystem", sub_account_id: ws, data: {} });
  it("rejects cross-workspace offers", () => {
    expect(resolveActiveOffer({ id: OFFER }, row(OTHER, "free"), WS)).toEqual({ kind: "rejected", reason: "offer_wrong_workspace" });
  });
  it("uses the database category over the client claim", () => {
    const r = resolveActiveOffer({ id: OFFER, tier: "core" }, row(WS, "continuity"), WS);
    expect(r.kind === "additional" && r.offer.tier).toBe("continuity");
  });
});

describe("tier-aware permissions", () => {
  it("Core permissions equal the existing registry flags", () => {
    for (const f of BLUEPRINT_FIELDS.filter((x) => x.path.startsWith("offer_stack.") && !/\.\d+\./.test(x.path))) {
      expect(offerAiPermission("core", f.path).write).toBe(f.aiWritable);
    }
    expect(offerAiPermission("core", "offer_stack.angle.quick_win").write).toBe(false);
    expect(offerAiPermission("core", "offer_stack.pricing.recurring_offer.monthly_price").write).toBe(false);
  });
  it("specialized fields are writable only in their own category", () => {
    expect(offerAiPermission("free", "offer_stack.angle.offer_format").write).toBe(true);
    expect(offerAiPermission("free", "offer_stack.angle.next_step_cta").write).toBe(true);
    expect(offerAiPermission("low_ticket", "offer_stack.angle.quick_win").write).toBe(true);
    expect(offerAiPermission("premium", "offer_stack.angle.premium_mode").write).toBe(true);
    expect(offerAiPermission("premium", "offer_stack.stack.touch_level").write).toBe(true);
    expect(offerAiPermission("continuity", "offer_stack.pricing.recurring_offer.interval").write).toBe(true);
    expect(offerAiPermission("continuity", "offer_stack.pricing.cancellation_terms").write).toBe(true);
    expect(offerAiPermission("mid_ticket", "offer_stack.angle.premium_mode").write).toBe(false);
    expect(offerAiPermission("free", "offer_stack.pricing.core_price").write).toBe(false);
  });
  it("respects the active tab", () => {
    expect(offerAiPermission("mid_ticket", "offer_stack.pricing.core_price", "angle")).toMatchObject({ write: false, reason: "other_tab" });
    expect(offerAiPermission("mid_ticket", "offer_stack.pricing.core_price", "pricing").write).toBe(true);
  });
  it("unknown tiers and relationships are never writable", () => {
    expect(offerAiPermission("enterprise", "offer_stack.angle.short_description").write).toBe(false);
    for (const t of OFFER_TIERS) expect(offerAiWritablePaths(t).some((p) => /relationship/.test(p))).toBe(false);
  });
});

describe("value validation", () => {
  it("rejects invalid enum and multi-select values", () => {
    expect(validateOfferAiWrites({ tier: "free", design: {}, writes: [{ path: "offer_stack.angle.offer_format", value: "podcast" }] }).ok).toBe(false);
    expect(validateOfferAiWrites({ tier: "premium", design: {}, writes: [{ path: "offer_stack.stack.touch_level", value: ["1:1", "magic"] }] }).ok).toBe(false);
    const ok = validateOfferAiWrites({ tier: "premium", design: {}, writes: [{ path: "offer_stack.stack.touch_level", value: ["1:1", "VIP day"] }] });
    expect(ok.ok && ok.design.stack.touch_level).toEqual(["one_on_one", "vip_day"]);
    expect(validateOfferAiWrites({ tier: "free", design: {}, writes: [{ path: "offer_stack.stack.delivery_types", value: ["Nope"] }] }).ok).toBe(false);
  });
  it("protects Free pricing", () => {
    expect(validateOfferAiWrites({ tier: "free", design: {}, writes: [{ path: "offer_stack.pricing.core_price", value: 49 }] }).ok).toBe(false);
  });
  it("keeps empty paid prices empty (no 0, no clearing)", () => {
    const base = { pricing: { core_price: "" } };
    for (const value of [0, "", null, "abc", -5]) {
      expect(validateOfferAiWrites({ tier: "low_ticket", design: base, writes: [{ path: "offer_stack.pricing.core_price", value }] }).ok).toBe(false);
    }
    const r = validateOfferAiWrites({ tier: "low_ticket", design: base, writes: [{ path: "offer_stack.pricing.core_price", value: "€1.500" }] });
    expect(r.ok && r.design.pricing.core_price).toBe(1500);
    expect(parsePrice("49,99")).toBe(49.99);
  });
  it("validates Continuity recurring price and interval", () => {
    const r = validateOfferAiWrites({ tier: "continuity", design: {}, writes: [
      { path: "offer_stack.pricing.recurring_offer.monthly_price", value: "129" },
      { path: "offer_stack.pricing.recurring_offer.interval", value: "Quarterly" },
    ] });
    expect(r.ok && r.design.pricing.recurring_offer).toEqual({ monthly_price: 129, interval: "quarterly" });
    expect(validateOfferAiWrites({ tier: "continuity", design: {}, writes: [{ path: "offer_stack.pricing.recurring_offer.interval", value: "weekly" }] }).ok).toBe(false);
  });
  it("preserves hidden fields and rejects the whole batch on any error", () => {
    const design = { angle: { short_description: "a", premium_mode: "upgrade" }, pricing: { premium_upgrade: { price: 999 } } };
    const r = validateOfferAiWrites({ tier: "free", design, writes: [{ path: "offer_stack.angle.quick_win", value: "Script in 10 min" }] });
    expect(r.ok && r.design).toEqual({ ...design, angle: { ...design.angle, quick_win: "Script in 10 min" } });
    const bad = validateOfferAiWrites({ tier: "free", design, writes: [
      { path: "offer_stack.angle.quick_win", value: "x" }, { path: "offer_stack.angle.premium_mode", value: "standalone" },
    ] });
    expect(bad.ok).toBe(false);
    expect(design.angle).not.toHaveProperty("quick_win");
  });
  it("respects list structure", () => {
    const design = { stack: { deliverables: [{ id: "d1", name: "A" }] } };
    const r = validateOfferAiWrites({ tier: "mid_ticket", design, writes: [
      { path: "offer_stack.stack.deliverables.0.description", value: "desc" },
      { path: "offer_stack.stack.deliverables.1.name", value: "B" },
    ] });
    expect(r.ok && r.design.stack.deliverables).toEqual([{ id: "d1", name: "A", description: "desc" }, { name: "B" }]);
    expect(validateOfferAiWrites({ tier: "mid_ticket", design, writes: [{ path: "offer_stack.stack.deliverables.5.name", value: "C" }] }).ok).toBe(false);
  });
});

describe("briefs + ecosystem context", () => {
  it("has a brief for every non-Core tier and none for Core", () => {
    for (const t of OFFER_TIERS.filter((x) => x !== "core")) expect(OFFER_TIER_COACH_BRIEFS[t as keyof typeof OFFER_TIER_COACH_BRIEFS].priorities.length).toBeGreaterThan(0);
    expect(renderTierCoachBrief("core")).toBe("");
    const core = renderActiveOfferSection({ id: OFFER, name: "C", tier: "core", isPrimary: false, design: {}, hasDraft: false });
    expect(core).not.toContain("Category brief");
    const free = renderActiveOfferSection({ id: OFFER, name: "F", tier: "free", isPrimary: false, design: {}, hasDraft: false });
    expect(free).toContain("Category brief");
  });
  it("Core prompts never contain the new metadata", () => {
    const prompts = renderBlueprintFieldPathsPrompt() + renderBlueprintStructurePrompt();
    expect(prompts).not.toContain("Category brief");
    expect(prompts).not.toContain(OFFER_TIER_COACH_BRIEFS.free.purpose);
  });
  it("delivery types mirror the editor library", () => {
    expect(DELIVERY_TYPE_VALUES).toEqual(DELIVERY_LIBRARY_FLAT);
  });
  it("ecosystem context is workspace-scoped and read-only", () => {
    const ctx = buildOfferEcosystemContext({
      activeOfferId: OFFER, subAccountId: WS,
      offers: [{ id: "a", name: "Lead magnet", tier: "free", sub_account_id: WS }, { id: "b", name: "Foreign", tier: "core", sub_account_id: OTHER }],
      relationships: [
        { source_offer_id: "a", target_offer_id: OFFER, relationship_type: "leads_into", sub_account_id: WS },
        { source_offer_id: OFFER, target_offer_id: "b", relationship_type: "ascends_to", sub_account_id: WS },
        { source_offer_id: "a", target_offer_id: OFFER, relationship_type: "retention", sub_account_id: OTHER },
      ],
      funnels: [{ id: "f1", name: "Webinar", linked_offer_id: OFFER, sub_account_id: WS }, { id: "f2", name: "X", linked_offer_id: OFFER, sub_account_id: OTHER }],
    });
    expect(ctx.readOnly).toBe(true);
    expect(ctx.incoming).toHaveLength(1);
    expect(ctx.outgoing).toHaveLength(0);
    expect(ctx.funnels.map((f) => f.id)).toEqual(["f1"]);
    expect(renderOfferEcosystemContext(ctx)).toContain("READ-ONLY");
    expect(BLUEPRINT_LISTS.length).toBeGreaterThan(0);
  });
});
