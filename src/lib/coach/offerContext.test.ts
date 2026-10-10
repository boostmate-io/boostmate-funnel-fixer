import { describe, expect, it, vi } from "vitest";
import {
  attributionPrefix,
  blueprintWithoutOfferDesign,
  offerContextPart,
  renderActiveOfferSection,
  renderOfferSwitchNote,
  renderRelatedOffersSection,
  resolveActiveOffer,
  summarizeRelatedOffers,
  type OfferRowLite,
} from "@shared/offerContext";
import { canApplyAcrossOffers, guardWritesForMessage, messageOfferId } from "./offerAttribution";
import type { CoachContext } from "./types";

const WS = "11111111-1111-4111-8111-111111111111";
const NEW_ID = "4e8ab314-0000-4000-8000-000000000001";
const MOMENTUM_ID = "4e8ab314-0000-4000-8000-000000000002";
const PRIMARY_ROW_ID = "4e8ab314-0000-4000-8000-000000000003";

const momentumDesign = { angle: { main_offer_name: "The Momentum Method", framework: { name: "Momentum Framework" }, core_outcome: "Consistent growth" } };
const rows: OfferRowLite[] = [
  { id: PRIMARY_ROW_ID, name: "Kwenie test", tier: "core", source: "blueprint_core", sub_account_id: WS, data: {} },
  { id: MOMENTUM_ID, name: "The Momentum Method", tier: "core", source: "manual", sub_account_id: WS, data: { design: momentumDesign, price: 997 } },
  { id: NEW_ID, name: "nieuw core offer", tier: "core", source: "manual", sub_account_id: WS, data: { design: { angle: { main_offer_name: "nieuw core offer" } } } },
  { id: "4e8ab314-0000-4000-8000-000000000004", name: "Free guide", tier: "free", source: "manual", sub_account_id: WS, data: { core_outcome: "Quick win" } },
];
const primaryDesign = { angle: { main_offer_name: "Kwenie test", core_outcome: "Primary outcome" } };

describe("active offer resolution (server)", () => {
  it("additional Core Offer receives its own context, identity from the DB", () => {
    const r = resolveActiveOffer({ id: NEW_ID, name: "spoofed", isPrimary: true }, rows[2], WS);
    expect(r.kind).toBe("additional");
    if (r.kind !== "additional") return;
    expect(r.offer.name).toBe("nieuw core offer");
    expect(r.offer.isPrimary).toBe(false);
    expect(r.offer.design).toEqual(rows[2].data!.design);
  });

  it("uses unsaved draft design but never the client's identity", () => {
    const draft = { angle: { main_offer_name: "draft name" } };
    const r = resolveActiveOffer({ id: NEW_ID, draftDesign: draft }, rows[2], WS);
    expect(r.kind === "additional" && r.offer.design).toEqual(draft);
    expect(r.kind === "additional" && r.offer.hasDraft).toBe(true);
    expect(r.kind === "additional" && r.offer.id).toBe(NEW_ID);
  });

  it("rejects invalid, missing and cross-workspace offer ids", () => {
    expect(resolveActiveOffer({ id: "nope" }, null, WS)).toEqual({ kind: "rejected", reason: "invalid_offer_id" });
    expect(resolveActiveOffer({ id: NEW_ID }, null, WS)).toEqual({ kind: "rejected", reason: "offer_not_found" });
    expect(resolveActiveOffer({ id: NEW_ID }, { ...rows[2], sub_account_id: "other" }, WS)).toEqual({
      kind: "rejected",
      reason: "offer_wrong_workspace",
    });
  });

  it("Primary behaviour unchanged: no claim → none; primary claim → primary", () => {
    expect(resolveActiveOffer(undefined, null, WS).kind).toBe("none");
    expect(resolveActiveOffer({ id: "primary" }, null, WS).kind).toBe("primary");
    expect(resolveActiveOffer({ id: PRIMARY_ROW_ID }, rows[0], WS).kind).toBe("primary");
  });
});

