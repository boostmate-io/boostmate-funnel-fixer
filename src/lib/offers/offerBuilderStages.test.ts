import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  toStrengthen, applyStrengthenDecisions, strengthenComplete, strengthenFacts, toPackage, applyPackageEdits, toFinal,
  staleStages, conflictingEdits, changedPaths, fingerprint, writeLabel,
} from "@shared/offerIntelligence/builderStages";
import { canEnterStage, stageState, toDiagnosis } from "@shared/offerIntelligence/builderSession";
import { categoryWritableFields } from "@shared/offerIntelligence/designMapping";
import { buildOperationInstructions, validateOperationOutput, SCORING_RULES } from "@shared/offerIntelligence/operations";
import { VALUE_CRITERIA, VALUE_RUBRIC_VERSION, scoreValueProfile } from "@shared/offerIntelligence/valueEquation";
import { buildBuilderChatSystem, buildBuilderChatContext, BUILDER_CHAT_RULES } from "@shared/offerIntelligence/builderChat";
import { OFFER_TIERS } from "@shared/blueprintRegistry";

const all = (v: "strong" | "partial" | "weak" | "unknown") => VALUE_CRITERIA.map((c) => ({ criterionId: c.id, verdict: v, reasoning: "r" }));
const diag = toDiagnosis({ assessments: all("partial"), strengths: [], weaknesses: ["vague outcome"], topImprovements: ["x"] }, 3);
const aiItems = { items: [
  { weakness: "Vague outcome", dimension: "dream_outcome", whyItMatters: "buyers can't picture it", options: [{ title: "Quantify", change: "Promise 10 clients in 90 days", why: "specific", tradeoff: "needs proof" }, { title: "Narrow", change: "Focus on one niche", why: "relevance", tradeoff: "smaller market" }] },
  { weakness: "No first win", dimension: "speed_to_value", whyItMatters: "drop-off", options: [{ title: "Quick start", change: "Day-1 audit", why: "fast", tradeoff: "delivery load" }] },
] };

/** First plain (non-enum, non-pricing) field + first list with a free-text key for a tier. */
const sample = (tier: any) => {
  const fs = categoryWritableFields(tier);
  const field = fs.find((f) => f.kind === "field" && !f.values && !f.path.includes("pricing"))!;
  const list = fs.find((f) => f.kind === "list" && !f.path.includes("pricing"));
  return { field, list };
};

