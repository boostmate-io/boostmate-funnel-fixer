import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildPublicResult, toPublicPreview, decideRateLimit, looksLikeBot, claimedOfferRow, DEFAULT_RATE_LIMITS, EMAIL_RE,
} from "@shared/offerIntelligence/publicResult";
import { validatePublicOfferInput, publicInputToContext } from "@shared/offerIntelligence/publicInput";
import { buildOperationInstructions } from "@shared/offerIntelligence/operations";
import { VALUE_CRITERIA } from "@shared/offerIntelligence/valueEquation";
import { offerAiPermission } from "@shared/offerAiPolicy";
import { designForRow } from "@/lib/offers/offerRepository";

const assess = (verdict = "strong") => VALUE_CRITERIA.map((c) => ({ criterionId: c.id, verdict, reasoning: "r" }));
const good = (over: Record<string, unknown> = {}) => ({
  writes: [
    { path: "offer_stack.angle.main_offer_name", value: "The 30-Hour CEO" },
    { path: "offer_stack.angle.core_outcome", value: "Run the business in 30 hours a week" },
    { path: "offer_stack.angle.short_description", value: "12-week program" },
    { path: "offer_stack.stack.deliverables.new_0.name", value: "Weekly call" },
    { path: "offer_stack.stack.deliverables.new_0.frequency", value: "one-time" },
  ],
  assessments: assess(), beforeAssessments: [],
  audience: "Founders", methodSummary: "Method", deliveryApproach: "1:1", assumptions: ["a"],
  pricing: { recommend: true, low: 1500, high: 3000, reasoning: "Scope", assumptions: ["x"] },
  insights: ["i1", "i2", "i3"], topImprovements: ["a", "b", "c"],
  ...over,
});

describe("AI output → public result", () => {
  it("valid output builds a Core design + profile; list enums normalised", () => {
    const r = buildPublicResult(good(), { hasCurrentOffer: false });
    expect(r.ok).toBe(true);
    const res = (r as any).result;
    expect(res.offerName).toBe("The 30-Hour CEO");
    expect(res.design.stack.deliverables[0].frequency).toBe("one_time");
    expect(res.design.stack.deliverables[0].id).toBeTruthy();
    expect(res.profile.dimensions.dream_outcome.score).toBe(10);
    expect(res.beforeProfile).toBeNull();
    expect(res.insights).toHaveLength(2);
  });
  it("pricing writes are never stored in the design; estimates only when supported", () => {
    const r = buildPublicResult(good({ writes: [...good().writes, { path: "offer_stack.pricing.core_price", value: "999" }] }), { hasCurrentOffer: false });
    expect((r as any).result.design.pricing).toBeUndefined();
    expect((r as any).result.droppedWrites).toContain("offer_stack.pricing.core_price");
    expect((buildPublicResult(good({ pricing: { recommend: false, low: 0, high: 0, reasoning: "", assumptions: [] } }), { hasCurrentOffer: false }) as any).result.pricing).toBeNull();
    expect((buildPublicResult(good({ pricing: { recommend: true, low: 500, high: 100, reasoning: "x", assumptions: [] } }), { hasCurrentOffer: false }) as any).result.pricing).toBeNull();
    expect((buildPublicResult(good(), { hasCurrentOffer: false }) as any).result.pricing.label).toBe("estimate");
  });
  it("Before profile only with a described current offer", () => {
    const withBefore = good({ beforeAssessments: assess("partial") });
    expect((buildPublicResult(withBefore, { hasCurrentOffer: false }) as any).result.beforeProfile).toBeNull();
    expect((buildPublicResult(withBefore, { hasCurrentOffer: true }) as any).result.beforeProfile.dimensions.dream_outcome.score).toBe(5);
  });
  it("incomplete information → not assessed, not low", () => {
    const r = buildPublicResult(good({ assessments: assess("unknown") }), { hasCurrentOffer: false });
    expect((r as any).result.profile.dimensions.speed_to_value.status).toBe("not_assessed");
    expect((r as any).result.profile.dimensions.speed_to_value.score).toBeNull();
  });
  it("malformed / invalid outputs are rejected", () => {
    expect(buildPublicResult(null, { hasCurrentOffer: false }).ok).toBe(false);
    expect(buildPublicResult({ foo: 1 }, { hasCurrentOffer: false }).ok).toBe(false);
    expect(buildPublicResult(good({ writes: [{ path: "offer_stack.angle.nope", value: "x" }] }), { hasCurrentOffer: false }).ok).toBe(false);
    expect(buildPublicResult(good({ writes: [{ path: "offer_stack.stack.deliverables.new_0.frequency", value: "sometimes" }, ...good().writes] }), { hasCurrentOffer: false }).ok).toBe(false);
    expect(buildPublicResult(good({ writes: [{ path: "offer_stack.angle.short_description", value: "x" }] }), { hasCurrentOffer: false })).toMatchObject({ ok: false, reason: "incomplete_offer" });
    expect(buildPublicResult(good({ assessments: [{ criterionId: "fake", verdict: "strong" }] }), { hasCurrentOffer: false }).ok).toBe(false);
  });
  it("preview withholds reasoning", () => {
    const res = (buildPublicResult(good(), { hasCurrentOffer: false }) as any).result;
    const p = toPublicPreview(res);
    expect(p.profile!.dimensions.dream_outcome.score).toBe(10);
    expect(p.profile!.dimensions.dream_outcome.strengths).toEqual([]);
    expect((p as any).assumptions).toBeUndefined();
    expect((p as any).design).toBeUndefined();
  });
});

