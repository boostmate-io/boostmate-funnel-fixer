// Low-Ticket offers in the Universal Offer Editor (registry-driven layout,
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
    id: "lt-1", name: "Quick Audit", tier: "low_ticket", source: "blueprint_manual", blueprint_id: "bp", sort_order: 0,
    data: { description: "A 30-min audit", core_outcome: "Know what to fix", delivery_types: ["Video call"], price: "", funnel_note: "keep" },
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
import { offerTabsForTier } from "@shared/blueprintRegistry";

const renderTab = () =>
  render(
    <CoachProvider>
      <OfferEcosystemTab blueprintId="bp" offerDesign={emptyOfferDesign()} saving={false} />
    </CoachProvider>,
  );

async function openLowTicket() {
  renderTab();
  fireEvent.click(await screen.findByText("Quick Audit"));
  return screen.findByRole("dialog", { name: "Quick Audit" });
}

beforeEach(() => {
  store = seed();
  updateSpy.mockClear();
});

describe("Low-Ticket opens in the Universal Offer Editor", () => {
  it("shows one Offer tab with the registry sections in order", async () => {
    const dialog = await openLowTicket();
    expect(within(dialog).getByText("Low Ticket Offers")).toBeTruthy();
    const tabs = within(dialog).getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Offer"]);
    const sections = [...dialog.querySelectorAll("[data-offer-section]")].map((s) => s.getAttribute("data-offer-section"));
    expect(sections).toEqual(offerTabsForTier("low_ticket")[0].sections.map((s) => s.id));
    expect(sections).toEqual(["basics", "value", "included", "price", "ecosystem"]);
  });

  it("renders fields with registry metadata, seeded from the summary", async () => {
    const dialog = await openLowTicket();
    expect((within(dialog).getByLabelText(/Offer Name/) as HTMLInputElement).value).toBe("Quick Audit");
    expect((within(dialog).getByLabelText("Short Description") as HTMLTextAreaElement).value).toBe("A 30-min audit");
    expect((within(dialog).getByLabelText("Core Outcome") as HTMLTextAreaElement).value).toBe("Know what to fix");
    expect(within(dialog).getByLabelText("Problem Solved")).toBeTruthy();
    expect(within(dialog).getByLabelText("Quick Win / Immediate Value")).toBeTruthy();
    expect(within(dialog).getByText("Core Deliverables")).toBeTruthy();
    expect(within(dialog).getAllByText("Price").length).toBe(2);
    expect(within(dialog).getByText("Video call")).toBeTruthy();
    // Optional fields live under "More options" but are reachable
    const more = within(dialog).getAllByText("More options");
    expect(more.length).toBeGreaterThanOrEqual(3);
    more.forEach((m) => fireEvent.click(m));
    expect(within(dialog).getByText("Signature Framework")).toBeTruthy();
    expect(within(dialog).getByText("Bonuses")).toBeTruthy();
    expect(within(dialog).getByText("Risk Reversal / Guarantee")).toBeTruthy();
  });

  it("has no Coach entry points", async () => {
    const dialog = await openLowTicket();
    within(dialog).getAllByText("More options").forEach((m) => fireEvent.click(m));
    expect(within(dialog).queryAllByLabelText("Open AI Coach for this field")).toHaveLength(0);
    expect(within(dialog).queryByLabelText("Open AI Coach")).toBeNull();
    expect(within(dialog).queryByText("AI Coach")).toBeNull();
  });
});

describe("persistence", () => {
  it("opening and closing without edits writes nothing", async () => {
    const dialog = await openLowTicket();
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Quick Audit" })).toBeNull());
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("editing saves the design and syncs summary fields; keeps ID and unrelated data", async () => {
    const dialog = await openLowTicket();
    fireEvent.change(within(dialog).getByLabelText("Problem Solved"), { target: { value: "No clear priorities" } });
    fireEvent.change(within(dialog).getByLabelText("Short Description"), { target: { value: "A focused audit" } });
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Done" })); });
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const [id, values] = updateSpy.mock.calls.at(-1) as any;
    expect(id).toBe("lt-1");
    expect(values.name).toBe("Quick Audit");
    expect(values.data.description).toBe("A focused audit");
    expect(values.data.core_outcome).toBe("Know what to fix");
    expect(values.data.delivery_types).toEqual(["Video call"]);
    expect(values.data.price).toBe("");
    expect(values.data.funnel_note).toBe("keep");
    expect(values.data.design.angle.problem_solved).toBe("No clear priorities");
    expect(values.data.design.stack.delivery_types).toEqual(["Video call"]);
  });

  it("price syncs from design; empty price stays an incomplete draft", async () => {
    const dialog = await openLowTicket();
    const price = within(dialog).getByPlaceholderText("2500");
    fireEvent.change(price, { target: { value: "47" } });
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Done" })); });
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    expect((updateSpy.mock.calls.at(-1) as any)[1].data.price).toBe(47);
  });
});

describe("repository helpers", () => {
  it("seeds design from summary without coercing missing price to 0", () => {
    const d = designForRow({ name: "X", data: { description: "d", price: "" } as any });
    expect(d.pricing.core_price).toBe("");
    expect(d.angle.main_offer_name).toBe("X");
    expect(designToRowValues(d, { name: "X", data: {} }, "Untitled Offer").data.price).toBe("");
  });
  it("stored design wins over summary", () => {
    const design = emptyOfferDesign();
    design.angle.main_offer_name = "From design";
    expect(designForRow({ name: "Row", data: { design } as any }).angle.main_offer_name).toBe("From design");
  });
  it("Core fallback name is unchanged", () => {
    expect(designToRowValues(emptyOfferDesign(), {}).name).toBe("Untitled Core Offer");
  });
});
