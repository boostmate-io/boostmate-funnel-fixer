import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useCurrency", () => ({ useCurrency: () => ({ symbol: "€" }) }));
const openCoach = vi.fn();
const openListCoach = vi.fn();
vi.mock("./useOfferCoach", () => ({ useOfferCoach: () => ({ openCoach, openListCoach, panel: null }) }));
vi.mock("../SectionHelpCoach", () => ({ default: () => null }));

import PricingTab from "./PricingTab";
import { offerEditorField, offerEditorList } from "../registryUi";
import { PAYMENT_PLAN_TYPES, GUARANTEE_OPTIONS } from "../offerDesignTypes";
import {
  BLUEPRINT_FIELDS,
  getBlueprintFieldByPath,
  renderBlueprintFieldPathsPrompt,
} from "@shared/blueprintRegistry";
import { isWritablePath } from "@/lib/coach/applyBlueprintWrites";
import type { PricingData } from "../offerDesignTypes";

// Exact pre-migration list-Coach target (copied from the old component, cur = "€").
const LEGACY_PLANS_COACH = {
  id: "pricing_payment_plans",
  label: "Payment Plans",
  helper: "Flexible payment options that lower the upfront barrier. Propose concrete plans WITH a numeric amount in € for every plan — never leave the amount blank.",
  basePath: "offer_stack.pricing.payment_plans",
  itemFields: [
    { key: "type", label: "Plan Type", kind: "text", helper: "One of: full_pay | split_2 | split_3 | split_6 | monthly | custom." },
    { key: "custom_label", label: "Plan Label", kind: "text", helper: "Short plan name (e.g. 'Pay in Full', '3-Pay')." },
    { key: "amount", label: "Amount", kind: "text", helper: "Numeric amount in €, e.g. 997. Numbers only, no currency symbol." },
    { key: "duration", label: "Duration", kind: "text", helper: "How long the plan runs (e.g. '3 months', '12 weeks')." },
  ],
  suggestedCount: [2, 3],
};

const base: PricingData = {
  core_price: "" as const,
  payment_plans: [{ id: "p1", type: "custom" as const, custom_label: "", amount: "" as const, duration: "" }],
  guarantee_type: "refund" as const,
  guarantee_details: "",
  recurring_enabled: false,
  premium_enabled: false,
} as PricingData;

describe("Pricing metadata from the registry", () => {
  it("field copy is unchanged", () => {
    expect(offerEditorField("offer_stack.pricing.core_price")).toMatchObject({
      label: "Core Price", helper: "The headline price for your main offer.", placeholder: "2500",
    });
    expect(offerEditorField("offer_stack.pricing.guarantee_type")).toMatchObject({
      label: "Risk Reversal / Guarantee", helper: "How you remove the risk of saying yes.",
    });
    expect(offerEditorField("offer_stack.pricing.guarantee_details").coach).toEqual({
      id: "offer_stack.pricing.guarantee_details",
      label: "Guarantee Details / Terms",
      helper: "The concrete terms of the guarantee. Clear, specific, buyer-friendly.",
      placeholder: undefined,
    });
  });

  it("enum option labels match the legacy UI lists", () => {
    expect(offerEditorField("offer_stack.pricing.guarantee_type").options).toEqual(GUARANTEE_OPTIONS);
    expect(offerEditorList("offer_stack.pricing.payment_plans").item("type").options).toEqual(PAYMENT_PLAN_TYPES);
  });

  it("payment-plan list Coach target is byte-identical", () => {
    expect(offerEditorList("offer_stack.pricing.payment_plans", { cur: "€" }).listCoach).toEqual(LEGACY_PLANS_COACH);
  });

  it("item Coach targets keep id-based paths and wording", () => {
    const L = offerEditorList("offer_stack.pricing.payment_plans");
    expect(L.itemCoach("custom_label", "p1", 0)).toEqual({
      id: "offer_stack.pricing.payment_plans.p1.custom_label",
      label: "Payment Plan 1 — Label",
      helper: "Short, clear label for this custom plan.",
    });
    expect(L.itemCoach("duration", "p9", 2)).toEqual({
      id: "offer_stack.pricing.payment_plans.p9.duration",
      label: "Payment Plan 3 — Duration",
      helper: "How long does the plan run?",
    });
  });

  it("recurring/premium stay editor-only and not AI-writable", () => {
    for (const p of [
      "offer_stack.pricing.recurring_offer.name",
      "offer_stack.pricing.premium_upgrade.price",
      "offer_stack.pricing.recurring_enabled",
    ]) {
      expect(BLUEPRINT_FIELDS.some((f) => f.path === p)).toBe(false);
      expect(isWritablePath(p)).toBe(false);
    }
    expect(getBlueprintFieldByPath("offer_stack.pricing.core_price")?.aiWritable).toBe(true);
  });

  it("editor copy does not leak into the Coach prompt", () => {
    const prompt = renderBlueprintFieldPathsPrompt();
    expect(prompt).not.toContain("Add Payment Plan");
    expect(prompt).not.toContain("No Guarantee");
  });
});

