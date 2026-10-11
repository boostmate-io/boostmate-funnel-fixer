import { describe, it, expect } from "vitest";
import { renderTierCoachBrief, summarizeRelatedOffers, renderRelatedOffersSection, describeOfferPrice } from "@shared/offerContext";
import { buildOfferEcosystemContext, renderOfferEcosystemContext } from "@shared/offerEcosystemContext";
import { renderOfferFieldReference } from "@shared/offerFieldReference";
import { offerAiPermission } from "@shared/offerAiPolicy";
import { OFFER_TIER_LAYOUTS } from "@shared/blueprintRegistry";

const WS = "ws-1";

describe("expanded category briefs", () => {
  it.each(["free", "low_ticket", "mid_ticket", "premium", "continuity"])("%s renders all parts", (t) => {
    const b = renderTierCoachBrief(t);
    expect(b).toMatch(/Category brief/);
    expect(b).toMatch(/What a strong offer looks like/);
    expect(b).toMatch(/Key decisions/);
    expect(b).toMatch(/Pricing:/);
    expect(b).toMatch(/Ecosystem:/);
    expect(b.length).toBeLessThan(2000);
  });
  it("category-specific rules", () => {
    expect(renderTierCoachBrief("free")).toMatch(/Never suggest a price/);
    expect(renderTierCoachBrief("free")).toMatch(/next step is optional/);
    expect(renderTierCoachBrief("mid_ticket")).toMatch(/don't assume it must be a stepping stone/);
    expect(renderTierCoachBrief("premium")).toMatch(/never require or create a link/);
    expect(renderTierCoachBrief("continuity")).toMatch(/per selected billing interval/);
    expect(renderTierCoachBrief("continuity")).toMatch(/Not necessarily a community/);
    expect(renderTierCoachBrief("core")).toBe("");
  });
});

describe("related offer prices", () => {
  it("missing vs zero vs one-time vs recurring", () => {
    expect(describeOfferPrice("low_ticket", { pricing: {} })).toBe("unknown");
    expect(describeOfferPrice("low_ticket", { pricing: { core_price: 0 } })).toBe("unknown");
    expect(describeOfferPrice("mid_ticket", { pricing: { core_price: 497 } })).toBe("497 one-time");
    expect(describeOfferPrice("free", { pricing: { core_price: 99 } })).toBe("free");
    expect(describeOfferPrice("continuity", { pricing: { recurring_offer: { monthly_price: 297, interval: "quarterly" } } })).toBe("297 recurring per quarter");
    expect(describeOfferPrice("continuity", { pricing: { recurring_offer: { monthly_price: 49 } } })).toMatch(/interval unknown/);
    expect(describeOfferPrice("continuity", {})).toBe("unknown (recurring)");
  });
  it("section lists prices and the no-estimate rule", () => {
    const rows = [
      { id: "a", name: "Core A", tier: "core", source: null, sub_account_id: WS, data: { design: { pricing: { core_price: 2000 } } } },
      { id: "b", name: "Club", tier: "continuity", source: null, sub_account_id: WS, data: { design: { pricing: { recurring_offer: { monthly_price: 50, interval: "monthly" } } } } },
      { id: "c", name: "Mini", tier: "low_ticket", source: null, sub_account_id: WS, data: {} },
    ] as any;
    const s = renderRelatedOffersSection(summarizeRelatedOffers(rows, null), "mid_ticket")!;
    expect(s).toContain("price: 2000 one-time");
    expect(s).toContain("price: 50 recurring per month");
    expect(s).toContain("price: unknown");
    expect(s).toMatch(/never estimate/);
  });
});

describe("ecosystem layer", () => {
  const offers = [
    { id: "core1", name: "Core", tier: "core", sub_account_id: WS },
    { id: "lead", name: "Lead", tier: "free", sub_account_id: WS },
    { id: "x", name: "Other WS", tier: "free", sub_account_id: "ws-2" },
  ];
  it("Core offer: links + funnels, read-only, workspace-filtered, with usage rules", () => {
    const ctx = buildOfferEcosystemContext({
      activeOfferId: "core1", subAccountId: WS, offers,
      relationships: [
        { source_offer_id: "lead", target_offer_id: "core1", relationship_type: "leads_into", sub_account_id: WS },
        { source_offer_id: "x", target_offer_id: "core1", relationship_type: "leads_into", sub_account_id: "ws-2" },
      ],
      funnels: [{ id: "f", name: "Webinar", linked_offer_id: "core1", sub_account_id: WS }],
    });
    const s = renderOfferEcosystemContext(ctx);
    expect(s).toMatch(/READ-ONLY/);
    expect(s).toContain('"Lead"');
    expect(s).not.toContain("Other WS");
    expect(s).toContain('Funnel: "Webinar"');
    expect(s).toMatch(/not mandatory steps/);
    expect(s).toMatch(/cannot create or change them/);
  });
  it("loaded-but-empty differs from failed load", () => {
    const empty = renderOfferEcosystemContext(buildOfferEcosystemContext({ activeOfferId: "core1", subAccountId: WS, offers, relationships: [], funnels: [] }));
    expect(empty).toMatch(/none recorded \(loaded successfully\)/);
    const failed = renderOfferEcosystemContext(null, "unavailable");
    expect(failed).toMatch(/couldn't be loaded/);
    expect(failed).toMatch(/Do NOT assume this offer has none/);
    expect(failed).not.toMatch(/none recorded/);
  });
});

describe("field reference (non-Core)", () => {
  it("premium shows helper, allowed values, current value and constraints", () => {
    const tab = OFFER_TIER_LAYOUTS.premium.tabs[0].id;
    const s = renderOfferFieldReference("premium", tab, { angle: { premium_mode: "upgrade" } });
    expect(s).toMatch(/Field reference/);
    expect(s).toMatch(/allowed values: .*standalone/);
    expect(s).toMatch(/current: upgrade/);
    expect(s).toMatch(/Constraints/);
  });
  it("continuity pricing tab lists billing interval values", () => {
    const tab = OFFER_TIER_LAYOUTS.continuity.tabs.find((t) => JSON.stringify(t).includes("recurring_offer.interval"))!.id;
    expect(renderOfferFieldReference("continuity", tab, {})).toMatch(/allowed values: .*monthly/);
  });
  it("nothing for Core, missing or invalid tab", () => {
    expect(renderOfferFieldReference("core", "angle", {})).toBe("");
    expect(renderOfferFieldReference("free", null, {})).toBe("");
    expect(renderOfferFieldReference("free", "nope", {})).toBe("");
  });
  it("AI write permissions unchanged (relationships/price on Free still blocked)", () => {
    expect(offerAiPermission("free", "offer_stack.pricing.core_price", "offer").write).toBe(false);
  });
});
