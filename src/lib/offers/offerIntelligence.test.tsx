import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  VALUE_CRITERIA, VALUE_DIMENSIONS, scoreValueProfile, compareProfiles, type CriterionAssessment,
} from "@shared/offerIntelligence/valueEquation";
import {
  OFFER_OPERATIONS, buildOperationInstructions, buildOperationInput, validateOperationOutput, OPERATION_OUTPUT_SCHEMAS,
} from "@shared/offerIntelligence/operations";
import { mapGeneratedToDesign, categoryWritableFields } from "@shared/offerIntelligence/designMapping";
import { validatePublicOfferInput, publicInputToContext } from "@shared/offerIntelligence/publicInput";
import { BUILDER_EXTRA_STORAGE, emptyBuilderExtras } from "@shared/offerIntelligence/builderTypes";
import { offerAiPermission } from "@shared/offerAiPolicy";
import { OFFER_TIERS } from "@shared/blueprintRegistry";
import ValueProfileChart from "@/components/offer-intelligence/ValueProfileChart";

const all = (verdict: CriterionAssessment["verdict"], dim?: string): CriterionAssessment[] =>
  VALUE_CRITERIA.filter((c) => !dim || c.dimension === dim).map((c) => ({ criterionId: c.id, verdict, reasoning: "r" }));

describe("Value Equation scoring", () => {
  it("strong everywhere = 10, weak everywhere = 0", () => {
    const s = scoreValueProfile(all("strong"));
    for (const d of VALUE_DIMENSIONS) expect(s.dimensions[d].score).toBe(10);
    expect(scoreValueProfile(all("weak")).dimensions.dream_outcome.score).toBe(0);
  });
  it("unknown never lowers a score; too many unknowns = not assessed", () => {
    const do4 = VALUE_CRITERIA.filter((c) => c.dimension === "dream_outcome");
    const half = [{ criterionId: do4[0].id, verdict: "strong" as const, reasoning: "" }, { criterionId: do4[1].id, verdict: "strong" as const, reasoning: "" }];
    expect(scoreValueProfile(half).dimensions.dream_outcome.score).toBe(10);
    const one = scoreValueProfile([half[0]]).dimensions.dream_outcome;
    expect(one.status).toBe("not_assessed");
    expect(one.score).toBeNull();
    expect(scoreValueProfile([]).dimensions.speed_to_value.status).toBe("not_assessed");
  });
  it("partial = 5, separates strengths, weaknesses and unknowns; weakest", () => {
    const s = scoreValueProfile([...all("partial", "dream_outcome"), ...all("strong", "speed_to_value")]);
    expect(s.dimensions.dream_outcome.score).toBe(5);
    expect(s.dimensions.dream_outcome.weaknesses).toHaveLength(4);
    expect(s.dimensions.speed_to_value.strengths.length).toBeGreaterThan(0);
    expect(s.dimensions.ease_of_achievement.unknown.length).toBe(4);
    expect(s.weakest).toBe("dream_outcome");
  });
  it("ignores unknown criterion ids; Before/After deltas", () => {
    const b = scoreValueProfile([{ criterionId: "nope", verdict: "strong", reasoning: "" }, ...all("partial")]);
    const a = scoreValueProfile(all("strong"));
    const cmp = compareProfiles(b, a);
    expect(cmp.find((x) => x.dimension === "dream_outcome")!.delta).toBe(5);
    expect(compareProfiles(scoreValueProfile([]), a)[0].delta).toBeNull();
  });
});