describe("PricingTab rendering and behaviour", () => {
  beforeEach(() => { openCoach.mockClear(); openListCoach.mockClear(); });

  it("renders legacy wording and placeholders", () => {
    render(<PricingTab data={base} onChange={() => {}} saving={false} />);
    expect(screen.getByText("Core Price")).toBeTruthy();
    expect(screen.getByText("Lower the upfront barrier with flexible options.")).toBeTruthy();
    expect(screen.getByPlaceholderText("2500")).toBeTruthy();
    expect(screen.getByPlaceholderText("Plan label")).toBeTruthy();
    expect(screen.getByPlaceholderText("Amount")).toBeTruthy();
    expect(screen.getByPlaceholderText("Duration (e.g. 3 months)")).toBeTruthy();
    expect(screen.getByText("Risk Reversal / Guarantee")).toBeTruthy();
    expect(screen.getByText("Refund Guarantee")).toBeTruthy();
    expect(screen.getByText("Guarantee Details / Terms")).toBeTruthy();
  });

  it("add/remove plans and numeric amount behave as before", () => {
    const onChange = vi.fn();
    render(<PricingTab data={base} onChange={onChange} saving={false} />);
    fireEvent.click(screen.getByText("Add Payment Plan"));
    const added = onChange.mock.calls[0][0].payment_plans;
    expect(added).toHaveLength(2);
    expect(added[1]).toMatchObject({ type: "full_pay", amount: "", duration: "" });
    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "997" } });
    expect(onChange.mock.calls[1][0].payment_plans[0].amount).toBe(997);
    fireEvent.change(screen.getByPlaceholderText("2500"), { target: { value: "1500" } });
    expect(onChange.mock.calls[2][0]).toEqual({ core_price: 1500 });
  });

  it("list Coach receives legacy target and appends normalized plans", () => {
    const onChange = vi.fn();
    render(<PricingTab data={base} onChange={onChange} saving={false} />);
    // First Coach button in the Payment Plans card header.
    const spec = (() => {
      const btns = screen.getAllByRole("button");
      for (const b of btns) { fireEvent.click(b); if (openListCoach.mock.calls.length) break; }
      return openListCoach.mock.calls[0][0];
    })();
    const { appendItem, appendItems, currentCount, ...target } = spec;
    expect(target).toEqual(LEGACY_PLANS_COACH);
    expect(currentCount).toBe(1);
    appendItem({ type: "3 Pay", amount: "997", duration: "3 months" });
    const plan = onChange.mock.calls.at(-1)[0].payment_plans[1];
    expect(plan).toMatchObject({ type: "custom", amount: 997, duration: "3 months" });
    appendItem({ type: "split_3", amount: "x" });
    expect(onChange.mock.calls.at(-1)[0].payment_plans[1]).toMatchObject({ type: "split_3", amount: "" });
    expect(typeof appendItems).toBe("function");
  });
});
