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

import { alignScoreWhy, splitPreProgram } from "@shared/offerIntelligence/plainLanguage";
describe("pre-launch corrections", () => {
  it("never claims an increase when the score is unchanged", () => {
    expect(alignScoreWhy("same", "The new method improved this score.", "perceived likelihood", "3.3/10")).toMatch(/stays at 3.3\/10/);
    expect(alignScoreWhy("up", "A clearer outcome increased this.", "dream outcome", "7/10")).toBe("A clearer outcome increased this.");
    expect(alignScoreWhy("same", "No evidence yet, so it stays put.", "x", "3/10")).toBe("No evidence yet, so it stays put.");
  });
  it("moves pre-enrollment steps out of program deliverables only when flagged", () => {
    const d = [{ name: "Initial Clarity Assessment" }, { name: "Weekly 1:1 Calls" }];
    expect(splitPreProgram(d, [{ name: "Initial clarity assessment" }]).map((x) => x.name)).toEqual(["Weekly 1:1 Calls"]);
    expect(splitPreProgram(d, [])).toHaveLength(2);
  });
});

import { dedupeActions } from "@shared/offerIntelligence/publicFlow";
describe("checklist dedupe", () => {
  it("merges equivalent tasks, keeps distinct ones", () => {
    const out = dedupeActions([
      "Reach out to three previous clients to gather specific testimonials detailing their results.",
      "Develop the content and exercises for each phase of the method.",
      "Document past client successes: contact your three previous clients and ask for a testimonial with results and permission to use it.",
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatch(/permission/);
  });
});

import { reconcileFinal } from "@shared/offerIntelligence/publicFlow";
import { VALUE_CRITERIA, scoreValueProfile } from "@shared/offerIntelligence/valueEquation";
describe("no unexplained drops from newly assessed criteria", () => {
  it("keeps an unknown criterion unknown when it would only lower a scored dimension", () => {
    const before = VALUE_CRITERIA.map((c) => ({ criterionId: c.id, verdict: (c.id === "do_status" ? "unknown" : "partial") as any, reasoning: "" }));
    const after = before.map((a) => ({ ...a, verdict: (a.criterionId === "do_status" ? "weak" : "partial") as any }));
    const out = reconcileFinal({ assessments: after, dimensionChanges: [], futureActions: [] } as any, { assessments: before, profile: scoreValueProfile(before) } as any, [], []);
    expect(out.profile.dimensions.dream_outcome.score).toBe(scoreValueProfile(before).dimensions.dream_outcome.score);
  });
});
