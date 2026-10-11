// Free + Low-Ticket extras in the Universal Offer Editor (registry-driven layout,
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
    id: "free-1", name: "Lead Magnet", tier: "free", source: "blueprint_manual", blueprint_id: "bp", sort_order: 0,
    data: { description: "A checklist", core_outcome: "Clarity", delivery_types: ["PDF"], price: 0, funnel_id: "f-9" },
    user_id: "u1", sub_account_id: "ws-1",
  },
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
import { OFFER_FORMAT_VALUES } from "@shared/blueprintRegistry";
import { offerEditorField } from "../registryUi";

const renderTab = () =>
  render(
    <CoachProvider>
      <OfferEcosystemTab blueprintId="bp" offerDesign={emptyOfferDesign()} saving={false} />
    </CoachProvider>,
  );


beforeEach(() => {
  store = seed();
  updateSpy.mockClear();
});

const open = async (name: string) => { renderTab(); fireEvent.click(await screen.findByText(name)); return screen.findByRole("dialog", { name }); };
const done = async (d: HTMLElement) => { await act(async () => { fireEvent.click(within(d).getByRole("button", { name: "Done" })); }); };

describe("Free offers", () => {
  it("open in the Universal Offer Editor with Free sections and no pricing or Coach", async () => {
    const d = await open("Lead Magnet");
    expect(within(d).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Offer"]);
    const sections = [...d.querySelectorAll("[data-offer-section]")].map((s) => s.getAttribute("data-offer-section"));
    expect(sections).toEqual(["basics", "value", "included", "next_step", "ecosystem"]);
    within(d).getAllByText("More options").forEach((m) => fireEvent.click(m));
    expect(within(d).queryByPlaceholderText("2500")).toBeNull();
    expect(within(d).queryByText(/Payment Plan/i)).toBeNull();
    expect(within(d).queryAllByLabelText("Open AI Coach for this field").length).toBeGreaterThan(0); // Phase 3: Coach active
    expect(within(d).getByLabelText("Next-Step CTA")).toBeTruthy();
  });
  it("Offer Format options resolve from the registry", async () => {
    const d = await open("Lead Magnet");
    const sel = within(d).getByLabelText("Offer Format") as HTMLSelectElement;
    const labels = [...sel.options].slice(1).map((o) => o.textContent);
    expect(labels).toEqual(OFFER_FORMAT_VALUES.map((o) => o.label));
  });
  it("seeds from summary, writes nothing on open/close", async () => {
    const d = await open("Lead Magnet");
    expect((within(d).getByLabelText("Short Description") as HTMLTextAreaElement).value).toBe("A checklist");
    await done(d);
    expect(updateSpy).not.toHaveBeenCalled();
  });
  it("edits persist design; stays free; keeps ID and unrelated data", async () => {
    const d = await open("Lead Magnet");
    fireEvent.change(within(d).getByLabelText("Offer Format"), { target: { value: "assessment" } });
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const [id, v] = updateSpy.mock.calls.at(-1) as any;
    expect(id).toBe("free-1");
    expect(v.name).toBe("Lead Magnet");
    expect(v.data.price).toBe(0);
    expect(v.data.funnel_id).toBe("f-9");
    expect(v.data.design.angle.offer_format).toBe("assessment");
    expect(v.data.delivery_types).toEqual(["PDF"]);
  });
  it("summary stays free even when hidden design has a price", () => {
    const design = emptyOfferDesign(); design.angle.main_offer_name = "F"; design.pricing.core_price = 99;
    const v = designToRowValues(design, { name: "F", data: {} }, "Untitled Offer", "free");
    expect(v.data.price).toBe(0);
    expect(v.data.design.pricing.core_price).toBe(99);
  });
});

describe("empty Offer Name", () => {
  it.each([["Lead Magnet"], ["Quick Audit"]])("%s: shows validation and never overwrites the saved name", async (name) => {
    const d = await open(name);
    fireEvent.change(within(d).getByLabelText(/Offer Name/), { target: { value: "" } });
    fireEvent.change(within(d).getByLabelText("Short Description"), { target: { value: "changed" } });
    expect(within(d).getByRole("alert").textContent).toMatch(/Offer Name is required/);
    expect(updateSpy).not.toHaveBeenCalled();
    fireEvent.change(within(d).getByLabelText(/Offer Name/), { target: { value: "Renamed" } });
    await done(d);
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const v = (updateSpy.mock.calls.at(-1) as any)[1];
    expect(v.name).toBe("Renamed");
    expect(v.data.description).toBe("changed");
  });
});

describe("Low-Ticket price help", () => {
  it("uses neutral wording; Core wording unchanged", () => {
    expect(offerEditorField("offer_stack.pricing.core_price", undefined, "low_ticket").helper).toBe("What buyers pay for this offer.");
    expect(offerEditorField("offer_stack.pricing.core_price").helper).toBe("The headline price for your main offer.");
  });
});
