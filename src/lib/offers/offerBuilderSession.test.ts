import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  BUILDER_STAGES, canEnterStage, stageState, toUnderstanding, sanitizeCorrections, confirmedFacts,
  buildBuilderContext, builderBlueprintContext, toDiagnosis,
} from "@shared/offerIntelligence/builderSession";
import { buildOperationInstructions, buildOperationInput, validateOperationOutput } from "@shared/offerIntelligence/operations";
import { VALUE_CRITERIA, scoreValueProfile } from "@shared/offerIntelligence/valueEquation";
import { OFFER_TIERS } from "@shared/blueprintRegistry";
import { offerAiPermission } from "@shared/offerAiPolicy";

const und = toUnderstanding({
  known: ["Audience: new yoga teachers"],
  assumed: [{ item: "Online delivery", why: "mentioned group program" }],
  missing: [{ item: "Price", question: "What do you charge today?" }],
});
const base = { stage: "understand" as const, status: "active", understanding: null, context_confirmed_at: null, diagnosis: null };

describe("stages", () => {
  it("all five stages available; C–E gated by earlier work", () => {
    expect(BUILDER_STAGES.filter((s) => s.available).map((s) => s.id)).toEqual(["understand", "diagnose", "strengthen", "package", "final"]);
    for (const t of ["strengthen", "package", "final"] as const) expect(canEnterStage({ ...base, understanding: und, context_confirmed_at: "x" }, t)).toBe(false);
  });
  it("diagnose requires analysed + confirmed context; closed sessions locked", () => {
    expect(canEnterStage(base, "diagnose")).toBe(false);
    expect(canEnterStage({ ...base, understanding: und }, "diagnose")).toBe(false);
    expect(canEnterStage({ ...base, understanding: und, context_confirmed_at: "t" }, "diagnose")).toBe(true);
    expect(canEnterStage({ ...base, status: "completed" }, "understand")).toBe(false);
  });
  it("stage states", () => {
    const s = { ...base, understanding: und, context_confirmed_at: "t", stage: "diagnose" as const };
    expect(stageState(s, "understand")).toBe("completed");
    expect(stageState(s, "diagnose")).toBe("active");
    expect(stageState(s, "package")).toBe("upcoming");
  });
});

describe("known / assumed / missing", () => {
  it("stable ids and bounded text", () => {
    expect(und.known[0].id).toBe("k0");
    expect(und.assumed[0]).toMatchObject({ id: "a0", why: "mentioned group program" });
    expect(und.missing[0].question).toMatch(/charge/);
  });
  it("corrections: only known ids, trimmed; re-analysis keeps matching answers", () => {
    expect(sanitizeCorrections(und, { a0: " In person ", zz: "x", m0: "" })).toEqual({ a0: "In person" });
    const again = toUnderstanding({ known: [], assumed: [{ item: "Online delivery", why: "" }], missing: [] }, { ...und, corrections: { a0: "In person" } });
    expect(again.corrections).toEqual({ a0: "In person" });
  });
  it("confirmed facts mark corrections and unknowns explicitly", () => {
    const f = confirmedFacts({ ...und, corrections: { a0: "In person", m0: "300" } });
    expect(f["assumption: Online delivery"]).toMatch(/CORRECTED BY USER: In person/);
    expect(f["answer: Price"]).toBe("300");
    expect(confirmedFacts(und)["still missing: Price"]).toBe("unknown");
  });
});

describe("context", () => {
  it("never passes the Primary's offer_stack as Blueprint; new offers have no design", () => {
    const bp = { customer_clarity: { a: 1 }, offer_stack: { secret: 1 } };
    expect(builderBlueprintContext(bp)).not.toHaveProperty("offer_stack");
    const ctx = buildBuilderContext({ tier: "free", mode: "new", blueprint: bp, design: { x: 1 }, intake: { idea: "Checklist" }, understanding: null, ecosystem: null });
    expect(ctx.design).toBeNull();
    expect(ctx.facts!.offer_idea).toBe("Checklist");
    expect(buildOperationInput(ctx)).not.toContain("secret");
  });
  it.each(OFFER_TIERS)("%s builds understand + diagnose instructions", (tier) => {
    const ctx = buildBuilderContext({ tier, mode: "existing", blueprint: null, design: {}, intake: {}, understanding: und, ecosystem: "# RELATED" });
    expect(buildOperationInstructions("understand", ctx)).toMatch(/KNOWN/);
    expect(buildOperationInstructions("diagnose", ctx)).toMatch(/do_specific/);
    expect(buildOperationInput(ctx)).toContain("Other offers (read-only)");
  });
  it("new-idea framing and unknown tier rejected", () => {
    const ctx = buildBuilderContext({ tier: "core", mode: "new", blueprint: null, design: null, intake: { idea: "x" }, understanding: null, ecosystem: null });
    expect(buildOperationInstructions("diagnose", ctx)).toMatch(/NEW offer idea/);
    expect(() => buildBuilderContext({ tier: "vip", mode: "new", blueprint: null, design: null, intake: {}, understanding: null, ecosystem: null })).toThrow();
  });
});

describe("diagnosis", () => {
  const out = { assessments: VALUE_CRITERIA.map((c) => ({ criterionId: c.id, verdict: c.dimension === "speed_to_value" ? "unknown" : "partial", reasoning: "r" })), strengths: ["s"], weaknesses: ["w"], topImprovements: ["1", "2", "3", "4"] };
  it("scores with the shared calculation; unknown dimension not assessed", () => {
    const d = toDiagnosis(out as any, 3);
    expect(d.profile).toEqual(scoreValueProfile(out.assessments as any));
    expect(d.profile.dimensions.speed_to_value.status).toBe("not_assessed");
    expect(d.profile.dimensions.dream_outcome.score).toBe(5);
    expect(d.topImprovements).toHaveLength(3);
    expect(d.basedOnVersion).toBe(3);
  });
  it("invalid AI outputs rejected", () => {
    expect(validateOperationOutput("understand", { known: "x" }).ok).toBe(false);
    expect(validateOperationOutput("diagnose", { ...out, assessments: [{ criterionId: "nope", verdict: "strong" }] }).ok).toBe(false);
  });
});

describe("server function guarantees", () => {
  const src = readFileSync("supabase/functions/offer-builder/index.ts", "utf8");
  it("uses the caller's JWT (RLS) and checks workspace access", () => {
    expect(src).not.toMatch(/SERVICE_ROLE/);
    expect(src).toMatch(/is_sub_account_member/);
  });
  it("category comes from the saved offer; browser tier only for new sessions", () => {
    expect(src).toMatch(/tier: offer\.tier, mode: "existing"/);
    expect(src).toMatch(/tier = offer\.tier/);
  });
  it("optimistic concurrency on every update", () => {
    expect(src).toMatch(/\.eq\("version", s\.version\)/);
    expect(src).toMatch(/error: "conflict"/);
  });
  it("never writes offers, relationships, funnels or Blueprints", () => {
    expect(src).not.toMatch(/from\("offers"\)\.(update|insert|delete|upsert)/);
    expect(src).not.toMatch(/from\("(offer_relationships|funnels|business_blueprints)"\)\.(update|insert|delete|upsert)/);
  });
  it("diagnosis requires confirmed context", () => {
    expect(src).toMatch(/context_not_confirmed/);
  });
  it("AI permissions unchanged", () => {
    expect(offerAiPermission("free", "offer_stack.pricing.core_price", "offer").write).toBe(false);
  });
});
