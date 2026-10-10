import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const openCoach = vi.fn();
const openListCoach = vi.fn();
vi.mock("./useOfferCoach", () => ({ useOfferCoach: () => ({ openCoach, openListCoach, panel: null }) }));
vi.mock("../SectionHelpCoach", () => ({ default: () => null }));

import OfferStackTab, { STACK_LISTS } from "./OfferStackTab";
import { renderBlueprintFieldPathsPrompt } from "@shared/blueprintRegistry";

// Items open when empty, so every item Coach button renders.
// Exact pre-migration list-Coach targets (copied from the old component).
const LEGACY_LIST_COACH = {
  deliverables: { id: "stack_deliverables", label: "Core Deliverables", helper: "Main service, coaching or program components clients receive.", basePath: "offer_stack.stack.deliverables", suggestedCount: [3, 5], itemFields: [{ key: "name", label: "Name", kind: "text", helper: "Short, benefit-driven deliverable name." }, { key: "description", label: "Description", kind: "textarea", helper: "1–2 sentences on what the client gets." }] },
  resources: { id: "stack_resources", label: "Templates & Resources", helper: "Templates, guides, checklists, swipe files included with the offer.", basePath: "offer_stack.stack.resources", suggestedCount: [3, 5], itemFields: [{ key: "name", label: "Name", kind: "text" }, { key: "resource_type", label: "Type", kind: "text", helper: "Template, Ebook, Checklist, Swipe file…" }, { key: "description", label: "Description", kind: "textarea", helper: "What's inside and how it's used." }] },
  support_channels: { id: "stack_support_channels", label: "Support System", helper: "Channels clients use to reach you (Slack, Voxer, calls…).", basePath: "offer_stack.stack.support_channels", suggestedCount: [2, 4], itemFields: [{ key: "name", label: "Name", kind: "text", helper: "Channel name (Slack, WhatsApp, Q&A calls…)." }, { key: "frequency", label: "Frequency / Availability", kind: "text", helper: "When are you available (e.g. Mon–Fri 9–5)." }, { key: "description", label: "Description", kind: "textarea", helper: "What kind of support happens here and typical response time." }] },
  bonuses: { id: "stack_bonuses", label: "Bonuses", helper: "High-value bonuses that tip the buying decision.", basePath: "offer_stack.stack.bonuses", suggestedCount: [2, 4], itemFields: [{ key: "name", label: "Name", kind: "text", helper: "Punchy bonus name." }, { key: "description", label: "Description", kind: "textarea", helper: "What it is and why it's valuable." }, { key: "perceived_value", label: "Perceived Value", kind: "text", helper: "Stated dollar value (e.g. €497 value)." }] },
  milestones: { id: "stack_milestones", label: "Milestones", helper: "The phases clients move through in your offer.", basePath: "offer_stack.stack.milestones", suggestedCount: [3, 5], itemFields: [{ key: "phase_name", label: "Phase Name", kind: "text", helper: "Short, evocative phase name." }, { key: "description", label: "Description", kind: "textarea", helper: "What happens in this phase." }, { key: "expected_outcome", label: "Expected Outcome", kind: "textarea", helper: "Concrete result after this phase." }] },
} as const;

