// =============================================================================
// Builder session rules (pure): stages, transitions, understanding results,
// user corrections and the authenticated operation context.
// =============================================================================

import type { OfferTier } from "../blueprintRegistry.ts";
import { isOfferTier } from "../offerAiPolicy.ts";
import { scoreValueProfile, type CriterionAssessment, type ValueProfile } from "./valueEquation.ts";
import type { OperationContext } from "./operations.ts";

export type BuilderStage = "understand" | "diagnose" | "strengthen" | "package" | "final";
export const BUILDER_STAGES: { id: BuilderStage; label: string; available: boolean }[] = [
  { id: "understand", label: "Understand", available: true },
  { id: "diagnose", label: "Diagnose", available: true },
  { id: "strengthen", label: "Strengthen", available: false },
  { id: "package", label: "Package", available: false },
  { id: "final", label: "Final Offer Blueprint", available: false },
];

export interface UnderstandingItem { id: string; text: string; why?: string; question?: string }
export interface Understanding {
  known: UnderstandingItem[];
  assumed: UnderstandingItem[];
  missing: UnderstandingItem[];
  /** User edits: corrected assumptions and answers to missing items (by item id). */
  corrections: Record<string, string>;
  analysedAt: string;
}

export interface Diagnosis {
  assessments: CriterionAssessment[];
  profile: ValueProfile;
  strengths: string[];
  weaknesses: string[];
  topImprovements: string[];
  assessedAt: string;
  /** Session version the diagnosis was based on. */
  basedOnVersion: number;
}

export interface SessionLike {
  stage: BuilderStage;
  status: string;
  understanding: Understanding | null;
  context_confirmed_at: string | null;
  diagnosis: Diagnosis | null;
}

/** Can the user move to `target`? Unavailable future stages are never reachable. */
export function canEnterStage(s: SessionLike, target: BuilderStage): boolean {
  if (s.status !== "active") return false;
  const def = BUILDER_STAGES.find((x) => x.id === target);
  if (!def?.available) return false;
  if (target === "understand") return true;
  if (target === "diagnose") return !!s.understanding && !!s.context_confirmed_at;
  return false;
}

export function stageState(s: SessionLike, id: BuilderStage): "completed" | "active" | "upcoming" | "unavailable" {
  const def = BUILDER_STAGES.find((x) => x.id === id)!;
  if (!def.available) return "unavailable";
  if (s.stage === id) return "active";
  if (id === "understand" && s.context_confirmed_at) return "completed";
  if (id === "diagnose" && s.diagnosis) return "completed";
  return "upcoming";
}

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** Validated `understand` output → stored understanding (stable ids, bounded). */
export function toUnderstanding(out: { known: string[]; assumed: { item: string; why: string }[]; missing: { item: string; question: string }[] }, previous?: Understanding | null): Understanding {
  return {
    known: out.known.slice(0, 15).map((t, i) => ({ id: `k${i}`, text: clip(t, 300) })).filter((x) => x.text),
    assumed: out.assumed.slice(0, 10).map((a, i) => ({ id: `a${i}`, text: clip(a?.item, 300), why: clip(a?.why, 300) })).filter((x) => x.text),
    missing: out.missing.slice(0, 10).map((m, i) => ({ id: `m${i}`, text: clip(m?.item, 300), question: clip(m?.question, 300) })).filter((x) => x.text),
    // Re-analysis keeps the user's earlier answers (keyed by text, re-attached by id).
    corrections: carryCorrections(previous, out),
    analysedAt: new Date().toISOString(),
  };
}

function carryCorrections(prev: Understanding | null | undefined, out: { assumed: { item: string }[]; missing: { item: string }[] }) {
  if (!prev) return {};
  const byText = new Map<string, string>();
  for (const it of [...prev.assumed, ...prev.missing]) if (prev.corrections[it.id]) byText.set(it.text, prev.corrections[it.id]);
  const res: Record<string, string> = {};
  out.assumed.forEach((a, i) => { const v = byText.get(clip(a?.item, 300)); if (v) res[`a${i}`] = v; });
  out.missing.forEach((m, i) => { const v = byText.get(clip(m?.item, 300)); if (v) res[`m${i}`] = v; });
  return res;
}

/** Sanitise user corrections (only ids that exist, bounded text). */
export function sanitizeCorrections(u: Understanding, raw: unknown): Record<string, string> {
  const ids = new Set([...u.assumed, ...u.missing].map((x) => x.id));
  const out: Record<string, string> = {};
  if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (ids.has(k) && typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 600);
  }
  return out;
}

/** Facts confirmed/added by the user — fed to diagnose as authoritative. */
export function confirmedFacts(u: Understanding | null): Record<string, string> {
  if (!u) return {};
  const f: Record<string, string> = {};
  u.known.forEach((k, i) => (f[`known_${i + 1}`] = k.text));
  u.assumed.forEach((a) => (f[`assumption: ${a.text}`] = u.corrections[a.id] ? `CORRECTED BY USER: ${u.corrections[a.id]}` : "unconfirmed assumption"));
  u.missing.forEach((m) => { if (u.corrections[m.id]) f[`answer: ${m.text}`] = u.corrections[m.id]; else f[`still missing: ${m.text}`] = "unknown"; });
  return f;
}

/** Blueprint fields useful for offer work, never the Primary's offer_stack. */
export function builderBlueprintContext(bp: Record<string, any> | null | undefined) {
  if (!bp) return null;
  const { customer_clarity, brand_strategy, proof_authority, growth_system } = bp;
  return { customer_clarity, brand_strategy, proof_authority, growth_system };
}

export function buildBuilderContext(input: {
  tier: unknown; mode: "new" | "existing"; blueprint: Record<string, any> | null; design: Record<string, any> | null;
  intake: Record<string, unknown>; understanding: Understanding | null; ecosystem: string | null;
}): OperationContext {
  if (!isOfferTier(input.tier)) throw new Error("unknown_tier");
  const idea = clip((input.intake as any)?.idea, 1500);
  return {
    source: "workspace",
    tier: input.tier as OfferTier,
    mode: input.mode,
    blueprint: builderBlueprintContext(input.blueprint),
    design: input.mode === "existing" ? input.design : null,
    facts: { ...(idea ? { offer_idea: idea } : {}), ...confirmedFacts(input.understanding) },
    ecosystem: input.ecosystem,
  };
}

export function toDiagnosis(out: { assessments: CriterionAssessment[]; strengths: string[]; weaknesses: string[]; topImprovements: string[] }, version: number): Diagnosis {
  return {
    assessments: out.assessments,
    profile: scoreValueProfile(out.assessments),
    strengths: out.strengths.slice(0, 6).map((s) => clip(s, 300)),
    weaknesses: out.weaknesses.slice(0, 6).map((s) => clip(s, 300)),
    topImprovements: out.topImprovements.slice(0, 3).map((s) => clip(s, 300)),
    assessedAt: new Date().toISOString(),
    basedOnVersion: version,
  };
}
