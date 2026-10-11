// Phase 2: shared Ecosystem relationships section in the Universal Offer Editor.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

import OfferRelationshipsSection, { type RelationshipsController, type RelationshipOffer } from "./OfferRelationshipsSection";
import TierOfferDialog from "./TierOfferDialog";
import { OFFER_RELATIONSHIP_TYPES, OFFER_TIER_ECOSYSTEM_TAB, OFFER_TIERS, suggestedTiersFor } from "@shared/blueprintRegistry";
import { wouldCreateCycle, relationshipEndpoints } from "@/lib/offers/relationshipGraph";
import { emptyOfferDesign } from "../offerDesignTypes";

// Radix Select needs these in jsdom.
beforeEach(() => {
  (Element.prototype as any).hasPointerCapture ??= () => false;
  (Element.prototype as any).scrollIntoView ??= () => {};
  (Element.prototype as any).releasePointerCapture ??= () => {};
});

const offers: RelationshipOffer[] = [
  { id: "core-1", name: "Core A", tier: "core", sub_account_id: "ws" },
  { id: "free-1", name: "Free Guide", tier: "free", sub_account_id: "ws" },
  { id: "prem-1", name: "VIP", tier: "premium", sub_account_id: "ws" },
  { id: "legacy", name: "Orphan", tier: "low_ticket", sub_account_id: null },
];

const ctrl = (rows: any[] = [], over: Partial<RelationshipsController> = {}): RelationshipsController => ({
  rows, loading: false, add: vi.fn(async () => "new"), remove: vi.fn(async () => true), lastError: null, ...over,
});

const pick = async (name: string, option: RegExp) => {
  fireEvent.click(screen.getByRole("combobox", { name }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
};

describe("relationship graph helpers", () => {
  it("maps direction to source/target without reversing", () => {
    expect(relationshipEndpoints("incoming", "me", "x")).toEqual({ source_offer_id: "x", target_offer_id: "me" });
    expect(relationshipEndpoints("outgoing", "me", "x")).toEqual({ source_offer_id: "me", target_offer_id: "x" });
  });
  it("detects cycles", () => {
    const edges = [{ source_offer_id: "a", target_offer_id: "b" }, { source_offer_id: "b", target_offer_id: "c" }];
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
    expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
  });
  it("registry places Ecosystem per tier and suggests categories", () => {
    expect(OFFER_TIER_ECOSYSTEM_TAB).toEqual({ free: "offer", low_ticket: "offer", mid_ticket: "pricing", core: "pricing", premium: "pricing", continuity: "pricing" });
    expect(suggestedTiersFor("premium", "ascends_to", "incoming")).toEqual(["core"]);
  });
});

describe("OfferRelationshipsSection", () => {
  it("shows incoming and outgoing groups with registry labels, multiple per direction", () => {
    const rows = [
      { id: "r1", sub_account_id: "ws", source_offer_id: "free-1", target_offer_id: "core-1", relationship_type: "leads_into", notes: null },
      { id: "r2", sub_account_id: "ws", source_offer_id: "core-1", target_offer_id: "prem-1", relationship_type: "ascends_to", notes: null },
      { id: "r3", sub_account_id: "ws", source_offer_id: "core-1", target_offer_id: "free-1", relationship_type: "downsell", notes: null },
      { id: "r4", sub_account_id: "ws", source_offer_id: "prem-1", target_offer_id: "core-1", relationship_type: "retention", notes: null },
    ];
    const { container } = render(<OfferRelationshipsSection offerId="core-1" tier="core" workspaceId="ws" offers={offers} relationships={ctrl(rows)} />);
    const inc = container.querySelector('[data-relationship-group="incoming"]') as HTMLElement;
    const out = container.querySelector('[data-relationship-group="outgoing"]') as HTMLElement;
    expect(within(inc).getByText(OFFER_RELATIONSHIP_TYPES.leads_into.incoming)).toBeTruthy();
    expect(within(inc).getByText(OFFER_RELATIONSHIP_TYPES.retention.incoming)).toBeTruthy();
    expect(within(out).getByText(OFFER_RELATIONSHIP_TYPES.ascends_to.outgoing)).toBeTruthy();
    expect(within(out).getByText(OFFER_RELATIONSHIP_TYPES.downsell.outgoing)).toBeTruthy();
    expect(within(out).getByText("VIP")).toBeTruthy();
    expect(within(out).getByText("Premium Offers")).toBeTruthy();
  });

  it("creates incoming with selected offer as source, excludes self, disables no-workspace offers", async () => {
    const c = ctrl();
    render(<OfferRelationshipsSection offerId="prem-1" tier="premium" workspaceId="ws" offers={offers} relationships={c} />);
    fireEvent.click(screen.getByRole("button", { name: /Add relationship/ }));
    await pick("Direction", /Offers leading here/);
    await pick("Relationship type", /Upgrades from|Ascends from/);
    fireEvent.click(screen.getByRole("combobox", { name: "Related offer" }));
    expect(screen.queryByRole("option", { name: /^VIP/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Orphan/ }).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByRole("option", { name: /Core A/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save relationship/ }));
    await waitFor(() => expect(c.add).toHaveBeenCalledWith({ source_offer_id: "core-1", target_offer_id: "prem-1", relationship_type: "ascends_to" }));
  });

  it("supports all four types outgoing", async () => {
    for (const t of Object.keys(OFFER_RELATIONSHIP_TYPES) as (keyof typeof OFFER_RELATIONSHIP_TYPES)[]) {
      const c = ctrl();
      const { unmount } = render(<OfferRelationshipsSection offerId="core-1" tier="core" workspaceId="ws" offers={offers} relationships={c} />);
      fireEvent.click(screen.getByRole("button", { name: /Add relationship/ }));
      await pick("Relationship type", new RegExp(OFFER_RELATIONSHIP_TYPES[t].label.replace("/", "\\/")));
      await pick("Related offer", /Free Guide/);
      fireEvent.click(screen.getByRole("button", { name: /Save relationship/ }));
      await waitFor(() => expect(c.add).toHaveBeenCalledWith({ source_offer_id: "core-1", target_offer_id: "free-1", relationship_type: t }));
      unmount();
    }
  });

  it("disables duplicates and warns (non-blocking) about cycles", async () => {
    const rows = [{ id: "r1", sub_account_id: "ws", source_offer_id: "free-1", target_offer_id: "core-1", relationship_type: "ascends_to", notes: null }];
    const c = ctrl(rows);
    render(<OfferRelationshipsSection offerId="core-1" tier="core" workspaceId="ws" offers={offers} relationships={c} />);
    fireEvent.click(screen.getByRole("button", { name: /Add relationship/ }));
    // Default: outgoing ascends_to → Free Guide closes the loop free → core → free.
    await pick("Related offer", /Free Guide/);
    expect(document.querySelector("[data-cycle-warning]")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Save relationship/ }));
    await waitFor(() => expect(c.add).toHaveBeenCalled());
    // Incoming ascends_to from Free Guide already exists → disabled.
    fireEvent.click(screen.getByRole("button", { name: /Add relationship/ }));
    await pick("Direction", /Offers leading here/);
    fireEvent.click(screen.getByRole("combobox", { name: "Related offer" }));
    expect(screen.getByRole("option", { name: /Free Guide/ }).getAttribute("aria-disabled")).toBe("true");
  });

  it("removes once even on repeated clicks and shows save errors", async () => {
    let resolve!: (v: boolean) => void;
    const remove = vi.fn(() => new Promise<boolean>((r) => { resolve = r; }));
    const rows = [{ id: "r1", sub_account_id: "ws", source_offer_id: "core-1", target_offer_id: "prem-1", relationship_type: "ascends_to", notes: null }];
    render(<OfferRelationshipsSection offerId="core-1" tier="core" workspaceId="ws" offers={offers} relationships={ctrl(rows, { remove, lastError: "forbidden" })} />);
    const btn = screen.getByRole("button", { name: /Remove relationship with VIP/ });
    fireEvent.click(btn); fireEvent.click(btn);
    expect(remove).toHaveBeenCalledTimes(1);
    resolve(true);
    fireEvent.click(screen.getByRole("button", { name: /Add relationship/ }));
    expect(screen.getByText(/permission|allowed|access/i)).toBeTruthy();
  });

  it("blocks linking when the current offer has no workspace", () => {
    render(<OfferRelationshipsSection offerId="legacy" tier="low_ticket" workspaceId="ws" offers={offers} relationships={ctrl()} />);
    expect(screen.queryByRole("button", { name: /Add relationship/ })).toBeNull();
  });
});

