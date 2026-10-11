// Universal Offer Coach — Phase 3: the shared Coach in every non-Core editor.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const openCoach = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ activeSubAccountId: "ws-1" }), useOptionalWorkspace: () => ({ activeSubAccountId: "ws-1" }) }));
vi.mock("@/hooks/useCurrency", () => ({ useCurrency: () => ({ symbol: "€", currency: "EUR" }) }));
vi.mock("../SectionHelpCoach", () => ({ default: () => null }));
vi.mock("@/contexts/CoachContext", () => {
  const api = { open: false, focus: null, focusTurn: null, openCoach: (...a: any[]) => openCoach(...a), closeCoach: vi.fn() };
  return { useOptionalCoach: () => api, useCoach: () => api, CoachProvider: ({ children }: any) => children };
});

import TierOfferDialog from "./TierOfferDialog";
import { emptyOfferDesign } from "../offerDesignTypes";
import { offerTabsForTier, type OfferTier } from "@shared/blueprintRegistry";
import { friendlyCoachError } from "@/lib/coach/useCoachChat";

const TIERS: OfferTier[] = ["free", "low_ticket", "mid_ticket", "premium", "continuity"];
const ID = "55555555-5555-5555-5555-555555555555";

function mount(tier: OfferTier, persist = vi.fn(async () => ({ appliedPaths: ["x"], rejected: [], saved: true })), withPersist = true) {
  const d = emptyOfferDesign();
  d.angle.main_offer_name = "Test offer";
  render(
    <TierOfferDialog open onOpenChange={() => {}} tier={tier} categoryLabel={tier} offerId={ID}
      initial={d} onChange={() => {}} persistWrites={withPersist ? persist : undefined} />,
  );
  return { dialog: screen.getByRole("dialog"), persist };
}

beforeEach(() => openCoach.mockReset());

describe("Coach activation per category", () => {
  for (const tier of TIERS) {
    it(`${tier}: header Coach opens this offer's scope with the real category and tab`, () => {
      const { dialog } = mount(tier);
      fireEvent.click(within(dialog).getByLabelText("Open AI Coach"));
      const focus = openCoach.mock.calls[0][0];
      expect(focus.activeOffer).toMatchObject({ id: ID, tier, isPrimary: false });
      expect(focus.activeOffer.getTabId()).toBe(offerTabsForTier(tier)[0].id);
      expect(focus.key).toBe(`offer:${ID}`);
      expect(within(dialog).getAllByLabelText(/^AI Coach — /).length).toBeGreaterThan(0);
    });
  }

  it("multi-tab editors keep the Coach tab in sync", () => {
    const { dialog } = mount("mid_ticket");
    const pricing = within(dialog).getByRole("tab", { name: "Pricing" });
    fireEvent.mouseDown(pricing, { button: 0 });
    fireEvent.click(within(dialog).getByLabelText("Open AI Coach"));
    expect(openCoach.mock.calls[0][0].activeOffer.getTabId()).toBe("pricing");
  });

  it("no save-by-ID handler → Coach stays off (never falls back to the Blueprint)", () => {
    const { dialog } = mount("free", undefined, false);
    expect(within(dialog).queryByLabelText("Open AI Coach")).toBeNull();
    expect(within(dialog).queryAllByLabelText("Open AI Coach for this field")).toHaveLength(0);
  });
});

describe("field + section assistance", () => {
  it("specialized fields get a field Coach; approval saves through this offer only", async () => {
    const { dialog, persist } = mount("premium");
    const label = within(dialog).getByText("Premium Type");
    const btn = within(label.parentElement!).getByLabelText("Open AI Coach for this field");
    fireEvent.click(btn);
    const focus = openCoach.mock.calls[0][0];
    expect(focus.target.id).toBe("offer_stack.angle.premium_mode");
    expect(focus.activeOffer.id).toBe(ID);
    focus.onApply("upgrade");
    await Promise.resolve();
    expect(persist).toHaveBeenCalledWith([{ path: "offer_stack.angle.premium_mode", label: "Premium Type", value: "upgrade" }]);
  });

  it("Continuity recurring price + billing interval + cancellation terms have field Coach", () => {
    const { dialog } = mount("continuity");
    fireEvent.mouseDown(within(dialog).getByRole("tab", { name: "Pricing" }), { button: 0 });
    for (const text of ["Recurring Price", "Billing Interval", "Cancellation Terms"]) {
      const el = within(dialog).getAllByText(text)[0];
      expect(within(el.parentElement!).getByLabelText("Open AI Coach for this field")).toBeTruthy();
    }
  });

  it("section Coach is scoped to this offer, tab and section fields", () => {
    const { dialog } = mount("free");
    fireEvent.click(within(dialog).getByLabelText("AI Coach — Value"));
    const focus = openCoach.mock.calls[0][0];
    expect(focus.scope).toBe("blueprint.section");
    expect(focus.target.subBlockId).toBe("offer");
    expect(focus.target.helper).toContain("offer_stack.angle.quick_win");
    expect(focus.target.helper).not.toContain("pricing");
    expect(focus.activeOffer.id).toBe(ID);
  });

  it("relationships never get Coach controls", () => {
    const { dialog } = mount("free");
    expect(within(dialog).queryByLabelText("AI Coach — Ecosystem")).toBeNull();
  });
});

describe("friendly error messages", () => {
  const err = (status: number, code?: string) => ({ context: { status, clone: () => ({ json: async () => ({ code }) }) } });
  it("maps statuses and codes without internals", async () => {
    expect(await friendlyCoachError(err(403, "offer_conversation_mismatch"))).toMatch(/offer changed/);
    expect(await friendlyCoachError(err(403))).toMatch(/access/);
    expect(await friendlyCoachError(err(401))).toMatch(/session/);
    expect(await friendlyCoachError(err(500))).toMatch(/temporarily/);
    expect(await friendlyCoachError(new Error("boom"))).toMatch(/temporarily/);
  });
});