describe("prompt layers", () => {
  const r = resolveActiveOffer({ id: NEW_ID }, rows[2], WS);
  const offer = r.kind === "additional" ? r.offer : null!;

  it("Primary Offer data is not presented as the active offer", () => {
    const active = renderActiveOfferSection(offer);
    expect(active).toContain("nieuw core offer");
    expect(active).not.toContain("Kwenie test");
    expect(active).not.toContain("Momentum");
    const bp = blueprintWithoutOfferDesign({ customer_clarity: { a: 1 }, offer_stack: primaryDesign });
    expect(bp).toEqual({ customer_clarity: { a: 1 } });
  });

  it("a mostly empty offer is told not to inherit another offer's framework", () => {
    expect(renderActiveOfferSection(offer)).toMatch(/new and mostly empty/);
  });

  it("other offers appear only as related context, active excluded", () => {
    const related = summarizeRelatedOffers(rows, NEW_ID, primaryDesign);
    expect(related.map((o) => o.id)).not.toContain(NEW_ID);
    const section = renderRelatedOffersSection(related, "core")!;
    expect(section).toMatch(/^# RELATED OFFERS — ecosystem context \(NOT the active offer\)/);
    expect(section).toContain("The Momentum Method");
    expect(section).toContain("PRIMARY Core Offer");
    expect(section).toMatch(/NEVER copy another offer's framework/);
    // ladder order: free first
    expect(related[0].tier).toBe("free");
  });

  it("primary context excludes its own mirrored row from related offers", () => {
    const related = summarizeRelatedOffers(rows, PRIMARY_ROW_ID, primaryDesign);
    expect(related.some((o) => o.isPrimary)).toBe(false);
  });
});

describe("conversation attribution and switching", () => {
  const momentumPart = { type: "offer_context", offerId: MOMENTUM_ID, offerName: "The Momentum Method", tier: "core", isPrimary: false };
  const history = [
    { role: "user", content: "Help with framework", parts: [{ type: "text", text: "x" }, momentumPart] },
    { role: "assistant", content: "Momentum pillars…", parts: [{ type: "text", text: "y" }, momentumPart] },
  ];
  const r = resolveActiveOffer({ id: NEW_ID }, rows[2], WS);
  const nowPart = offerContextPart(r.kind === "additional" ? r.offer : null, false);

  it("history preserves offer attribution when replayed/summarised", () => {
    expect(attributionPrefix(history[1])).toBe(`[About offer "The Momentum Method" (id ${MOMENTUM_ID})] `);
    expect(attributionPrefix({ parts: [] })).toBe("");
  });

  it("switching Offer A → Offer B in the same conversation adds a switch note", () => {
    const note = renderOfferSwitchNote(history, nowPart)!;
    expect(note).toContain("OFFER SWITCH");
    expect(note).toContain("The Momentum Method");
    expect(note).toContain("nieuw core offer");
    expect(note).toMatch(/NOT facts about/);
  });

  it("no switch note while staying on the same offer", () => {
    expect(renderOfferSwitchNote([...history, { role: "user", parts: [nowPart] }], nowPart)).toBeNull();
  });
});

describe("apply guard (client)", () => {
  const ctxFor = (id: string | null) =>
    ({ businessContext: { activeOffer: id ? { id, isPrimary: id === "primary", name: "x", tier: "core" } : null } }) as unknown as CoachContext;
  const msgFor = (offerId: string) => ({ parts: [{ type: "offer_context", offerId } as never] });

  it("matching rules", () => {
    expect(canApplyAcrossOffers(null, NEW_ID)).toBe(true); // legacy untagged
    expect(canApplyAcrossOffers(NEW_ID, NEW_ID)).toBe(true);
    expect(canApplyAcrossOffers(MOMENTUM_ID, NEW_ID)).toBe(false);
    expect(canApplyAcrossOffers(NEW_ID, null)).toBe(false); // never onto the Primary
    expect(canApplyAcrossOffers("primary", null)).toBe(true);
    expect(canApplyAcrossOffers("primary", NEW_ID)).toBe(false);
    expect(messageOfferId(msgFor(NEW_ID))).toBe(NEW_ID);
  });

  it("a reply that arrives after switching offers is not applied", async () => {
    const handler = vi.fn(async () => ({ appliedPaths: ["offer_stack.angle.main_offer_name"] }));
    const blocked = vi.fn();
    // Reply generated for Momentum, user meanwhile switched to the new offer.
    const guarded = guardWritesForMessage(handler, msgFor(MOMENTUM_ID), ctxFor(NEW_ID), blocked)!;
    await expect(guarded([{ path: "offer_stack.angle.main_offer_name", label: "Name", value: "X" }])).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
    expect(blocked).toHaveBeenCalled();
  });

  it("scoped write-backs for the matching offer still go through", async () => {
    const handler = vi.fn(async () => ({ appliedPaths: ["p"] }));
    const guarded = guardWritesForMessage(handler, msgFor(NEW_ID), ctxFor(NEW_ID), () => {})!;
    await expect(guarded([{ path: "p", label: "l", value: "v" }])).resolves.toEqual({ appliedPaths: ["p"] });
  });
});
