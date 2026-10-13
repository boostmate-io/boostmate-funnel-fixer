import { describe, it, expect } from "vitest";
import {
  reconcileFinal, describeDecisions, PUBLIC_DIAGNOSE_INSTRUCTION, PUBLIC_FINAL_INSTRUCTION,
  buildDiagnosis, buildStrengthen, validateChoices, finalizeFacts, validateAuditRequest, normalizeInstagram, normalizeWebsite, auditSnapshot,
} from "@shared/offerIntelligence/publicFlow";
import { validatePublicOfferInput, publicInputToContext } from "@shared/offerIntelligence/publicInput";
import { buildOperationInstructions, OPERATION_OUTPUT_SCHEMAS } from "@shared/offerIntelligence/operations";
import { VALUE_CRITERIA, humanizeCriterionCodes } from "@shared/offerIntelligence/valueEquation";

const assess = (verdict = "partial") => VALUE_CRITERIA.map((c) => ({ criterionId: c.id, verdict, reasoning: "r" }));
const diag = () => ({ assessments: assess(), strengths: ["s1"], weaknesses: ["w1", "w2"], topImprovements: ["t1", "t2", "t3"] });
const opt = (t: string, kind = "apply_now") => ({ title: t, change: `${t} change`, why: "w", tradeoff: "t", kind });
const strengthenRaw = () => ({ items: [
  { weakness: "Make it believable", dimension: "perceived_likelihood", whyItMatters: "m", options: [opt("A"), opt("B"), opt("C")] },
  { weakness: "Faster first win", dimension: "speed_to_value", whyItMatters: "m", options: [opt("D", "future_action"), opt("E")] },
  { weakness: "Only one option", dimension: "ease_of_achievement", whyItMatters: "m", options: [opt("F")] },
] });

describe("public discovery input", () => {
  it("accepts an idea without a delivery description and marks it as new", () => {
    const r = validatePublicOfferInput({ audience: "a", outcome: "b", obstacle: "d", currentOffer: "Group program idea", stage: "idea", tier: "core" });
    expect(r.ok).toBe(true);
    const ctx = publicInputToContext((r as any).input);
    expect(ctx.mode).toBe("new");
    expect(ctx.facts.delivery).toBeUndefined();
    expect(buildOperationInstructions("diagnose", ctx)).toMatch(/NEW offer idea/);
  });
  it("requires an offer or a delivery description, and a known currency", () => {
    expect(validatePublicOfferInput({ audience: "a", outcome: "b", obstacle: "d", tier: "core" }).ok).toBe(false);
    expect(validatePublicOfferInput({ audience: "a", outcome: "b", obstacle: "d", currentOffer: "x", currency: "BTC", tier: "core" }).ok).toBe(false);
    const ok = validatePublicOfferInput({ audience: "a", outcome: "b", obstacle: "d", currentOffer: "x", currentPrice: "997", currency: "EUR", tier: "core" });
    expect(publicInputToContext((ok as any).input).facts.currentPrice).toBe("997 EUR");
  });
});

