import { describe, it, expect } from "vitest";
import { PUBLIC_DIAGNOSE_INSTRUCTION, PUBLIC_STRENGTHEN_INSTRUCTION, finalizeFacts } from "@shared/offerIntelligence/publicFlow";
import { TASK, OPERATION_OUTPUT_SCHEMAS, validateOperationOutput } from "@shared/offerIntelligence/operations";
import { humanize } from "@shared/offerIntelligence/plainLanguage";

const gen = (TASK as any).public_generate as string;
const str = (TASK as any).public_strengthen as string;

// Fictional regression case: freelance designer business coaching, 8 weeks, €1,200.
const items: any[] = [
  { id: "i0", weakness: "Make your client results more visible", dimension: "perceived_likelihood", whyItMatters: "x",
    options: [{ id: "a", title: "Introduce your Portfolio-to-Pipeline Method", change: "Explain the steps", why: "", tradeoff: "", kind: "apply_now" },
      { id: "b", title: "Document three real client outcomes", change: "Ask past clients", why: "", tradeoff: "", kind: "future_action" }] },
  { id: "i1", weakness: "Reduce uncertainty for prospective clients", dimension: "perceived_likelihood", whyItMatters: "x",
    options: [{ id: "a", title: "Offer a free 20-minute fit assessment", change: "Add a fit call", why: "", tradeoff: "", kind: "apply_now" },
      { id: "b", title: "Explain what to expect", change: "x", why: "", tradeoff: "", kind: "apply_now" }] },
];
const diag: any = { profile: { dimensions: { dream_outcome: {}, perceived_likelihood: {}, speed_to_value: {}, ease_of_achievement: {} } }, assessments: [], weaknesses: [] };

describe("public AI output quality rules", () => {
  it("1–2: missing guarantee/testimonials are not automatic weaknesses", () => {
    expect(PUBLIC_DIAGNOSE_INSTRUCTION).toMatch(/missing guarantee is never automatically a weakness/i);
    expect(PUBLIC_DIAGNOSE_INSTRUCTION).toMatch(/Missing testimonials or case studies mean the evidence is not yet shown/);
    expect(PUBLIC_DIAGNOSE_INSTRUCTION).toMatch(/strategic objectives/);
  });
  it("3: hypothetical results are never presented as verified", () => {
    expect(str).toMatch(/never invent specific client results/i);
    expect(str).toMatch(/'for example'/);
    expect(gen).toMatch(/Never invent client results/);
  });
  it("4: internal labels never reach visitor text", () => {
    expect(humanize("The APPLY NOW improvements directly tackled obstacles.")).toBe("the changes you chose directly tackled obstacles.");
    expect(humanize("[FUTURE ACTION] Collect testimonials")).toBe("Collect testimonials");
    expect(humanize("apply_now change")).not.toMatch(/apply_now/);
    const facts = finalizeFacts(diag, items, [{ itemId: "i0", choice: "a" }, { itemId: "i1", choice: "a" }]);
    expect(facts.selectedImprovements).not.toMatch(/APPLY NOW/);
    expect(gen).toMatch(/never use internal labels/);
  });
  it("5: proposed benefits use calibrated language", () => {
    expect(gen).toMatch(/never claim an effect on buying behaviour or conversion as achieved/);
  });
  it("6: named methods carry grounded steps", () => {
    expect(gen).toMatch(/methodSteps: when the offer has a named method, 3–6 concrete steps/);
    expect(JSON.stringify((OPERATION_OUTPUT_SCHEMAS as any).public_generate)).toMatch(/methodSteps/);
    expect(validateOperationOutput("public_generate", { writes: [{ path: "x" }], assessments: [], audience: "", methodSummary: "", assumptions: [], insights: [], topImprovements: [], pricing: { recommend: false }, methodSteps: [{ description: "no name" }] }).ok).toBe(false);
  });
  it("7–8: selected vs additional, proposed vs implementation", () => {
    expect(gen).toMatch(/additionalRecommendations: 0–3 other useful opportunities the visitor did NOT select/);
    expect(gen).toMatch(/futureActions = the implementation checklist for the SELECTED improvements only/);
    expect(gen).toMatch(/Proposed vs operational/);
    expect(str).toMatch(/creating a case study.*is future_action/);
  });
  it("9: pricing guidance without benchmarks", () => {
    expect(gen).toMatch(/pricingGuidance \(always fill/);
    expect(gen).toMatch(/No market benchmarks, competitor prices, ROI calculations/);
    expect(gen).toMatch(/never recommend raising the price by default/);
  });
  it("strengthen titles avoid clichés", () => {
    expect(str).toMatch(/secret sauce/);
    expect(PUBLIC_STRENGTHEN_INSTRUCTION).toMatch(/objective-first/);
  });
});

import { coversAction } from "@shared/offerIntelligence/publicFlow";
describe("implementation checklist dedupe", () => {
  it("does not re-add a selected action the model already listed", () => {
    expect(coversAction("Collect formal written or video testimonials from past clients.", "Collect formal client testimonials: Reach out to your six past clients")).toBe(true);
    expect(coversAction("Create the fit assessment questionnaire.", "Collect formal client testimonials")).toBe(false);
  });
});
