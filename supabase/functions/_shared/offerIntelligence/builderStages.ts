// =============================================================================
// Builder Stages C–E (pure): Strengthen decisions, Package drafts (registry-
// validated writes), Final assessment, staleness and approval helpers.
// Used by the `offer-builder` function and by the client approval flow.
// =============================================================================

import type { OfferTier } from "../blueprintRegistry.ts";
import { VALUE_DIMENSIONS, scoreValueProfile, type CriterionAssessment, type ValueDimension, type ValueProfile } from "./valueEquation.ts";
import { categoryWritableFields, mapGeneratedToDesign } from "./designMapping.ts";
import type { Diagnosis } from "./builderSession.ts";

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

// ---- Stage C: Strengthen ---------------------------------------------------

export interface StrengthenOption { id: string; title: string; change: string; why: string; tradeoff: string }
export type StrengthenDecision =
  | { kind: "option"; optionId: string; text: string }
  | { kind: "custom"; text: string }
  | { kind: "rejected" };
export interface StrengthenItem {
  id: string;
  dimension: ValueDimension | null;
  weakness: string;
  whyItMatters: string;
  options: StrengthenOption[];
  decision: StrengthenDecision | null;
}
export interface StrengthenState { items: StrengthenItem[]; generatedAt: string; basedOnDiagnosisAt: string; updatedAt: string }

export function toStrengthen(out: { items: any[] }, diagnosis: Diagnosis, previous?: StrengthenState | null): StrengthenState {
  const now = new Date().toISOString();
  const prevByWeakness = new Map((previous?.items ?? []).map((i) => [i.weakness, i]));
  const items: StrengthenItem[] = (out.items ?? []).slice(0, 5).map((it: any, i: number) => {
    const weakness = clip(it?.weakness, 300);
    const options: StrengthenOption[] = (Array.isArray(it?.options) ? it.options : []).slice(0, 3).map((o: any, j: number) => ({
      id: `s${i}o${j}`, title: clip(o?.title, 160), change: clip(o?.change, 800), why: clip(o?.why, 500), tradeoff: clip(o?.tradeoff, 500),
    })).filter((o: StrengthenOption) => o.title && o.change);
    // Regeneration keeps a user's own alternative / rejection for the same weakness (never silently dropped).
    const prev = prevByWeakness.get(weakness)?.decision ?? null;
    const decision = prev && prev.kind !== "option" ? prev : null;
    return {
      id: `s${i}`, weakness, whyItMatters: clip(it?.whyItMatters, 600), options, decision,
      dimension: (VALUE_DIMENSIONS as string[]).includes(it?.dimension) ? it.dimension : null,
    };
  }).filter((x) => x.weakness && x.options.length);
  return { items, generatedAt: now, basedOnDiagnosisAt: diagnosis.assessedAt, updatedAt: now };
}

/** Validate user decisions (by item id). Unknown items/options are rejected, not repaired. */
export function applyStrengthenDecisions(state: StrengthenState, raw: unknown): { ok: true; state: StrengthenState } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_decisions" };
  const items = state.items.map((i) => ({ ...i }));
  for (const [id, d] of Object.entries(raw as Record<string, any>)) {
    const item = items.find((i) => i.id === id);
    if (!item) return { ok: false, error: "unknown_item" };
    if (d === null) { item.decision = null; continue; }
    if (d?.kind === "rejected") item.decision = { kind: "rejected" };
    else if (d?.kind === "custom") {
      const text = clip(d.text, 1200);
      if (!text) return { ok: false, error: "empty_custom" };
      item.decision = { kind: "custom", text };
    } else if (d?.kind === "option") {
      const opt = item.options.find((o) => o.id === d.optionId);
      if (!opt) return { ok: false, error: "unknown_option" };
      const text = clip(d.text, 1200) || opt.change;
      item.decision = { kind: "option", optionId: opt.id, text };
    } else return { ok: false, error: "invalid_decision" };
  }
  return { ok: true, state: { ...state, items, updatedAt: new Date().toISOString() } };
}

export const strengthenComplete = (s: StrengthenState | null | undefined) => !!s && s.items.length > 0 && s.items.every((i) => !!i.decision);

/** Confirmed strategic decisions, fed to package/final/chat as authoritative. */
export function strengthenFacts(s: StrengthenState | null | undefined): Record<string, string> {
  const f: Record<string, string> = {};
  for (const i of s?.items ?? []) {
    if (!i.decision) continue;
    f[`decision: ${i.weakness}`] = i.decision.kind === "rejected" ? "USER REJECTED changes here — keep as is" : `USER CHOSE: ${i.decision.text}`;
  }
  return f;
}