describe("diagnose / strengthen / finalize", () => {
  it("scores the Before profile with the shared engine; unknown stays unknown", () => {
    const d = buildDiagnosis({ ...diag(), assessments: assess("unknown") });
    expect(d.ok).toBe(true);
    expect((d as any).value.profile.dimensions.dream_outcome.score).toBeNull();
    expect(buildDiagnosis({ foo: 1 }).ok).toBe(false);
  });
  it("keeps 2 options per area and drops areas without two options", () => {
    const s = buildStrengthen(strengthenRaw());
    expect(s.ok).toBe(true);
    const items = (s as any).value;
    expect(items).toHaveLength(2);
    expect(items[0].options.map((o: any) => o.id)).toEqual(["a", "b"]);
    expect(items.map((i: any) => i.id)).toEqual(["i0", "i1"]);
  });
  it("requires one decision per area and passes decisions into the final offer", () => {
    const items = (buildStrengthen(strengthenRaw()) as any).value;
    expect(validateChoices([{ itemId: "i0", choice: "a" }], items).ok).toBe(false);
    expect(validateChoices([{ itemId: "i0", choice: "x" }, { itemId: "i1", choice: "b" }], items).ok).toBe(false);
    const c = validateChoices([{ itemId: "i0", choice: "b", custom: "my twist" }, { itemId: "i1", choice: "keep", custom: "ignored" }], items);
    expect(c.ok).toBe(true);
    expect((c as any).value[1].custom).toBeUndefined();
    const facts = finalizeFacts((buildDiagnosis(diag()) as any).value, items, (c as any).value);
    expect(facts.selectedImprovements).toContain("[APPLY NOW, adjusted by the visitor] Make it believable: B — my twist");
    expect(facts.selectedImprovements).toContain("Faster first win: keep current approach");
  });
  it("final operation re-assesses independently and returns score changes + next steps", () => {
    const ctx = publicInputToContext((validatePublicOfferInput({ audience: "a", outcome: "b", obstacle: "d", currentOffer: "x", tier: "core" }) as any).input);
    const text = buildOperationInstructions("public_generate", ctx);
    expect(text).toMatch(/same rubric and evidence standard/);
    expect(text).toMatch(/selectedImprovements/);
    expect((OPERATION_OUTPUT_SCHEMAS.public_generate as any).required).toEqual(expect.arrayContaining(["dimensionChanges", "appliedImprovements", "futureActions", "validationNeeds", "nextSteps"]));
    expect(() => buildOperationInstructions("public_strengthen", { source: "workspace", tier: "core" } as any)).toThrow("public_only_operation");
  });
});

