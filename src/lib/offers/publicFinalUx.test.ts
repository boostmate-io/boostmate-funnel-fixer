import { describe, it, expect } from "vitest";
import { validateChoices, finalizeFacts, describeDecisions, auditSnapshot } from "@shared/offerIntelligence/publicFlow";
import { validatePublicOfferInput, publicInputToContext } from "@shared/offerIntelligence/publicInput";
import { humanize, toText, isRedundant } from "@shared/offerIntelligence/plainLanguage";
import { comparisonState } from "@/pages/OfferGenerator";

const items: any[] = [{ id: "i0", weakness: "Show why it works", dimension: "perceived_likelihood", whyItMatters: "x",
  options: [{ id: "a", title: "A", change: "a", why: "", tradeoff: "", kind: "apply_now" }, { id: "b", title: "B", change: "b", why: "", tradeoff: "", kind: "future_action" }] }];

describe("own improvements", () => {
  it("requires text and is passed to generation as a proposal", () => {
    expect(validateChoices([{ itemId: "i0", choice: "own" }], items).ok).toBe(false);
    const v = validateChoices([{ itemId: "i0", choice: "own", custom: "Run a 4-week pilot" }], items);
    expect(v.ok).toBe(true);
    const facts = finalizeFacts({ profile: { dimensions: { dream_outcome: {}, perceived_likelihood: {}, speed_to_value: {}, ease_of_achievement: {} } }, assessments: [], weaknesses: [] } as any, items, (v as any).value);
    expect(facts.selectedImprovements).toMatch(/OWN IMPROVEMENT.*not yet in place.*Run a 4-week pilot/);
    expect(describeDecisions(items, (v as any).value)[0]).toMatchObject({ status: "own", detail: "Run a 4-week pilot" });
    expect(auditSnapshot({ strengthen: items, choices: (v as any).value }).decisions[0]).toMatchObject({ own: true, custom: "Run a 4-week pilot" });
  });
});

describe("credibility input", () => {
  it("is accepted and passed to the AI as a claim", () => {
    const r = validatePublicOfferInput({ tier: "core", audience: "a", outcome: "b", obstacle: "c", currentOffer: "d", credibility: "10 clients lost 5kg" });
    expect(r.ok).toBe(true);
    expect(publicInputToContext((r as any).input).facts.credibility).toMatch(/claim, not verified proof.*10 clients/);
  });
});

describe("comparison states", () => {
  it("never derives a delta from an unassessed score", () => {
    expect(comparisonState(null, 5)).toBe("new");
    expect(comparisonState(null, null)).toBe("none");
    expect(comparisonState(7, 7)).toBe("same");
    expect(comparisonState(3, 6)).toBe("up");
  });
});

describe("plain language", () => {
  it("removes rubric vocabulary and raw objects", () => {
    expect(humanize("Simpler steps improved this dimension, moving 'low customer effort' and 'obstacles removed' from partial/weak to strong.")).toBe("Simpler steps improved this part of your offer.");
    expect(toText({ name: "M", description: "D" })).toBe("M: D");
    expect(isRedundant("Lose 5kg.", "lose 5kg")).toBe(true);
  });
});