// ---- Stage D: Package ------------------------------------------------------

export interface PackageWrite { id: string; path: string; label: string; value: string; include: boolean; edited: boolean }
export interface PackageState {
  writes: PackageWrite[];
  extras: Record<string, any>;
  /** Offer design the package was generated against (conflict detection at approval). */
  baseDesign: Record<string, any> | null;
  generatedAt: string;
  basedOnStrengthenAt: string;
  updatedAt: string;
}

export function writeLabel(tier: OfferTier, path: string): string {
  const fields = categoryWritableFields(tier);
  const exact = fields.find((f) => f.path === path);
  if (exact) return exact.label;
  const list = fields.find((f) => f.kind === "list" && path.startsWith(`${f.path}.`));
  if (list) {
    const rest = path.slice(list.path.length + 1).split(".");
    const n = /^new_(\d+)$/.exec(rest[0] ?? "")?.[1];
    return `${list.label}${n ? ` #${n}` : ""} · ${rest.slice(1).join(".")}`;
  }
  return path;
}

/** Validated `package` output → package state + draft (all-or-nothing policy checks). */
export function toPackage(tier: OfferTier, baseDesign: Record<string, any> | null, out: { writes: { path: string; value: unknown }[]; extras: any }, basedOnStrengthenAt: string):
  { ok: true; state: PackageState; draft: Record<string, any> } | { ok: false; errors: unknown[] } {
  const writes = (out.writes ?? []).filter((w) => typeof w?.path === "string" && String(w.value ?? "").trim()).slice(0, 80)
    .map((w, i) => ({ id: `w${i}`, path: w.path, label: writeLabel(tier, w.path), value: clip(w.value, 2000), include: true, edited: false }));
  const draft = draftFromWrites(tier, baseDesign, writes);
  if (draft.ok === false) return { ok: false, errors: draft.errors };
  const now = new Date().toISOString();
  return { ok: true, draft: draft.design, state: { writes, extras: sanitizeExtras(out.extras), baseDesign, generatedAt: now, basedOnStrengthenAt, updatedAt: now } };
}

export function draftFromWrites(tier: OfferTier, baseDesign: Record<string, any> | null, writes: PackageWrite[]) {
  const included = writes.filter((w) => w.include).map((w) => ({ path: w.path, value: w.value }));
  const res = mapGeneratedToDesign(tier, baseDesign ?? {}, included);
  if (res.ok === false) return { ok: false as const, errors: res.errors as unknown[] };
  return { ok: true as const, design: res.design };
}

/** User edits to the generated package: change values or include/exclude items. */
export function applyPackageEdits(tier: OfferTier, state: PackageState, raw: unknown):
  { ok: true; state: PackageState; draft: Record<string, any> } | { ok: false; error: string; errors?: unknown[] } {
  if (!Array.isArray(raw)) return { ok: false, error: "invalid_edits" };
  const writes = state.writes.map((w) => ({ ...w }));
  for (const e of raw) {
    const w = writes.find((x) => x.id === e?.id);
    if (!w) return { ok: false, error: "unknown_write" };
    if (typeof e.include === "boolean") w.include = e.include;
    if (typeof e.value === "string") {
      const v = clip(e.value, 2000);
      if (!v) return { ok: false, error: "empty_value" };
      if (v !== w.value) { w.value = v; w.edited = true; }
    }
  }
  if (!writes.some((w) => w.include)) return { ok: false, error: "nothing_included" };
  const draft = draftFromWrites(tier, state.baseDesign, writes);
  if (draft.ok === false) return { ok: false, error: "invalid_value", errors: draft.errors };
  return { ok: true, draft: draft.design, state: { ...state, writes, updatedAt: new Date().toISOString() } };
}

