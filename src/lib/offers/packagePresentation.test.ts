import { describe, it, expect } from "vitest";
import { groupPackage, sectionFor, displayValue } from "./packagePresentation";
const w = (id: string, path: string, label = path, value = "x") => ({ id, path, label, value, include: true, edited: false });
describe("packagePresentation", () => {
  it("groups Core paths into sections and list items into cards without losing writes", () => {
    const writes = [
      w("a", "offer_stack.angle.main_offer_name"), w("b", "offer_stack.angle.framework.name"),
      w("c", "offer_stack.angle.framework.pillars.new_0.name", "Pillars #1 · name"), w("d", "offer_stack.angle.framework.pillars.new_0.description", "Pillars #1 · description"),
      w("e", "offer_stack.stack.deliverables.new_0.name"), w("f", "offer_stack.pricing.core_price"),
      w("g", "offer_stack.angle.core_promise.guarantee"), w("h", "offer_stack.angle.angle_faster_outcome"),
    ];
    const g = groupPackage(writes);
    expect(g.overview.map((e) => e.kind)).toEqual(["field"]);
    expect(g.method).toHaveLength(2);
    const item = g.method[1]; expect(item.kind === "item" && item.fields.map((f) => f.label)).toEqual(["Name", "Description"]);
    expect(item.kind === "item" && item.listLabel).toBe("Pillars");
    expect(g.delivery).toHaveLength(1); expect(g.pricing).toHaveLength(2); expect(g.value).toHaveLength(1);
    const ids = Object.values(g).flat().flatMap((e) => e.kind === "field" ? [e.write.id] : e.fields.map((f) => f.write.id));
    expect(ids.sort()).toEqual(writes.map((x) => x.id).sort());
  });
  it("handles other categories and enum display", () => {
    expect(sectionFor("recurring_offer.monthly_price")).toBe("pricing");
    expect(displayValue("12_weeks")).toBe("12 weeks");
    expect(displayValue("Real sentence_here.")).toBe("Real sentence_here.");
  });
});
import { humanizeCriteria, splitScoreChanges } from "./packagePresentation";
describe("value equation text", () => {
  it("replaces known criterion codes and splits per dimension", () => {
    expect(humanizeCriteria("pl_method improved; foo_bar stays")).toBe("“Named method” improved; foo_bar stays");
    const p = splitScoreChanges("Dream Outcome: better do_specific. Speed to Value: sv_timeline clear.");
    expect(p?.dream_outcome).toContain("Specific result");
    expect(p?.speed_to_value).toContain("Clear timeline");
    expect(splitScoreChanges("No structure here")).toBeNull();
  });
});
import { improvementLabel } from "@/components/offer-intelligence/BuilderStages";
describe("improvement tab labels", () => {
  it("derives friendly labels from content with dimension fallback", () => {
    expect(improvementLabel({ weakness: "No proof or testimonials", dimension: "perceived_likelihood" } as any)).toBe("Build trust");
    expect(improvementLabel({ weakness: "Program structure is undefined", dimension: null } as any)).toBe("Clarify the program");
    expect(improvementLabel({ weakness: "xyz", dimension: "ease_of_achievement" } as any)).toBe("Make it easier");
  });
});
