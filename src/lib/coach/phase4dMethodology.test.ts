import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { COACH_METHODOLOGY, COACH_FIELD_METHOD, COACH_SECTION_PRECEDENCE } from "@shared/coachMethodology";
import { offerAiPermission } from "@shared/offerAiPolicy";

const server = readFileSync("supabase/functions/coach-chat/index.ts", "utf8");

describe("shared methodology rendering", () => {
  it("is appended after the (admin-editable) base, field and section prompts", () => {
    expect(server).toContain("[prompts.base, COACH_METHODOLOGY]");
    expect(server).toMatch(/parts\.push\(prompts\.field\);\s*parts\.push\(COACH_FIELD_METHOD\)/);
    expect(server).toMatch(/parts\.push\(prompts\.section\);\s*parts\.push\(COACH_SECTION_PRECEDENCE\)/);
  });
  it("Core base prompt text itself is unchanged (still present verbatim)", () => {
    expect(server).toContain("You are the Boostmate AI Coach — a warm, sharp Growth Strategist");
    expect(server).toContain("Ask targeted, insightful questions. Never dump a wall of questions.");
    expect(server).toContain("GUIDED WALKTHROUGH");
  });
  it("stays concise", () => {
    expect(COACH_METHODOLOGY.length).toBeLessThan(4500);
  });
});

describe("rules", () => {
  it("context-first questioning", () => {
    expect(COACH_METHODOLOGY).toMatch(/Before asking anything, check the Blueprint, the active offer/);
    expect(COACH_METHODOLOGY).toMatch(/single most relevant question/);
    expect(COACH_METHODOLOGY).toMatch(/label it \("Assuming…"\)/);
  });
  it("contradictions: explain, fix, never overwrite, may be intentional", () => {
    expect(COACH_METHODOLOGY).toMatch(/Premium upgrade without a clear source offer/);
    expect(COACH_METHODOLOGY).toMatch(/Never overwrite existing information/);
    expect(COACH_METHODOLOGY).toMatch(/may be intentional/);
  });
  it("honesty and evidence", () => {
    for (const re of [/Never invent testimonials/, /conversion rates/, /never fabricate proof/, /market prices or benchmarks as verified facts/, /never claim research/, /Label hypothetical examples/]) {
      expect(COACH_METHODOLOGY).toMatch(re);
    }
  });
  it("pricing reasoning, uncertainty and Continuity interval", () => {
    expect(COACH_METHODOLOGY).toMatch(/indicative range plus the assumptions/);
    expect(COACH_METHODOLOGY).toMatch(/a later offer doesn't have to cost more/);
    expect(COACH_METHODOLOGY).toMatch(/Free offers stay free/);
    expect(COACH_METHODOLOGY).toMatch(/explain how the amount and billing frequency change/);
  });
  it("field coaching uses surrounding offer, one question max", () => {
    expect(COACH_FIELD_METHOD).toMatch(/rest of the active offer/);
    expect(COACH_FIELD_METHOD).toMatch(/at most one focused question/);
  });
  it("section precedence: boundaries before 'fill every empty field'", () => {
    const i = (s: string) => COACH_SECTION_PRECEDENCE.indexOf(s);
    expect(i("active tab")).toBeLessThan(i("Registry permissions"));
    expect(i("Registry permissions")).toBeLessThan(i("fill every empty field"));
    expect(COACH_SECTION_PRECEDENCE).toMatch(/never as permission to change unrelated fields/);
  });
});

describe("permissions unchanged", () => {
  it("Free price still not writable; Core name still writable", () => {
    expect(offerAiPermission("free", "offer_stack.pricing.core_price", "offer").write).toBe(false);
    expect(offerAiPermission("core", "offer_stack.angle.main_offer_name").write).toBe(true);
  });
});