describe("abuse protection", () => {
  it("rate limits", () => {
    expect(decideRateLimit({ ipHour: 0, ipDay: 0, globalDay: 0 }).ok).toBe(true);
    expect(decideRateLimit({ ipHour: DEFAULT_RATE_LIMITS.perIpHour, ipDay: 1, globalDay: 0 })).toEqual({ ok: false, reason: "ip_hourly" });
    expect(decideRateLimit({ ipHour: 0, ipDay: DEFAULT_RATE_LIMITS.perIpDay, globalDay: 0 })).toEqual({ ok: false, reason: "ip_daily" });
    expect(decideRateLimit({ ipHour: 0, ipDay: 0, globalDay: 5 }, { ...DEFAULT_RATE_LIMITS, globalDay: 5 })).toEqual({ ok: false, reason: "global_daily" });
  });
  it("bot checks", () => {
    expect(looksLikeBot({ website: "x", elapsedMs: 10000 })).toBe(true);
    expect(looksLikeBot({ website: "", elapsedMs: 500 })).toBe(true);
    expect(looksLikeBot({ elapsedMs: "abc" })).toBe(true);
    expect(looksLikeBot({ website: "", elapsedMs: 9000 })).toBe(false);
  });
  it("email validation", () => {
    expect(EMAIL_RE.test("a@b.co")).toBe(true);
    expect(EMAIL_RE.test("nope")).toBe(false);
  });
});

describe("public isolation", () => {
  it("public input can't carry workspace data; instructions exclude pricing fields", () => {
    expect(validatePublicOfferInput({ audience: "a", outcome: "b", delivery: "c", obstacle: "d", tier: "core", blueprint: {} }).ok).toBe(false);
    const ctx = publicInputToContext((validatePublicOfferInput({ audience: "a", outcome: "b", delivery: "c", obstacle: "d", tier: "core" }) as any).input);
    const text = buildOperationInstructions("public_generate", ctx);
    expect(text).not.toMatch(/offer_stack\.pricing\./);
    expect(text).toMatch(/frequency = one_time/);
  });
  it("server functions: public one never touches workspace tables; claim checks membership, expiry, single claim", () => {
    const pub = readFileSync("supabase/functions/offer-generator-public/index.ts", "utf8");
    expect(pub).not.toMatch(/business_blueprints|ai_coach|from\("offers"\)/);
    expect(pub).toMatch(/validateAuditRequest/);
    expect(readFileSync("supabase/functions/_shared/offerIntelligence/publicFlow.ts", "utf8")).toMatch(/marketingConsent === true/);
    const claim = readFileSync("supabase/functions/claim-offer-generation/index.ts", "utf8");
    expect(claim).toMatch(/is_sub_account_member/);
    expect(claim).toMatch(/expires_at/);
    expect(claim).toMatch(/\.is\("claimed_at", null\)/);
    expect(claim).not.toMatch(/blueprint_core"\s*,/);
    expect(claim).not.toMatch(/update\(\{ offer_stack/);
  });
});

describe("Offer Design compatibility", () => {
  it("claimed row opens in the existing editor as a Core design", () => {
    const res = (buildPublicResult(good(), { hasCurrentOffer: false }) as any).result;
    const row = claimedOfferRow(res, "gen-1");
    const d = designForRow({ name: row.name, data: row.data as any, tier: "core" });
    expect(d.angle.main_offer_name).toBe("The 30-Hour CEO");
    expect(d.stack.deliverables[0].name).toBe("Weekly call");
    expect(Array.isArray(d.stack.bonuses)).toBe(true);
    expect(row.data.price).toBe("");
    expect(row.data.offer_generator.generation_id).toBe("gen-1");
  });
  it("existing AI permissions unchanged", () => {
    expect(offerAiPermission("free", "offer_stack.pricing.core_price", "offer").write).toBe(false);
  });
});
