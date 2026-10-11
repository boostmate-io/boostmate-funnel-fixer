// Continuity in the Universal Offer Editor (registry-driven layout,
// summary seeding without writes, design → summary sync, Coach disabled).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";

const updateSpy = vi.fn(async () => ({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ activeSubAccountId: "ws-1" }), useOptionalWorkspace: () => ({ activeSubAccountId: "ws-1" }) }));
vi.mock("@/hooks/useCurrency", () => ({ useCurrency: () => ({ symbol: "€", currency: "EUR" }) }));
vi.mock("@/lib/coach/useCoachChat", () => ({
  useCoachChat: () => ({ conversationId: null, messages: [], status: "idle", error: null, sendMessage: vi.fn(), decisions: {}, recordDecision: vi.fn() }),
}));

let store: any[] = [];
const seed = () => [
  { id: "primary-1", name: "Primary", tier: "core", source: "blueprint_core", blueprint_id: "bp", sort_order: 0, data: {}, user_id: "u1", sub_account_id: "ws-1" },
  {
    id: "co-1", name: "Inner Circle", tier: "continuity", source: "blueprint_manual", blueprint_id: "bp", sort_order: 0,
    data: { description: "Monthly membership", core_outcome: "Momentum", delivery_types: ["Community"], price: 49, billing_interval: "monthly", funnel_id: "f-2" },
    user_id: "u1", sub_account_id: "ws-1",
  },
];
vi.mock("@/lib/offers/offerRepository", async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    fetchEcosystemOffers: vi.fn(async () => ({ rows: structuredClone(store), error: null })),
    updateEcosystemOffer: (...a: any[]) => updateSpy(...(a as [])),
    insertEcosystemOffer: vi.fn(), deleteEcosystemOffer: vi.fn(),
  };
});

import { CoachProvider } from "@/contexts/CoachContext";
import OfferEcosystemTab from "./OfferEcosystemTab";
import { emptyOfferDesign } from "../offerDesignTypes";
import { designForRow, designToRowValues } from "@/lib/offers/offerRepository";
import { offerTabsForTier, BILLING_INTERVAL_VALUES } from "@shared/blueprintRegistry";

const renderTab = () =>
  render(
    <CoachProvider>
      <OfferEcosystemTab blueprintId="bp" offerDesign={emptyOfferDesign()} saving={false} />
    </CoachProvider>,
  );


beforeEach(() => { store = seed(); updateSpy.mockClear(); });
const open = async () => { renderTab(); fireEvent.click(await screen.findByText("Inner Circle")); return screen.findByRole("dialog", { name: "Inner Circle" }); };
const done = async (d: HTMLElement) => { await act(async () => { fireEvent.click(within(d).getByRole("button", { name: "Done" })); }); };
const sections = (d: HTMLElement) => [...(d.querySelector("[role=tabpanel][data-state=active]") ?? d).querySelectorAll("[data-offer-section]")].map((s) => s.getAttribute("data-offer-section"));
const expand = (d: HTMLElement) => within((d.querySelector("[role=tabpanel][data-state=active]") as HTMLElement) ?? d).queryAllByText("More options").forEach((m) => fireEvent.click(m));
const goTab = (d: HTMLElement, name: string) => { const t = within(d).getByRole("tab", { name }); fireEvent.mouseDown(t); fireEvent.click(t); };

const panel = (d: HTMLElement) => (d.querySelector("[role=tabpanel][data-state=active]") as HTMLElement) ?? d;

describe("Continuity in the Universal Offer Editor", () => {
  it("three registry tabs/sections; all fields render; no Coach", async () => {
    const d = await open();
    expect(within(d).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Offer Angle", "Delivery & Value", "Pricing"]);
    const layout = offerTabsForTier("continuity");
    for (const [i, tab] of layout.entries()) {
      goTab(d, tab.label); expand(d);
      expect(sections(d)).toEqual(tab.sections.map((s) => s.id));
      for (const sec of tab.sections) expect(panel(d).querySelector(`[data-offer-section="${sec.id}"]`)!.children.length).toBeGreaterThan(1);
    }
    expect(within(d).queryAllByLabelText("Open AI Coach for this field")).toHaveLength(0);
  });
  it("seeds recurring price + interval from summary; open/close writes nothing", async () => {
    const d = await open(); goTab(d, "Pricing");
    expect((within(d).getByLabelText("Recurring Price") as HTMLInputElement).value).toBe("49");
    const sel = within(d).getByLabelText("Billing Interval") as HTMLSelectElement;
    expect(sel.value).toBe("monthly");
    expect([...sel.options].slice(1).map((o) => o.value)).toEqual(BILLING_INTERVAL_VALUES.map((o) => o.value));
    await done(d);
    expect(updateSpy).not.toHaveBeenCalled();
  });
  it("ongoing value, interval, price and cancellation persist with per-interval semantics", async () => {
    const d = await open();
    fireEvent.change(within(d).getByLabelText("Ongoing Value"), { target: { value: "Fresh plays weekly" } });
    goTab(d, "Pricing");
    fireEvent.change(within(d).getByLabelText("Recurring Price"), { target: { value: "399" } });
    fireEvent.change(within(d).getByLabelText("Billing Interval"), { target: { value: "yearly" } });
    fireEvent.change(within(d).getByLabelText("Cancellation Terms"), { target: { value: "Cancel anytime" } });
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const [id, v] = updateSpy.mock.calls.at(-1) as any;
    expect(id).toBe("co-1");
    expect(v.data.price).toBe(399);
    expect(v.data.billing_interval).toBe("yearly");
    expect(v.data.funnel_id).toBe("f-2");
    expect(v.data.delivery_types).toEqual(["Community"]);
    expect(v.data.design.pricing.recurring_offer).toMatchObject({ monthly_price: 399, interval: "yearly", ongoing_value: "Fresh plays weekly" });
    expect(v.data.design.pricing.cancellation_terms).toBe("Cancel anytime");
  });
  it("cleared recurring price stays empty, not zero", async () => {
    const d = await open(); goTab(d, "Pricing");
    fireEvent.change(within(d).getByLabelText("Recurring Price"), { target: { value: "" } });
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const v = (updateSpy.mock.calls.at(-1) as any)[1];
    expect(v.data.price).toBe("");
    expect(v.data.design.pricing.recurring_offer.monthly_price).toBe("");
  });
  it("recurring deliverables keep frequency", () => {
    const design = designForRow({ name: "X", data: {} as any, tier: "continuity" });
    design.stack.deliverables = [{ id: "d1", name: "Weekly call", frequency: "weekly" }];
    const v = designToRowValues(design, { name: "X", data: {} }, "Untitled Offer", "continuity");
    expect(v.data.design.stack.deliverables[0]).toMatchObject({ id: "d1", frequency: "weekly" });
    expect(v.data.price).toBe("");
    expect((v.data as any).billing_interval).toBe("");
  });
  it("summary without interval never assumes monthly", () => {
    const d = designForRow({ name: "X", data: { price: 20 } as any, tier: "continuity" });
    expect(d.pricing.recurring_offer).toEqual({ monthly_price: 20 });
  });
});