describe("video audit request", () => {
  it("normalizes Instagram handles and URLs", () => {
    expect(normalizeInstagram("@Coach.Mark")).toBe("coach.mark");
    expect(normalizeInstagram("https://www.instagram.com/coach_mark/?hl=en")).toBe("coach_mark");
    expect(normalizeInstagram("not a handle!")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
    expect(normalizeWebsite("mysite.com")).toBe("https://mysite.com/");
    expect(normalizeWebsite("javascript:alert(1)")).toBe(false);
  });
  it("validates required fields; consent is never defaulted", () => {
    expect(validateAuditRequest({ email: "x", instagram: "", channel: "nope" }).ok).toBe(false);
    const ok = validateAuditRequest({ email: "A@B.com", instagram: "@me", channel: "referrals" });
    expect(ok).toMatchObject({ ok: true, value: { email: "a@b.com", instagram: "me", website: null, marketingConsent: false } });
  });
  it("snapshots answers, before/after scores and decisions for the admin", () => {
    const d = (buildDiagnosis(diag()) as any).value;
    const items = (buildStrengthen(strengthenRaw()) as any).value;
    const snap = auditSnapshot({ input: { audience: "a" }, diagnosis: d, strengthen: items, choices: [{ itemId: "i0", choice: "a" }, { itemId: "i1", choice: "keep" }], result: { offerName: "N", profile: d.profile } });
    expect(snap.decisions).toEqual([{ area: "Make it believable", choice: "A", custom: null }, { area: "Faster first win", choice: "Keep current approach", custom: null }]);
    expect(snap.beforeScores!.dream_outcome).toBe(5);
    expect(snap.offer!.name).toBe("N");
  });
});

describe("Before/After consistency", () => {
  const verdicts = (map: Record<string, string>, dflt = "partial") => VALUE_CRITERIA.map((c) => ({ criterionId: c.id, verdict: map[c.id] ?? dflt, reasoning: `r ${c.id}` }));
  const items = () => (buildStrengthen(strengthenRaw()) as any).value;
  const result = (assessments: any[], changes: any[] = []) => ({
    offerName: "N", assessments, futureActions: [], profile: null, beforeProfile: null,
    dimensionChanges: ["dream_outcome", "perceived_likelihood", "speed_to_value", "ease_of_achievement"].map((d) => ({ dimension: d, direction: "same", whatChanged: "", stillUncertain: "", why: "", ...(changes.find((c) => c.dimension === d) ?? {}) })),
  }) as any;

  it("never creates proof, caps planned likelihood changes and limits jumps to one step", () => {
    const d = (buildDiagnosis({ ...diag(), assessments: verdicts({ pl_proof: "unknown", pl_risk: "weak", do_specific: "weak" }) }) as any).value;
    const r = reconcileFinal(result(verdicts({}, "strong")), d, items(), [{ itemId: "i0", choice: "a" }, { itemId: "i1", choice: "a" }]);
    const v = Object.fromEntries(r.assessments.map((a: any) => [a.criterionId, a.verdict]));
    expect(v.pl_proof).toBe("unknown");
    expect(v.pl_risk).toBe("partial");
    expect(v.pl_method).toBe("partial");
    expect(v.do_specific).toBe("partial");
    expect(v.do_relevant).toBe("strong");
    expect(r.profile.dimensions.perceived_likelihood.score).toBeLessThan(10);
    expect(r.dimensionChanges.find((c: any) => c.dimension === "perceived_likelihood").adjusted).toBe(true);
  });
  it("restores unexplained drops but keeps explained ones, and syncs directions with real deltas", () => {
    const d = (buildDiagnosis({ ...diag(), assessments: verdicts({}, "strong") }) as any).value;
    const unexplained = reconcileFinal(result(verdicts({}, "weak")), d, items(), [{ itemId: "i0", choice: "keep" }, { itemId: "i1", choice: "keep" }]);
    expect(unexplained.profile.dimensions.perceived_likelihood.score).toBe(10);
    const explained = reconcileFinal(result(verdicts({ pl_method: "partial" }, "strong"), [{ dimension: "perceived_likelihood", direction: "down" }]), d, items(), [{ itemId: "i0", choice: "keep" }, { itemId: "i1", choice: "keep" }]);
    expect(explained.dimensionChanges.find((c: any) => c.dimension === "perceived_likelihood").direction).toBe("down");
    expect(explained.dimensionChanges.find((c: any) => c.dimension === "dream_outcome").direction).toBe("same");
  });
  it("lists selected future actions as planned, never as applied", () => {
    const d = (buildDiagnosis(diag()) as any).value;
    const choices = [{ itemId: "i0", choice: "a" as const }, { itemId: "i1", choice: "a" as const }];
    const r = reconcileFinal(result(verdicts({})), d, items(), choices);
    expect(r.futureActions.some((f: string) => f.startsWith("D"))).toBe(true);
    expect(describeDecisions(items(), choices).map((x) => x.status)).toEqual(["applied", "future"]);
  });
  it("public text never shows criterion codes; both assessments share the evidence calibration", () => {
    expect(humanizeCriterionCodes("Weak on pl_proof and sv_first_win.")).toBe("Weak on proof and first win.".replace("proof", VALUE_CRITERIA.find((c) => c.id === "pl_proof")!.label.toLowerCase()).replace("first win", VALUE_CRITERIA.find((c) => c.id === "sv_first_win")!.label.toLowerCase()));
    const dd = (buildDiagnosis({ ...diag(), strengths: ["Good do_specific"] }) as any).value;
    expect(dd.strengths[0]).not.toMatch(/do_specific/);
    expect(PUBLIC_DIAGNOSE_INSTRUCTION).toMatch(/Evidence calibration/);
    expect(PUBLIC_FINAL_INSTRUCTION).toMatch(/Evidence calibration/);
  });
});

import { validateBlueprintRequest } from "@shared/offerIntelligence/publicFlow";
describe("validateBlueprintRequest", () => {
  it("accepts PDF-only requests without audit fields", () => {
    const r = validateBlueprintRequest({ email: "A@Example.com", auditRequested: false });
    expect(r.ok && r.value).toEqual({ email: "a@example.com", marketingConsent: false, audit: null });
  });
  it("requires Instagram and acquisition text when the audit is requested", () => {
    const r = validateBlueprintRequest({ email: "a@example.com", auditRequested: true });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(Object.keys(r.errors).sort()).toEqual(["acquisition", "instagram"]);
  });
  it("normalizes audit fields and keeps marketing consent separate", () => {
    const r = validateBlueprintRequest({ email: "a@example.com", auditRequested: true, instagram: "instagram.com/Coach.Mark", acquisition: "Referrals and DMs", website: "coach.com", marketingConsent: true });
    expect(r.ok && r.value.audit).toEqual({ instagram: "coach.mark", acquisition: "Referrals and DMs", website: "https://coach.com/" });
    expect(r.ok && r.value.marketingConsent).toBe(true);
  });
});