function sanitizeExtras(x: any) {
  const arr = (v: any, n = 10) => (Array.isArray(v) ? v.slice(0, n) : []);
  return {
    problemObstacleSolutions: arr(x?.problemObstacleSolutions).map((p: any) => ({ problem: clip(p?.problem, 300), obstacle: clip(p?.obstacle, 300), solution: clip(p?.solution, 400) })),
    pricingRationale: x?.pricingRationale ? { reasoning: clip(x.pricingRationale.reasoning, 1000), assumptions: arr(x.pricingRationale.assumptions).map((a: any) => clip(a, 300)), isEstimate: true } : null,
    assumptions: arr(x?.assumptions).map((a: any) => ({ statement: clip(a?.statement, 300), why: clip(a?.why, 300), howToValidate: clip(a?.howToValidate, 300) })),
    audience: x?.audience ? { differsFromBlueprint: !!x.audience.differsFromBlueprint, audience: clip(x.audience.audience, 400), reason: clip(x.audience.reason, 400) } : null,
    positioning: x?.positioning ? { statement: clip(x.positioning.statement, 600), alternatives: arr(x.positioning.alternatives, 5).map((a: any) => clip(a, 200)), isUserVerified: false } : null,
    bonusRationales: arr(x?.bonusRationales).map((b: any) => ({ bonusName: clip(b?.bonusName, 200), reason: clip(b?.reason, 400) })),
  };
}

// ---- Stage E: Final assessment ----------------------------------------------

export interface FinalState {
  assessments: CriterionAssessment[];
  profile: ValueProfile;
  keyDecisions: string[];
  remainingAssumptions: string[];
  nextSteps: string[];
  scoreChanges: string;
  assessedAt: string;
  basedOnPackageAt: string;
}

export function toFinal(out: any, pkg: PackageState): FinalState {
  const list = (v: any, n = 8) => (Array.isArray(v) ? v : []).slice(0, n).map((x: any) => clip(x, 400)).filter(Boolean);
  return {
    assessments: out.assessments,
    profile: scoreValueProfile(out.assessments),
    keyDecisions: list(out.keyDecisions), remainingAssumptions: list(out.remainingAssumptions), nextSteps: list(out.nextSteps),
    scoreChanges: clip(out.scoreChanges, 1500),
    assessedAt: new Date().toISOString(), basedOnPackageAt: pkg.updatedAt,
  };
}

export interface ApprovalState { status: "applying" | "applied"; startedAt: string; expected?: string; offerId?: string }

export interface BuilderDecisions { strengthen?: StrengthenState | null; package?: PackageState | null; final?: FinalState | null; approval?: ApprovalState | null }

/** Which later stages are out of date because an earlier stage changed. */
export function staleStages(diagnosis: Diagnosis | null, d: BuilderDecisions | null | undefined) {
  const st = d?.strengthen, pk = d?.package, fi = d?.final;
  return {
    strengthen: !!st && (!diagnosis || st.basedOnDiagnosisAt !== diagnosis.assessedAt),
    package: !!pk && (!st || pk.basedOnStrengthenAt !== st.updatedAt),
    final: !!fi && (!pk || fi.basedOnPackageAt !== pk.updatedAt),
  };
}

// ---- Approval helpers (client) ---------------------------------------------

export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v as any).sort().map((k) => `${JSON.stringify(k)}:${stableStringify((v as any)[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}
export function fingerprint(v: unknown): string {
  const s = stableStringify(v);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}:${(h >>> 0).toString(36)}`;
}

function leaves(v: any, prefix: string, out: Map<string, string>) {
  if (v && typeof v === "object" && !Array.isArray(v)) { for (const k of Object.keys(v)) leaves(v[k], prefix ? `${prefix}.${k}` : k, out); return; }
  out.set(prefix, stableStringify(v));
}
/** Design paths (offer_stack.<…>, lists as a whole) that differ between two designs. */
export function changedPaths(a: Record<string, any> | null, b: Record<string, any> | null): string[] {
  const ma = new Map<string, string>(), mb = new Map<string, string>();
  leaves(a ?? {}, "offer_stack", ma); leaves(b ?? {}, "offer_stack", mb);
  const keys = new Set([...ma.keys(), ...mb.keys()]);
  return [...keys].filter((k) => (ma.get(k) ?? "null") !== (mb.get(k) ?? "null")).sort();
}
/** Newer Offer Design edits that touch the same fields/lists as the approved writes. */
export function conflictingEdits(baseDesign: Record<string, any> | null, current: Record<string, any> | null, writes: PackageWrite[]): string[] {
  const changed = changedPaths(baseDesign, current);
  const targets = writes.filter((w) => w.include).map((w) => w.path.replace(/\.new_\d+\..*$/, "").replace(/\.[0-9a-f-]{8,}\..*$/i, ""));
  return changed.filter((c) => targets.some((t) => c === t || c.startsWith(`${t}.`) || t.startsWith(`${c}.`)));
}
