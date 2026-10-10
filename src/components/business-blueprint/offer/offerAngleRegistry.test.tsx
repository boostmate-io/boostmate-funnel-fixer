import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const openCoach = vi.fn();
const openListCoach = vi.fn();
vi.mock("./useOfferCoach", () => ({ useOfferCoach: () => ({ openCoach, openListCoach, panel: null }) }));
vi.mock("../SectionHelpCoach", () => ({ default: () => null }));

import OfferAngleTab, { ANGLE_FIELD_PATHS } from "./OfferAngleTab";
import { offerEditorField } from "../registryUi";
import { getBlueprintFieldByPath } from "@shared/blueprintRegistry";

// Exact pre-migration copy — the registry must reproduce it byte-for-byte.
const LEGACY = {
  "offer_stack.angle.main_offer_name": { label: "Main Offer Name", helper: "What is your flagship offer called?", placeholder: "e.g. The Confidence Reset, Lead Engine 90, Scale Sprint…", coach: { label: "Main Offer Name", helper: "Short, 3–6 words. Just the name of your flagship offer.", placeholder: "e.g. The Confidence Reset, Lead Engine 90…" } },
  "offer_stack.angle.short_description": { label: "Short Offer Description", helper: "1–2 sentences explaining what the offer actually is.", placeholder: "e.g. A 90-day coaching program that helps clients rebuild confidence after toxic relationships.", coach: { label: "Short Offer Description", helper: "1–2 sentences explaining what the offer actually is.", placeholder: "e.g. A 90-day coaching program that helps clients…" } },
  "offer_stack.angle.core_outcome": { label: "Core Outcome", helper: "The primary transformation result.", placeholder: "e.g. Rebuild self-trust and confidently attract healthy relationships.", coach: { label: "Core Outcome", helper: "The primary transformation result in 1 sentence.", placeholder: "e.g. Rebuild self-trust and confidently attract healthy relationships." } },
  "offer_stack.angle.angle_new_vehicle": { label: "New Vehicle", helper: "What makes your method genuinely new compared to what they already tried?", placeholder: "e.g. The first 90-day program that combines somatic work with strategic positioning…", coach: { label: "New Vehicle", helper: "What makes your method genuinely new compared to what they already tried?", placeholder: undefined } },
  "offer_stack.angle.angle_better_results": { label: "Better Results", helper: "Why does your method produce better results?", placeholder: "e.g. Because we combine strategy with implementation in the same week…", coach: { label: "Better Results", helper: "Why does your method produce better results?", placeholder: undefined } },
  "offer_stack.angle.framework.name": { label: "Framework Name", helper: undefined, placeholder: "e.g. The Confidence Reset Method", coach: { label: "Framework Name", helper: "A memorable name for your signature method. 2–5 words. Ownable.", placeholder: "e.g. The Confidence Reset Method" } },
  "offer_stack.angle.framework.description": { label: "Brief Description", helper: undefined, placeholder: "What makes it unique and why it works", coach: { label: "Framework — Brief Description", helper: "One line describing what makes the framework unique and why it works.", placeholder: "What makes it unique and why it works" } },
  "offer_stack.angle.core_promise.desired_outcome": { label: "Desired Outcome", helper: undefined, placeholder: "e.g. Rebuild confidence and self-trust", coach: { label: "Desired Outcome (Core Promise)", helper: "The specific transformation the client walks away with. Short and concrete.", placeholder: "e.g. Rebuild confidence and self-trust" } },
  "offer_stack.angle.core_promise.guarantee": { label: "Guarantee / Risk Reversal", helper: undefined, placeholder: "e.g. Final payment waived if no progress", coach: { label: "Guarantee / Risk Reversal", helper: "A concrete promise that removes the buyer's risk. One sentence.", placeholder: "e.g. Final payment waived if no progress" } },
} as const;

describe("Offer Angle metadata from the registry", () => {
  it.each(Object.entries(LEGACY))("%s resolves the exact legacy copy and Coach target", (path, legacy) => {
    const f = offerEditorField(path);
    expect(f.path).toBe(path);
    expect({ label: f.label, helper: f.helper, placeholder: f.placeholder }).toEqual({ label: legacy.label, helper: legacy.helper, placeholder: legacy.placeholder });
    expect(f.coach).toEqual({ id: path, ...legacy.coach });
  });

  it("every Angle field path exists in the registry (paths unchanged)", () => {
    for (const p of [...Object.values(ANGLE_FIELD_PATHS), "offer_stack.angle.framework.name", "offer_stack.angle.framework.description"]) {
      expect(getBlueprintFieldByPath(p)?.editor).toBeTruthy();
    }
  });

  it("applies the business-type noun token", () => {
    expect(offerEditorField("offer_stack.angle.short_description", { noun: "patients" }).placeholder).toContain("helps patients rebuild");
  });

  it("unknown paths fail loudly", () => {
    expect(() => offerEditorField("offer_stack.angle.nope")).toThrow();
  });
});

describe("OfferAngleTab rendering", () => {
  const data = { main_offer_name: "Kwenie", angle_better_results: "faster", framework: { pillars: [{ id: "p1", name: "A", description: "B" }] }, core_promise: { desired_outcome: "x", timeframe: "90_days" } } as never;
  const onChange = vi.fn();

  it("renders registry labels/placeholders and keeps values", () => {
    render(<OfferAngleTab data={data} onChange={onChange} saving={false} embedded />);
    expect(screen.getByText("Main Offer Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Kwenie")).toHaveAttribute("placeholder", LEGACY["offer_stack.angle.main_offer_name"].placeholder);
    expect(screen.getByText("Better Results")).toBeInTheDocument();
    expect(screen.getByDisplayValue("faster")).toBeInTheDocument();
  });

  it("Coach buttons target the correct fields and edits keep the same data mapping", () => {
    openCoach.mockClear();
    render(<OfferAngleTab data={data} onChange={onChange} saving={false} embedded />);
    for (const b of screen.getAllByRole("button")) fireEvent.click(b);
    const ids = openCoach.mock.calls.map((c) => c[0].id);
    // Every simple Angle field's Coach button targets its registry path.
    for (const p of Object.values(ANGLE_FIELD_PATHS)) expect(ids).toContain(p);
    expect(ids).toContain("offer_stack.angle.framework.name");
    // Pillars list keeps its own list-Coach entry point.
    expect(openListCoach.mock.calls.some((c) => c[0].basePath === "offer_stack.angle.framework.pillars")).toBe(true);
    const spec = openCoach.mock.calls.find((c) => c[0].id === "offer_stack.angle.angle_better_results")![0];
    expect(spec).toMatchObject({ id: "offer_stack.angle.angle_better_results", label: "Better Results", currentValue: "faster" });
    spec.apply("new value");
    expect(onChange).toHaveBeenCalledWith({ angle_better_results: "new value" });
    fireEvent.change(screen.getByDisplayValue("Kwenie"), { target: { value: "Renamed" } });
    expect(onChange).toHaveBeenCalledWith({ main_offer_name: "Renamed" });
  });
});
