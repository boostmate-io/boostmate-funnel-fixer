// =============================================================================
// Public Offer Generator — turns a validated `public_generate` output into a
// stored result (full) and a no-email preview. Pure; reuses scoring and
// Offer Design mapping. Core only for the MVP.
// =============================================================================

import { scoreValueProfile, VALUE_DIMENSIONS, type ValueProfile } from "./valueEquation.ts";
import { mapGeneratedToDesign } from "./designMapping.ts";
import { validateOperationOutput } from "./operations.ts";

export const PUBLIC_RESULT_VERSION = 1;
const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const clipList = (v: unknown, max: number, n = 300) => (Array.isArray(v) ? v.map((x) => clip(x, n)).filter(Boolean).slice(0, max) : []);

export interface PricingEstimate { low: number; high: number; reasoning: string; assumptions: string[]; label: "estimate" }

export interface PublicOfferResult {
  version: number;
  tier: "core";
  design: Record<string, any>;
  offerName: string;
  promise: string;
  audience: string;
  methodSummary: string;
  deliveryApproach: string;
  deliverables: string[];
  assumptions: string[];
  pricing: PricingEstimate | null;
  insights: string[];
  improvements: string[];
  profile: ValueProfile;
  /** Only when the visitor described a current offer. */
  beforeProfile: ValueProfile | null;
  scoreChanges: string;
  nextSteps: string[];
  /** Pricing writes are never stored in the public design (estimates only). */
  droppedWrites: string[];
}

export type BuildResult = { ok: true; result: PublicOfferResult } | { ok: false; reason: string; detail?: unknown };

/** Conservative pricing: only when recommended, positive, sane, with reasoning. */
function pricingFrom(p: any): PricingEstimate | null {
  if (!p || p.recommend !== true) return null;
  const low = Number(p.low), high = Number(p.high);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high < low || high > 1_000_000) return null;
  const reasoning = clip(p.reasoning, 600);
  if (!reasoning) return null;
  return { low: Math.round(low), high: Math.round(high), reasoning, assumptions: clipList(p.assumptions, 5), label: "estimate" };
}

export function buildPublicResult(raw: unknown, opts: { hasCurrentOffer: boolean }): BuildResult {
  const checked = validateOperationOutput("public_generate", raw);
  if (!checked.ok) return { ok: false, reason: "invalid_output", detail: (checked as any).errors };
  const out = checked.value;
  const writes = (out.writes as any[]).map((w) => ({ path: String(w.path), value: w.value }));
  const droppedWrites = writes.filter((w) => w.path.startsWith("offer_stack.pricing")).map((w) => w.path);
  const designWrites = writes.filter((w) => !w.path.startsWith("offer_stack.pricing"));
  const mapped = mapGeneratedToDesign("core", {}, designWrites);
  if (!mapped.ok) return { ok: false, reason: "invalid_design", detail: (mapped as any).errors };
  const d = mapped.design;
  const offerName = clip(d.angle?.main_offer_name, 120);
  const promise = clip(d.angle?.core_outcome || d.angle?.short_description, 400);
  if (!offerName || !promise) return { ok: false, reason: "incomplete_offer" };
  const profile = scoreValueProfile(out.assessments);
  const beforeProfile = opts.hasCurrentOffer && Array.isArray(out.beforeAssessments) && out.beforeAssessments.length
    ? scoreValueProfile(out.beforeAssessments) : null;
  return {
    ok: true,
    result: {
      version: PUBLIC_RESULT_VERSION, tier: "core", design: d, offerName, promise,
      audience: clip(out.audience, 400), methodSummary: clip(out.methodSummary, 600), deliveryApproach: clip(out.deliveryApproach, 400),
      deliverables: (d.stack?.deliverables ?? []).map((x: any) => clip(x?.name, 120)).filter(Boolean).slice(0, 8),
      assumptions: clipList(out.assumptions, 6), pricing: pricingFrom(out.pricing),
      insights: clipList(out.insights, 2), improvements: clipList(out.improvements ?? out.topImprovements, 3),
      scoreChanges: clip(out.scoreChanges, 1200), nextSteps: clipList(out.nextSteps, 4),
      profile, beforeProfile, droppedWrites,
    },
  };
}

/** Preview: no email needed; scores without per-criterion reasoning. */
export function toPublicPreview(r: PublicOfferResult) {
  const strip = (p: ValueProfile | null) => p && ({
    ...p,
    dimensions: Object.fromEntries(VALUE_DIMENSIONS.map((k) => [k, { ...p.dimensions[k], strengths: [], weaknesses: [], unknown: [] }])) as ValueProfile["dimensions"],
  });
  return {
    offerName: r.offerName, promise: r.promise, methodSummary: r.methodSummary,
    profile: strip(r.profile), beforeProfile: strip(r.beforeProfile), insights: r.insights.slice(0, 2),
  };
}

// ---- Abuse protection (pure decisions; the function supplies counts) --------

export interface RateLimits { perIpHour: number; perIpDay: number; globalDay: number }
export const DEFAULT_RATE_LIMITS: RateLimits = { perIpHour: 3, perIpDay: 8, globalDay: 200 };

export function decideRateLimit(counts: { ipHour: number; ipDay: number; globalDay: number }, limits: RateLimits = DEFAULT_RATE_LIMITS):
  { ok: true } | { ok: false; reason: "ip_hourly" | "ip_daily" | "global_daily" } {
  if (counts.globalDay >= limits.globalDay) return { ok: false, reason: "global_daily" };
  if (counts.ipDay >= limits.perIpDay) return { ok: false, reason: "ip_daily" };
  if (counts.ipHour >= limits.perIpHour) return { ok: false, reason: "ip_hourly" };
  return { ok: true };
}

/** Simple bot checks: hidden honeypot must be empty; form must take ≥ 4s. */
export function looksLikeBot(b: { website?: unknown; elapsedMs?: unknown }): boolean {
  if (b.website != null && String(b.website).trim() !== "") return true;
  const ms = Number(b.elapsedMs);
  return !Number.isFinite(ms) || ms < 4000;
}

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
export const CONSENT_TEXT_VERSION = "offer-generator-v1";

/** Summary row values for the claimed Core Offer (mirrors offerSummary). */
export function claimedOfferRow(r: PublicOfferResult, generationId: string) {
  return {
    name: r.offerName || "Generated Core Offer",
    data: {
      description: clip(r.design.angle?.short_description, 1000),
      core_outcome: clip(r.design.angle?.core_outcome, 1000),
      price: "",
      delivery_types: [],
      design: r.design,
      offer_generator: { generation_id: generationId, version: r.version },
    },
  };
}
