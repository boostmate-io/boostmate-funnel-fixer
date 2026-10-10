// Integration: extra Core Offer → field Coach → Apply in the real CoachPanel
// card. Covers popup staying open, visible update, per-ID persistence,
// Primary untouched and honest Applied / Not applied states.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const updateSpy = vi.fn();
const applyBlueprintWritesSpy = vi.fn();
let chatMessages: any[] = [];

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({ activeSubAccountId: "ws-1" }) }));
vi.mock("@/hooks/useCurrency", () => ({ useCurrency: () => ({ symbol: "€", currency: "EUR" }) }));
vi.mock("../SectionHelpCoach", () => ({ default: () => null }));
vi.mock("@/lib/coach/applyBlueprintWrites", async (orig) => {
  const real: any = await orig();
  return { ...real, applyBlueprintWrites: (...a: any[]) => applyBlueprintWritesSpy(...a) };
});
vi.mock("@/lib/coach/useCoachChat", () => ({
  useCoachChat: () => ({
    conversationId: null, messages: chatMessages, status: "idle", error: null,
    sendMessage: vi.fn(), decisions: {}, recordDecision: vi.fn(),
  }),
}));

import { emptyOfferDesign } from "../offerDesignTypes";
const extraDesign = emptyOfferDesign();
extraDesign.angle.main_offer_name = "het";
extraDesign.angle.core_outcome = "keep me";
let store: any[] = [];
const seed = () => [
  { id: "primary-1", name: "Primary", tier: "core", source: "blueprint_core", blueprint_id: "bp", sort_order: 0, data: {}, user_id: "u1", sub_account_id: "ws-1" },
  { id: "extra-1", name: "het", tier: "core", source: "blueprint_manual", blueprint_id: "bp", sort_order: 1, data: { design: structuredClone(extraDesign) }, user_id: "u1", sub_account_id: "ws-1" },
];
vi.mock("@/lib/offers/offerRepository", async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    fetchEcosystemOffers: vi.fn(async () => ({ rows: structuredClone(store), error: null })),
    updateEcosystemOffer: (...a: any[]) => updateSpy(...a),
    insertEcosystemOffer: vi.fn(), deleteEcosystemOffer: vi.fn(),
  };
});

import { CoachProvider, useCoach } from "@/contexts/CoachContext";
import CoachPanel from "@/components/coach/CoachPanel";
import OfferEcosystemTab from "./OfferEcosystemTab";

function CoachHost() {
  const { open, focus, closeCoach } = useCoach();
  return (
    <CoachPanel open={open} onOpenChange={(o) => !o && closeCoach()} context={null}
      onApply={focus?.onApply} onApplyBlueprintWrites={focus?.onApplyBlueprintWrites ?? applyBlueprintWritesSpy} />
  );
}

const setWrites = (writes: any[]) => {
  chatMessages = [{ id: "m1", role: "assistant", created_at: new Date().toISOString(),
    parts: [{ type: "blueprint_writes", writes }] }];
};

async function openExtraAndCoach() {
  const onChangePrimary = vi.fn();
  const utils = render(
    <CoachProvider>
      <OfferEcosystemTab blueprintId="bp" offerDesign={emptyOfferDesign()} onChangeOfferDesign={onChangePrimary} saving={false} />
      <CoachHost />
    </CoachProvider>,
  );
  fireEvent.click(await screen.findByText("het"));
  const dialog = await screen.findByRole("dialog", { name: "het" });
  fireEvent.click(within(dialog).getAllByLabelText("Open AI Coach for this field")[0]);
  const panel = await screen.findByRole("dialog", { name: "AI Coach" });
  return { ...utils, dialog, panel, onChangePrimary };
}

beforeEach(() => {
  store = seed();
  updateSpy.mockReset().mockImplementation(async (id: string, values: any) => {
    store = store.map((r) => (r.id === id ? { ...r, ...structuredClone(values) } : r));
    return { error: null };
  });
  applyBlueprintWritesSpy.mockReset();
});

describe("Coach Apply on an additional Core Offer", () => {
  it("keeps the editor open, updates the field, persists to that offer only", async () => {
    setWrites([{ path: "offer_stack.angle.main_offer_name", label: "Main Offer Name", value: "Lead Engine 90" }]);
    const { panel, onChangePrimary } = await openExtraAndCoach();

    fireEvent.pointerDown(panel); // clicking in the Coach must not dismiss the editor
    fireEvent.click(within(panel).getByLabelText("Apply this field"));

    await waitFor(() => expect(within(panel).getByText("Applied")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog", { name: /Lead Engine 90|het/ });
    expect(within(dialog).getByDisplayValue("Lead Engine 90")).toBeInTheDocument();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [id, values] = updateSpy.mock.calls[0];
    expect(id).toBe("extra-1");
    expect(values.data.design.angle.main_offer_name).toBe("Lead Engine 90");
    expect(values.data.design.angle.core_outcome).toBe("keep me");
    expect(onChangePrimary).not.toHaveBeenCalled();
    expect(applyBlueprintWritesSpy).not.toHaveBeenCalled();
  });

  it("preserves pending manual fields, tabs and persisted data on reopening", async () => {
    setWrites([{ path: "offer_stack.angle.main_offer_name", label: "Main Offer Name", value: "Scoped name" }]);
    const { panel, onChangePrimary } = await openExtraAndCoach();
    fireEvent.change(screen.getByDisplayValue("keep me"), { target: { value: "Manual outcome" } });
    fireEvent.click(screen.getByRole("tab", { name: "Pricing" }));
    fireEvent.click(within(panel).getByLabelText("Apply this field"));
    await waitFor(() => expect(within(panel).getByText("Applied")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "Offer Angle" }));
    expect(screen.getByDisplayValue("Manual outcome")).toBeVisible();
    expect(screen.getByDisplayValue("Scoped name")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Scoped name" })).toBeNull());
    fireEvent.click(await screen.findByText("Scoped name"));
    expect(await screen.findByDisplayValue("Scoped name")).toBeVisible();
    expect(screen.getByDisplayValue("Manual outcome")).toBeVisible();
    expect(store.find((row) => row.id === "extra-1").data.design.angle.core_outcome).toBe("Manual outcome");
    expect(onChangePrimary).not.toHaveBeenCalled();
    expect(updateSpy.mock.calls.every(([id]) => id === "extra-1")).toBe(true);
  });

  it("does not show Applied when every path is rejected", async () => {
    setWrites([{ path: "customer_clarity.avatar_who", label: "Avatar", value: "x" }]);
    const { panel } = await openExtraAndCoach();
    fireEvent.click(within(panel).getByLabelText("Apply this field"));
    await waitFor(() => expect(within(panel).getByLabelText("Apply this field")).not.toBeDisabled());
    expect(within(panel).queryByText("Applied")).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("does not show Applied when the save fails (stays retryable)", async () => {
    updateSpy.mockResolvedValue({ error: { message: "boom" } });
    setWrites([{ path: "offer_stack.angle.main_offer_name", label: "Main Offer Name", value: "X" }]);
    const { panel } = await openExtraAndCoach();
    fireEvent.click(within(panel).getByLabelText("Apply this field"));
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    await waitFor(() => expect(within(panel).getByLabelText("Apply this field")).not.toBeDisabled());
    expect(within(panel).queryByText("Applied")).toBeNull();
  });
});