describe("operations", () => {
  it.each(OFFER_OPERATIONS)("%s has instructions + a strict schema", (op) => {
    const ctx = op.startsWith("public_") ? { source: "public" as const, tier: "core" as const, facts: { audience: "x" } } : { source: "workspace" as const, tier: "core" as const };
    const text = buildOperationInstructions(op, ctx);
    expect(text).toMatch(new RegExp(`# Task: ${op}`));
    expect(text).toMatch(/never invent testimonials/);
    expect((OPERATION_OUTPUT_SCHEMAS[op] as any).additionalProperties).toBe(false);
  });
  it("only rubric/field ops carry those blocks (no giant prompt)", () => {
    const u = buildOperationInstructions("understand", { source: "workspace", tier: "core" });
    expect(u).not.toMatch(/# Criteria/);
    expect(u).not.toMatch(/# Writable fields/);
    expect(buildOperationInstructions("diagnose", { source: "workspace", tier: "core" })).toMatch(/do_specific/);
    expect(buildOperationInstructions("package", { source: "workspace", tier: "continuity" })).toMatch(/recurring_offer\.interval.*allowed: .*monthly/);
  });
  it.each(OFFER_TIERS)("%s package fields come from its layout; Free has no price", (tier) => {
    const paths = categoryWritableFields(tier).map((f) => f.path);
    expect(paths.length).toBeGreaterThan(0);
    if (tier === "free") expect(paths).not.toContain("offer_stack.pricing.core_price");
    if (tier !== "core") expect(buildOperationInstructions("package", { source: "workspace", tier })).toMatch(/Category brief/);
  });
  it("public isolation", () => {
    expect(() => buildOperationInstructions("public_generate", { source: "workspace", tier: "core" })).toThrow();
    expect(() => buildOperationInstructions("diagnose", { source: "public", tier: "core", blueprint: { x: 1 } })).toThrow();
    expect(buildOperationInput({ source: "public", tier: "core", facts: { a: "b" }, blueprint: { secret: 1 } as any })).not.toContain("secret");
  });
  it("invalid AI outputs are rejected, not repaired", () => {
    expect(validateOperationOutput("diagnose", { assessments: [{ criterionId: "zzz", verdict: "strong" }], strengths: [], weaknesses: [], topImprovements: [] }).ok).toBe(false);
    expect(validateOperationOutput("diagnose", { assessments: [{ criterionId: "do_specific", verdict: "great" }], strengths: [], weaknesses: [], topImprovements: [] }).ok).toBe(false);
    expect(validateOperationOutput("strengthen", { options: [] }).ok).toBe(false);
    expect(validateOperationOutput("package", { writes: "nope", extras: {} }).ok).toBe(false);
    expect(validateOperationOutput("diagnose", { assessments: all("strong"), strengths: [], weaknesses: [], topImprovements: [] }).ok).toBe(true);
  });
});

describe("Offer Design mapping", () => {
  const design = { angle: { main_offer_name: "Old", hidden_x: "keep" }, stack: { deliverables: [{ id: "d1", name: "A", extra: 1 }] }, pricing: { core_price: "" } };
  it("applies valid writes, preserves hidden fields and list ids, appends new items", () => {
    const r = mapGeneratedToDesign("core", design, [
      { path: "offer_stack.angle.main_offer_name", value: "New" },
      { path: "offer_stack.stack.deliverables.new_0.name", value: "B" },
    ]);
    expect(r.ok).toBe(true);
    const d = (r as any).design;
    expect(d.angle.hidden_x).toBe("keep");
    expect(d.stack.deliverables[0]).toMatchObject({ id: "d1", name: "A", extra: 1 });
    expect(d.stack.deliverables[1].name).toBe("B");
    expect(d.stack.deliverables[1].id).toBeTruthy();
    expect(design.angle.main_offer_name).toBe("Old");
  });
  it("prices: Free fixed, paid 0 rejected, continuity interval enum", () => {
    expect(mapGeneratedToDesign("free", {}, [{ path: "offer_stack.pricing.core_price", value: "49" }]).ok).toBe(false);
    expect(mapGeneratedToDesign("low_ticket", {}, [{ path: "offer_stack.pricing.core_price", value: "0" }]).ok).toBe(false);
    expect(mapGeneratedToDesign("low_ticket", {}, [{ path: "offer_stack.pricing.core_price", value: "€47" }]).ok).toBe(true);
    expect(mapGeneratedToDesign("continuity", {}, [{ path: "offer_stack.pricing.recurring_offer.interval", value: "weekly" }]).ok).toBe(false);
  });
  it("all-or-nothing, unknown tier, other-category fields", () => {
    expect(mapGeneratedToDesign("core", design, [{ path: "offer_stack.angle.main_offer_name", value: "X" }, { path: "offer_stack.nope", value: "y" }]).ok).toBe(false);
    expect(mapGeneratedToDesign("bogus", design, [{ path: "offer_stack.angle.main_offer_name", value: "X" }]).ok).toBe(false);
    expect(mapGeneratedToDesign("free", {}, [{ path: "offer_stack.pricing.recurring_offer.monthly_price", value: "9" }]).ok).toBe(false);
  });
});

describe("public input", () => {
  const good = { audience: "coaches", outcome: "first clients", delivery: "1:1", obstacle: "no time", tier: "core" };
  it("valid input → context without Blueprint", () => {
    const r = validatePublicOfferInput(good);
    expect(r.ok).toBe(true);
    const ctx = publicInputToContext((r as any).input);
    expect(ctx.blueprint).toBeNull();
    expect(ctx.source).toBe("public");
  });
  it("rejects missing, too long, unknown keys and bad tier", () => {
    expect(validatePublicOfferInput({ ...good, audience: "" }).ok).toBe(false);
    expect(validatePublicOfferInput({ ...good, outcome: "x".repeat(301) }).ok).toBe(false);
    expect(validatePublicOfferInput({ ...good, sub_account_id: "x" }).ok).toBe(false);
    expect(validatePublicOfferInput({ ...good, tier: "vip" }).ok).toBe(false);
    expect(validatePublicOfferInput(null).ok).toBe(false);
  });
});

describe("builder extras + permissions", () => {
  it("every extra has a declared home", () => {
    expect(Object.keys(BUILDER_EXTRA_STORAGE).sort()).toEqual([...Object.keys(emptyBuilderExtras()), "valueAssessment"].sort());
  });
  it("existing AI permissions unchanged", () => {
    expect(offerAiPermission("free", "offer_stack.pricing.core_price", "offer").write).toBe(false);
    expect(offerAiPermission("core", "offer_stack.angle.main_offer_name").write).toBe(true);
  });
});

describe("ValueProfileChart", () => {
  it("renders Before/After, marks not-assessed, inspects a dimension", () => {
    const before = scoreValueProfile(all("partial", "dream_outcome"));
    const after = scoreValueProfile(all("strong"));
    const { container } = render(<ValueProfileChart before={before} after={after} improvements={{ dream_outcome: ["Make it measurable"] }} />);
    expect(container.querySelector('[data-profile="after"]')).toBeTruthy();
    expect(screen.getAllByText(/Not assessed/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Dream Outcome/ }));
    expect(screen.getByText("Make it measurable")).toBeTruthy();
    expect(screen.getByText(/not a prediction/)).toBeTruthy();
  });
  it("no data → no invented polygon", () => {
    const { container } = render(<ValueProfileChart />);
    expect(container.querySelector("[data-profile]")).toBeNull();
  });
});