describe("Offer Stack metadata from the registry", () => {
  it.each(Object.entries(LEGACY_LIST_COACH))("%s list-Coach target is byte-identical", (k, legacy) => {
    expect(STACK_LISTS[k as keyof typeof STACK_LISTS].listCoach).toEqual(legacy);
  });

  it("item Coach targets keep id-based paths and legacy wording", () => {
    expect(STACK_LISTS.deliverables.itemCoach("name", "abc", 0)).toEqual({
      id: "offer_stack.stack.deliverables.abc.name",
      label: "Deliverable 1 — Name",
      helper: "A short, benefit-driven name for this deliverable.",
      placeholder: "e.g. Weekly 1:1 Coaching Calls",
    });
    expect(STACK_LISTS.support_channels.itemCoach("frequency", "x", 1)).toEqual({
      id: "offer_stack.stack.support_channels.x.frequency",
      label: "Support Channel 2 — Frequency",
      helper: "When are you available on this channel?",
    });
    expect(STACK_LISTS.bonuses.itemCoach("perceived_value", "b1", 2).label).toBe("Bonus 3 — Perceived Value");
    expect(STACK_LISTS.milestones.itemCoach("expected_outcome", "m", 0).helper).toBe("The concrete result the client walks away with after this phase.");
  });

  it("visible item wording is unchanged", () => {
    expect(STACK_LISTS.bonuses.item("name")).toEqual({ label: "Bonus Title", placeholder: "Bonus name" });
    expect(STACK_LISTS.support_channels.item("frequency")).toEqual({ label: "Frequency / Availability", placeholder: "Frequency / availability (e.g. Mon–Fri 9–5 CET)" });
    expect(STACK_LISTS.resources.fallbackTitle(2)).toBe("Resource 3");
    expect(STACK_LISTS.milestones.emptyText).toBe("Map out the phases your clients move through. Most great programs have 3–5.");
  });

  it("editor copy does not leak into the Coach field-paths prompt", () => {
    const prompt = renderBlueprintFieldPathsPrompt();
    expect(prompt).not.toContain("Bonus Title");
    expect(prompt).not.toContain("Add Deliverable");
  });
});

describe("OfferStackTab rendering and behaviour", () => {
  const data = {
    deliverables: [{ id: "d1", name: "", description: "", delivery_types: [], frequency: "weekly" }],
    resources: [{ id: "r1", name: "", resource_type: "Ebook", description: "" }],
    support_channels: [{ id: "s1", name: "", description: "", frequency: "" }],
    bonuses: [{ id: "b1", name: "", description: "", perceived_value: "€497" }],
    milestones: [{ id: "m1", phase_name: "", description: "", expected_outcome: "" }],
    delivery_timeline: "90_days",
  } as never;

  it("renders registry wording, keeps values, and Coach targets stay correct", () => {
    openCoach.mockClear();
    openListCoach.mockClear();
    const onChange = vi.fn();
    render(<OfferStackTab data={data} onChange={onChange} saving={false} embedded />);
    for (const t of ["Core Deliverables", "Templates & Resources", "Support System", "Bonuses", "Milestones", "Delivery Timeline", "Over what timeframe is the value delivered?"]) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    expect(screen.getByDisplayValue("€497")).toBeInTheDocument();

    // Items with empty names render expanded, so every Coach entry point is visible.
    for (const b of screen.getAllByRole("button", { name: /AI Coach/ })) fireEvent.click(b);
    const listIds = openListCoach.mock.calls.map((c) => c[0].id);
    expect(listIds).toEqual(expect.arrayContaining(["stack_deliverables", "stack_resources", "stack_support_channels", "stack_bonuses", "stack_milestones"]));
    const fieldIds = openCoach.mock.calls.map((c) => c[0].id);
    expect(fieldIds).toEqual(expect.arrayContaining([
      "offer_stack.stack.deliverables.d1.name",
      "offer_stack.stack.resources.r1.resource_type",
      "offer_stack.stack.support_channels.s1.frequency",
      "offer_stack.stack.bonuses.b1.perceived_value",
      "offer_stack.stack.milestones.m1.expected_outcome",
    ]));
    // Apply still routes into the same item by id.
    const pv = openCoach.mock.calls.find((c) => c[0].id === "offer_stack.stack.bonuses.b1.perceived_value")![0];
    onChange.mockClear();
    pv.apply("€997");
    expect(onChange).toHaveBeenCalledWith({ bonuses: [{ id: "b1", name: "", description: "", perceived_value: "€997" }] });
    // List-Coach append keeps the same item shape.
    const del = openListCoach.mock.calls.find((c) => c[0].id === "stack_deliverables")![0];
    expect(del.currentCount).toBe(1);
    onChange.mockClear();
    del.appendItems([{ name: "New", description: "D" }]);
    const appended = onChange.mock.calls[0][0].deliverables;
    expect(appended).toHaveLength(2);
    expect(appended[0].id).toBe("d1");
    expect(appended[1]).toMatchObject({ name: "New", description: "D", delivery_types: [], frequency: "weekly" });
  });
});