describe("Ecosystem section placement in editors", () => {
  it.each(OFFER_TIERS.filter((t) => t !== "core"))("%s renders it once, with no placeholder, and never triggers design autosave", (tier) => {
    const onChange = vi.fn();
    const design = emptyOfferDesign();
    design.angle.main_offer_name = "X";
    if (tier === "premium") (design.angle as any).premium_mode = "upgrade";
    render(<TierOfferDialog open onOpenChange={() => {}} tier={tier} categoryLabel="Offer" offerId="o" initial={design} onChange={onChange}
      ecosystemSection={<div data-testid="eco">eco</div>} />);
    const tab = OFFER_TIER_ECOSYSTEM_TAB[tier];
    if (tab !== "offer") fireEvent.mouseDown(screen.getByRole("tab", { name: /Pricing/ }));
    expect(screen.getAllByTestId("eco")).toHaveLength(1);
    expect(screen.queryByText(/will be available soon/)).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Premium keeps an Upgrade pointer only in Upgrade mode", () => {
    const d = emptyOfferDesign(); d.angle.main_offer_name = "X";
    const { rerender } = render(<TierOfferDialog open onOpenChange={() => {}} tier="premium" categoryLabel="Premium" offerId="p" initial={d} onChange={() => {}} />);
    expect(document.querySelector("[data-relationship-hint]")).toBeNull();
    const up = { ...d, angle: { ...d.angle, premium_mode: "upgrade" } } as any;
    rerender(<TierOfferDialog open onOpenChange={() => {}} tier="premium" categoryLabel="Premium" offerId="p2" initial={up} onChange={() => {}} />);
    expect(document.querySelector("[data-relationship-hint]")).toBeTruthy();
  });
});
