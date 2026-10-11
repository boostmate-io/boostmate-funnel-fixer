// Premium in the Universal Offer Editor (registry-driven layout,
// summary seeding without writes, design → summary sync, Coach disabled).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";

const updateSpy = vi.fn(async () => ({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ activeSubAccountId: "ws-1" }) }));
vi.mock("@/hooks/useCurrency", () => ({ useCurrency: () => ({ symbol: "€", currency: "EUR" }) }));
vi.mock("@/lib/coach/useCoachChat", () => ({
  useCoachChat: () => ({ conversationId: null, messages: [], status: "idle", error: null, sendMessage: vi.fn(), decisions: {}, recordDecision: vi.fn() }),
}));

let store: any[] = [];
const seed = () => [
  { id: "primary-1", name: "Primary", tier: "core", source: "blueprint_core", blueprint_id: "bp", sort_order: 0, data: {}, user_id: "u1", sub_account_id: "ws-1" },
  {
    id: "pr-1", name: "VIP Intensive", tier: "premium", source: "blueprint_manual", blueprint_id: "bp", sort_order: 0,
    data: { description: "6-week sprint", core_outcome: "Launch", delivery_types: ["Group call"], price: "", funnel_id: "f-2" },
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
import { offerTabsForTier, OFFER_TIER_LAYOUTS, TOUCH_LEVEL_VALUES } from "@shared/blueprintRegistry";
import { offerEditorField } from "../registryUi";

const renderTab = () =>
  render(
    <CoachProvider>
      <OfferEcosystemTab blueprintId="bp" offerDesign={emptyOfferDesign()} saving={false} />
    </CoachProvider>,
  );


beforeEach(() => { store = seed(); updateSpy.mockClear(); });
const open = async () => { renderTab(); fireEvent.click(await screen.findByText("VIP Intensive")); return screen.findByRole("dialog", { name: "VIP Intensive" }); };
const done = async (d: HTMLElement) => { await act(async () => { fireEvent.click(within(d).getByRole("button", { name: "Done" })); }); };
const sections = (d: HTMLElement) => [...(d.querySelector("[role=tabpanel][data-state=active]") ?? d).querySelectorAll("[data-offer-section]")].map((s) => s.getAttribute("data-offer-section"));
const expand = (d: HTMLElement) => within((d.querySelector("[role=tabpanel][data-state=active]") as HTMLElement) ?? d).queryAllByText("More options").forEach((m) => fireEvent.click(m));
const goTab = (d: HTMLElement, name: string) => { const t = within(d).getByRole("tab", { name }); fireEvent.mouseDown(t); fireEvent.click(t); };

describe("Premium in the Universal Offer Editor", () => {
  it("three registry tabs and sections in order", async () => {
    const d = await open();
    expect(within(d).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Offer Angle", "Offer Stack", "Pricing"]);
    const layout = offerTabsForTier("premium");
    expect(sections(d)).toEqual(layout[0].sections.map((s) => s.id));
    expand(d);
    expect((within(d).getByLabelText(/Offer Name/) as HTMLInputElement).value).toBe("VIP Intensive");
    expect(within(d).getByText("Differentiation")).toBeTruthy();
    expect(within(d).getByLabelText("New Vehicle")).toBeTruthy();
    goTab(d, "Offer Stack");
    expect(sections(d)).toEqual(layout[1].sections.map((s) => s.id));
    expand(d);
    for (const t of ["Core Deliverables", "Templates & Resources", "Bonuses", "Milestones"]) expect(within(d).getAllByText(t).length).toBeGreaterThan(0);
    goTab(d, "Pricing");
    expect(sections(d)).toEqual(layout[2].sections.map((s) => s.id));
    expand(d);
    expect(within(d).getByPlaceholderText("2500")).toBeTruthy();
    expect(within(d).getByText("What buyers pay for this offer.")).toBeTruthy();
    expect(within(d).queryByText(/main offer/i)).toBeNull();
    expect(within(d).queryAllByLabelText("Open AI Coach for this field")).toHaveLength(0);
  });
  it("every layout item renders a control (no silent gaps)", async () => {
    const d = await open();
    for (const tab of offerTabsForTier("premium")) {
      goTab(d, tab.label); expand(d);
      for (const sec of tab.sections) {
        const el = d.querySelector(`[data-offer-section="${sec.id}"]`)!;
        expect(el.children.length).toBeGreaterThan(1);
      }
    }
  });
  it("open/close writes nothing", async () => {
    const d = await open(); await done(d);
    expect(updateSpy).not.toHaveBeenCalled();
  });
  it("edits persist design; empty price stays incomplete (not free); IDs/metadata kept", async () => {
    const d = await open();
    fireEvent.change(within(d).getByLabelText("Problem Solved"), { target: { value: "Stuck" } });
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const [id, v] = updateSpy.mock.calls.at(-1) as any;
    expect(id).toBe("pr-1");
    expect(v.data.price).toBe("");
    expect(v.data.funnel_id).toBe("f-2");
    expect(v.data.description).toBe("6-week sprint");
    expect(v.data.delivery_types).toEqual(["Group call"]);
    expect(v.data.design.angle.problem_solved).toBe("Stuck");
  });
  it("premium mode toggles the Upgrades-from placeholder and persists", async () => {
    const d = await open();
    expect(within(d).queryByText("Upgrades from")).toBeNull();
    const modes = OFFER_TIER_LAYOUTS && offerEditorField("offer_stack.angle.premium_mode", undefined, "premium").options!;
    expect(modes.map((m) => m.value)).toEqual(["standalone", "upgrade"]);
    fireEvent.click(within(d).getByRole("radio", { name: modes[1].label }));
    expect(within(d).getByText("Upgrades from")).toBeTruthy();
    fireEvent.click(within(d).getByRole("radio", { name: modes[0].label }));
    expect(within(d).queryByText("Upgrades from")).toBeNull();
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    expect((updateSpy.mock.calls.at(-1) as any)[1].data.design.angle.premium_mode).toBe("standalone");
  });
  it("touch level is multi-select from the registry and persists as a list", async () => {
    const d = await open(); goTab(d, "Offer Stack");
    const opts = offerEditorField("offer_stack.stack.touch_level", undefined, "premium").options!;
    expect(opts.map((o) => o.value)).toEqual(TOUCH_LEVEL_VALUES.map((o) => o.value));
    fireEvent.click(within(d).getByRole("button", { name: "1:1" }));
    fireEvent.click(within(d).getByRole("button", { name: "VIP day" }));
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const v = (updateSpy.mock.calls.at(-1) as any)[1];
    expect(v.data.design.stack.touch_level).toEqual(["one_on_one", "vip_day"]);
    expect(v.data.design.angle.framework.name).toBeFalsy();
  });
  it("price syncs from design", async () => {
    const d = await open(); goTab(d, "Pricing");
    fireEvent.change(within(d).getByPlaceholderText("2500"), { target: { value: "997" } });
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    expect((updateSpy.mock.calls.at(-1) as any)[1].data.price).toBe(997);
  });
});