describe("Stage C — Strengthen", () => {
  it("bounds items/options, assigns ids, records the diagnosis it is based on", () => {
    const st = toStrengthen(aiItems, diag);
    expect(st.items.map((i) => i.id)).toEqual(["s0", "s1"]);
    expect(st.items[0].options).toHaveLength(2);
    expect(st.basedOnDiagnosisAt).toBe(diag.assessedAt);
    expect(strengthenComplete(st)).toBe(false);
  });
  it("select / edit / custom / reject decisions; unknown ids rejected", () => {
    const st = toStrengthen(aiItems, diag);
    const r = applyStrengthenDecisions(st, { s0: { kind: "option", optionId: "s0o1", text: "Focus on dentists" }, s1: { kind: "custom", text: "My own: onboarding call" } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.items[0].decision).toEqual({ kind: "option", optionId: "s0o1", text: "Focus on dentists" });
    expect(strengthenComplete(r.state)).toBe(true);
    expect(strengthenFacts(r.state)["decision: No first win"]).toContain("My own");
    expect(applyStrengthenDecisions(st, { s9: { kind: "rejected" } })).toEqual({ ok: false, error: "unknown_item" });
    expect(applyStrengthenDecisions(st, { s0: { kind: "option", optionId: "nope" } })).toEqual({ ok: false, error: "unknown_option" });
    expect(applyStrengthenDecisions(st, { s0: { kind: "custom", text: "  " } })).toEqual({ ok: false, error: "empty_custom" });
    const rej = applyStrengthenDecisions(st, { s0: { kind: "rejected" } });
    expect(rej.ok && strengthenFacts(rej.state)["decision: Vague outcome"]).toContain("REJECTED");
  });
  it("regeneration keeps own alternatives and rejections, never silently drops them", () => {
    const st = toStrengthen(aiItems, diag);
    const r = applyStrengthenDecisions(st, { s0: { kind: "custom", text: "mine" }, s1: { kind: "option", optionId: "s1o0" } });
    const again = toStrengthen(aiItems, diag, r.ok ? r.state : null);
    expect(again.items[0].decision).toEqual({ kind: "custom", text: "mine" });
    expect(again.items[1].decision).toBeNull(); // option ids may change → re-choose
  });
  it("strengthen output validation rejects invalid shapes", () => {
    expect(validateOperationOutput("strengthen", { options: [] }).ok).toBe(false);
    expect(validateOperationOutput("strengthen", { items: [{ weakness: "x", options: [] }] }).ok).toBe(false);
    expect(validateOperationOutput("strengthen", aiItems).ok).toBe(true);
  });
});

describe("Stage D — Package (all six categories)", () => {
  for (const tier of OFFER_TIERS) {
    it(`${tier}: generates a registry-valid draft and supports edits/exclusion`, () => {
      const { field, list } = sample(tier);
      const writes = [{ path: field.path, value: "Clear Path Program" }, ...(list ? [{ path: `${list.path}.new_1.${list.itemKeys![0]}`, value: "Item A" }] : [])];
      const pk = toPackage(tier as any, null, { writes, extras: {} }, "t");
      expect(pk.ok).toBe(true);
      if (!pk.ok) return;
      expect(pk.state.writes[0].label).toBe(field.label);
      const edited = applyPackageEdits(tier as any, pk.state, [{ id: "w0", value: "Renamed" }]);
      expect(edited.ok && edited.state.writes[0].edited).toBe(true);
      const all = applyPackageEdits(tier as any, pk.state, pk.state.writes.map((w) => ({ id: w.id, include: false })));
      expect(all).toMatchObject({ ok: false, error: "nothing_included" });
    });
  }
  it("rejects fields outside the category and a price on Free", () => {
    expect(toPackage("free", null, { writes: [{ path: "offer_stack.pricing.core_price", value: "99" }], extras: {} }, "t").ok).toBe(false);
    expect(toPackage("core", null, { writes: [{ path: "offer_stack.nonsense.field", value: "x" }], extras: {} }, "t").ok).toBe(false);
  });
  it("existing offers: hidden fields and list item IDs are preserved in the draft", () => {
    const { field, list } = sample("core");
    const base = { angle: {}, stack: {}, pricing: {}, hidden_editor_only: { keep: "me" } } as any;
    if (list) {
      const segs = list.path.split(".").slice(1); let o = base;
      for (const k of segs.slice(0, -1)) o = (o[k] ??= {});
      o[segs[segs.length - 1]] = [{ id: "keep-id", [list.itemKeys![0]]: "Existing" }];
    }
    const writes = [{ path: field.path, value: "New name" }, ...(list ? [{ path: `${list.path}.new_1.${list.itemKeys![0]}`, value: "Added" }] : [])];
    const pk = toPackage("core", base, { writes, extras: {} }, "t");
    expect(pk.ok).toBe(true);
    if (!pk.ok) return;
    expect(pk.draft.hidden_editor_only).toEqual({ keep: "me" });
    if (list) {
      let arr: any = pk.draft; for (const k of list.path.split(".").slice(1)) arr = arr[k];
      expect(arr[0].id).toBe("keep-id");
      expect(arr).toHaveLength(2);
      expect(arr[1].id).toBeTruthy();
    }
  });
  it("invalid AI package output is rejected", () => {
    expect(validateOperationOutput("package", { writes: "x" }).ok).toBe(false);
  });
});

describe("Stage E — final assessment, staleness and gating", () => {
  it("final output needs every list; code scores the profile (no forced improvement)", () => {
    expect(validateOperationOutput("final_assessment", { assessments: all("weak"), keyDecisions: [], nextSteps: [] }).ok).toBe(false);
    const raw = { assessments: all("weak"), scoreChanges: "Proof still missing", keyDecisions: ["a"], remainingAssumptions: ["b"], nextSteps: ["c"] };
    const v = validateOperationOutput("final_assessment", raw);
    expect(v.ok).toBe(true);
    const pk = toPackage("core", null, { writes: [{ path: sample("core").field.path, value: "N" }], extras: {} }, "t");
    if (!pk.ok || !v.ok) throw new Error();
    const fin = toFinal(v.value, pk.state);
    expect(fin.profile.dimensions.dream_outcome.score).toBe(0); // lower than diagnosis is allowed
    expect(fin.basedOnPackageAt).toBe(pk.state.updatedAt);
  });
  it("earlier changes mark later stages for reassessment", () => {
    const st = toStrengthen(aiItems, diag);
    expect(staleStages(diag, { strengthen: st }).strengthen).toBe(false);
    const newer = { ...diag, assessedAt: "2099-01-01" };
    expect(staleStages(newer, { strengthen: st }).strengthen).toBe(true);
    const pk = toPackage("core", null, { writes: [{ path: sample("core").field.path, value: "N" }], extras: {} }, st.updatedAt);
    if (!pk.ok) throw new Error();
    expect(staleStages(diag, { strengthen: st, package: pk.state }).package).toBe(false);
    expect(staleStages(diag, { strengthen: { ...st, updatedAt: "later" }, package: pk.state }).package).toBe(true);
  });
  it("stage gating C→D→E", () => {
    const st = toStrengthen(aiItems, diag);
    const s: any = { stage: "strengthen", status: "active", understanding: null, context_confirmed_at: "t", diagnosis: diag, decisions: { strengthen: st } };
    expect(canEnterStage(s, "strengthen")).toBe(true);
    expect(canEnterStage(s, "package")).toBe(false);
    const r = applyStrengthenDecisions(st, { s0: { kind: "rejected" }, s1: { kind: "rejected" } });
    s.decisions.strengthen = r.ok ? r.state : st;
    expect(canEnterStage(s, "package")).toBe(true);
    expect(canEnterStage(s, "final")).toBe(false);
    expect(stageState({ ...s, status: "completed" }, "final")).toBe("completed");
    expect(canEnterStage({ ...s, status: "completed" }, "package")).toBe(false);
  });
});

describe("Approval helpers — concurrent edits", () => {
  it("only overlapping newer edits are conflicts", () => {
    const base = { angle: { main_offer_name: "A", short_description: "x" }, stack: {} };
    const cur = { angle: { main_offer_name: "A", short_description: "edited later" }, stack: {} };
    const w = (path: string) => ({ id: "w", path, label: "", value: "v", include: true, edited: false });
    expect(changedPaths(base, cur)).toEqual(["offer_stack.angle.short_description"]);
    expect(conflictingEdits(base, cur, [w("offer_stack.angle.main_offer_name")])).toEqual([]);
    expect(conflictingEdits(base, cur, [w("offer_stack.angle.short_description")])).toEqual(["offer_stack.angle.short_description"]);
    expect(conflictingEdits(base, cur, [{ ...w("offer_stack.angle.short_description"), include: false }])).toEqual([]);
  });
  it("fingerprint is key-order independent", () => {
    expect(fingerprint({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(fingerprint({ b: [1, { d: 3, c: 2 }], a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });
  it("list write labels are readable", () => {
    const { list } = sample("core");
    if (list) expect(writeLabel("core", `${list.path}.new_2.${list.itemKeys![0]}`)).toContain("#2");
  });
});

describe("Scoring discipline (rubric v2)", () => {
  it("version incremented and strict rules applied to every assessing operation", () => {
    expect(VALUE_RUBRIC_VERSION).toBe(2);
    expect(scoreValueProfile(all("strong")).rubricVersion).toBe(2);
    for (const op of ["diagnose", "final_assessment"] as const) expect(buildOperationInstructions(op, { source: "workspace", tier: "core" })).toContain(SCORING_RULES);
    expect(SCORING_RULES).toMatch(/Missing proof is never verified proof/);
    expect(SCORING_RULES).toMatch(/proposed delivery mechanisms/);
    expect(SCORING_RULES).toMatch(/unknown/);
  });
  it("scoring stays deterministic for identical verdicts", () => {
    expect(scoreValueProfile(all("partial"))).toEqual(scoreValueProfile(all("partial")));
  });
});

describe("Builder chat isolation", () => {
  it("advisory-only prompt reusing Coach methodology and category brief", () => {
    const sys = buildBuilderChatSystem("premium");
    expect(sys).toContain(BUILDER_CHAT_RULES);
    expect(sys).toMatch(/Coaching methodology/);
    expect(sys).toMatch(/cannot change decisions/);
  });
  it("context includes stage, decisions, outstanding items and draft", () => {
    const st = toStrengthen(aiItems, diag);
    const ctx = buildBuilderChatContext({ session: { stage: "strengthen", mode: "new", diagnosis: diag, decisions: { strengthen: st }, draft_design: { angle: { main_offer_name: "Draft X" } } }, tier: "core", design: null, blueprint: null, ecosystem: null });
    expect(ctx).toContain("Current stage: strengthen");
    expect(ctx).toContain("Outstanding decisions: Vague outcome | No first win");
    expect(ctx).toContain("Draft X");
  });
  it("server: chat uses its own table and never writes sessions or offers", () => {
    const src = readFileSync("supabase/functions/offer-builder/index.ts", "utf8");
    const chat = src.slice(src.indexOf('if (body.action === "chat")'), src.indexOf("const version = Number"));
    expect(chat).toContain("offer_builder_messages");
    expect(chat).not.toMatch(/save\(|from\("offers"\)\.(update|insert)|offer_builder_sessions"\)\.update|ai_coach/);
    expect(src).not.toMatch(/from\("offers"\)\.(update|insert|upsert)/);
  });
  it("server: start resumes unless force_new; approval is version-locked and completes the session", () => {
    const src = readFileSync("supabase/functions/offer-builder/index.ts", "utf8");
    expect(src).toMatch(/force_new/);
    expect(src).toMatch(/approval_begin/);
    expect(src).toMatch(/status: "completed", completed_at/);
    expect(src).toMatch(/\.eq\("version", s\.version\)/);
  });
});

// ---- client approval (mocked data access) --------------------------------------
const repo = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), savePrimary: vi.fn(), rows: {} as Record<string, any>, bp: null as any, byMarker: null as any, invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => {
  const q = (table: string) => {
    const filters: Record<string, any> = {};
    const api: any = {
      select: () => api, order: () => api, limit: () => api, in: () => api,
      eq: (k: string, v: any) => { filters[k] = v; return api; },
      maybeSingle: async () => {
        if (table === "offers" && filters["data->>builder_session_id"]) return { data: repo.byMarker };
        if (table === "offers" && filters.id) return { data: repo.rows[filters.id] ?? null };
        if (table === "offers") return { data: null };
        if (table === "business_blueprints") return { data: repo.bp };
        return { data: null };
      },
    };
    return api;
  };
  return { supabase: { from: q, functions: { invoke: (...a: any[]) => repo.invoke(...a) } } };
});
vi.mock("./offerRepository", async (orig) => {
  const real: any = await orig();
  return { ...real, insertEcosystemOffer: (...a: any[]) => repo.insert(...a), updateEcosystemOffer: (...a: any[]) => repo.update(...a), saveOfferDesign: (...a: any[]) => repo.savePrimary(...a) };
});

describe("approveBuilderSession", () => {
  const nameField = sample("core").field.path;
  const mkSession = (over: any = {}) => {
    const pk = toPackage("core", over.baseDesign ?? null, { writes: [{ path: nameField, value: "Approved Name" }], extras: {} }, "t");
    if (!pk.ok) throw new Error("pk");
    return { id: "11111111-1111-1111-1111-111111111111", sub_account_id: "sub", user_id: "u", tier: "core", mode: "new", status: "active", version: 5, offer_id: null,
      decisions: { package: pk.state, final: { profile: scoreValueProfile([]) } }, draft_design: pk.draft, ...over } as any;
  };
  beforeEach(() => {
    repo.insert.mockReset(); repo.update.mockReset(); repo.savePrimary.mockReset(); repo.invoke.mockReset();
    repo.rows = {}; repo.bp = { id: "bp1", offer_stack: {} }; repo.byMarker = null;
    repo.invoke.mockImplementation(async (_n: string, { body }: any) => ({ data: { session: { ...mkSession(), version: body.version + 1, status: body.action === "approval_complete" ? "completed" : "active" } }, error: null }));
    repo.insert.mockResolvedValue({ row: { id: "new-offer" }, error: null });
    repo.update.mockResolvedValue({ error: null });
    repo.savePrimary.mockResolvedValue({ error: null });
  });
  it("new offer: inserted once as an additional (non-primary) offer with a session marker", async () => {
    const { approveBuilderSession } = await import("./offerBuilder");
    const r = await approveBuilderSession(mkSession(), { userId: "u" });
    expect(r.ok).toBe(true);
    expect(repo.insert).toHaveBeenCalledTimes(1);
    const payload = repo.insert.mock.calls[0][0];
    expect(payload.source).toBe("blueprint_manual");
    expect(payload.data.builder_session_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(repo.savePrimary).not.toHaveBeenCalled();
  });
  it("retry after an interrupted save never creates a duplicate offer", async () => {
    repo.byMarker = { id: "already", name: "x", tier: "core", data: {} };
    const { approveBuilderSession } = await import("./offerBuilder");
    const r = await approveBuilderSession(mkSession(), { userId: "u" });
    expect(r).toMatchObject({ ok: true, offerId: "already" });
    expect(repo.insert).not.toHaveBeenCalled();
  });
  it("existing additional Core: newer overlapping edit blocks unless explicitly applied to latest; other fields preserved", async () => {
    const base = { angle: { main_offer_name: "Old", short_description: "keep" } };
    repo.rows["off1"] = { id: "off1", name: "Old", tier: "core", source: "blueprint_manual", blueprint_id: "bp1", data: { design: { angle: { main_offer_name: "Edited in Offer Design", short_description: "keep" } } } };
    const s = mkSession({ mode: "existing", offer_id: "off1", baseDesign: base });
    const { approveBuilderSession } = await import("./offerBuilder");
    const blocked = await approveBuilderSession(s, { userId: "u" });
    expect(blocked).toMatchObject({ ok: false });
    expect("conflicts" in blocked && blocked.conflicts.length).toBeTruthy();
    expect(repo.update).not.toHaveBeenCalled();
    const ok = await approveBuilderSession(s, { userId: "u", applyToLatest: true });
    expect(ok.ok).toBe(true);
    const saved = repo.update.mock.calls[0][1].data.design;
    expect(saved.angle.short_description).toBe("keep");
  });
  it("Primary Core saves through the Blueprint design, never inserts or replaces the Primary row", async () => {
    repo.rows["prim"] = { id: "prim", name: "P", tier: "core", source: "blueprint_core", blueprint_id: "bp1", data: {} };
    const s = mkSession({ mode: "existing", offer_id: "prim", baseDesign: {} });
    const { approveBuilderSession } = await import("./offerBuilder");
    const r = await approveBuilderSession(s, { userId: "u" });
    expect(r.ok).toBe(true);
    expect(repo.savePrimary).toHaveBeenCalledWith({ kind: "primary", blueprintId: "bp1" }, expect.anything());
    expect(repo.insert).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
  it("a lost approval claim (conflict) writes nothing", async () => {
    repo.invoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({ error: "conflict" }) } } });
    const { approveBuilderSession } = await import("./offerBuilder");
    const r = await approveBuilderSession(mkSession(), { userId: "u" });
    expect(r).toEqual({ ok: false, error: "conflict" });
    expect(repo.insert).not.toHaveBeenCalled();
  });
});
