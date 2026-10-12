// =============================================================================
// Public Mini Offer Builder — pure helpers for the staged public flow
// (Discover → Diagnose → Strengthen → Improved Offer) and the Free Video
// Audit request. Reuses the shared diagnose/strengthen/public_generate
// operations and scoring; no network, no workspace access.
// =============================================================================

import { validateOperationOutput } from "./operations.ts";
import { scoreValueProfile, DIMENSION_LABELS, VALUE_DIMENSIONS, VALUE_CRITERIA, humanizeCriterionCodes as hc, type CriterionAssessment, type CriterionVerdict, type ValueDimension, type ValueProfile } from "./valueEquation.ts";
import type { PublicOfferResult, DimensionChange } from "./publicResult.ts";
import { EMAIL_RE } from "./publicResult.ts";

const clip = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const clipList = (v: unknown, max: number, n = 300) => (Array.isArray(v) ? v.map((x) => clip(x, n)).filter(Boolean).slice(0, max) : []);

/** Evidence calibration shared by the public Before and After assessments (same standard both times). */
export const PUBLIC_SCORING_NOTE = `# Evidence calibration (public)
Separate confirmed facts the visitor stated, planned or proposed mechanisms, assumptions, and missing information. Only confirmed facts with concrete specifics earn "strong".
- A whole dimension rated strong (10/10) is exceptional; most offers described in a few sentences are partial on several criteria.
- pl_proof: strong only when the visitor explicitly states results, testimonials, case studies or credentials; partial when they state relevant experience without results; otherwise weak (if results are implied) or unknown. Never infer proof from a polished description.
- pl_risk: strong only for a guarantee or risk reversal the visitor confirmed; a suggested or planned guarantee is at most partial.
- pl_fit and pl_method: "personalized" or "1:1" alone is partial, not strong; strong needs a named, specific mechanism that answers why past attempts failed.
- sv_timeline / sv_first_win: a program length is not the time to first meaningful progress; without a stated early win, sv_first_win is unknown or partial.
- A stated desired transformation is not automatically strong on dream outcome: strong needs a specific, believable, measurable result for a specific audience.
- Use unknown when the information is genuinely absent; never treat unknown as strength or as weakness.`;

export const PUBLIC_DIAGNOSE_INSTRUCTION = `Audience: a coach or consultant without marketing training. Assess ONLY what the visitor actually described — for an existing offer, what is sold today; for an idea, the proposed concept as described (provisional). Never imagine an optimized version or credit improvements before they are chosen. Write every reason, strength, weakness and improvement in plain, encouraging English — one short sentence each, specific to THIS offer (never generic advice that fits any coach), no jargon and never criterion codes. Give 2–3 strengths, 2–3 weaknesses and exactly 3 top improvements, highest impact first.\n\n${PUBLIC_SCORING_NOTE}`;
export const PUBLIC_FINAL_INSTRUCTION = `Use exactly the same evidence standard as the diagnosis provided in the answers.\n\n${PUBLIC_SCORING_NOTE}`;
export const PUBLIC_STRENGTHEN_INSTRUCTION = "Plain English for a non-marketer: weakness as a short friendly title (max 7 words, e.g. \"Make your offer more believable\"), whyItMatters in 1–2 sentences from the buyer's view, option title max 7 words, change in 1–2 sentences, why in one sentence, tradeoff in one sentence. Never use criterion codes.";

export interface PublicDiagnosis {
  assessments: CriterionAssessment[];
  profile: ValueProfile;
  strengths: string[];
  weaknesses: string[];
  topImprovements: string[];
}

export function buildDiagnosis(raw: unknown): { ok: true; value: PublicDiagnosis } | { ok: false; errors: string[] } {
  const c = validateOperationOutput("diagnose", raw);
  if (!c.ok) return { ok: false, errors: (c as any).errors };
  const v = c.value;
  return {
    ok: true,
    value: {
      assessments: (v.assessments as CriterionAssessment[]).map((a) => ({ ...a, reasoning: hc(a.reasoning) })), profile: scoreValueProfile(v.assessments.map((a: CriterionAssessment) => ({ ...a, reasoning: hc(a.reasoning) }))),
      strengths: clipList(v.strengths, 3).map(hc), weaknesses: clipList(v.weaknesses, 3).map(hc), topImprovements: clipList(v.topImprovements, 3).map(hc),
    },
  };
}

export type OptionKind = "apply_now" | "future_action";
export interface PublicOption { id: "a" | "b"; title: string; change: string; why: string; tradeoff: string; kind: OptionKind }
export interface PublicImprovement { id: string; weakness: string; dimension: ValueDimension; whyItMatters: string; options: PublicOption[] }

export function buildStrengthen(raw: unknown): { ok: true; value: PublicImprovement[] } | { ok: false; errors: string[] } {
  const c = validateOperationOutput("public_strengthen", raw);
  if (!c.ok) return { ok: false, errors: (c as any).errors };
  const items: PublicImprovement[] = [];
  for (const it of c.value.items as any[]) {
    const opts = (it.options as any[]).filter((o) => clip(o.title, 1) && clip(o.change, 1)).slice(0, 2);
    if (opts.length < 2 || !VALUE_DIMENSIONS.includes(it.dimension)) continue;
    items.push({
      id: `i${items.length}`, weakness: hc(clip(it.weakness, 120)), dimension: it.dimension, whyItMatters: hc(clip(it.whyItMatters, 500)),
      options: opts.map((o, i) => ({ id: (i === 0 ? "a" : "b") as "a" | "b", title: hc(clip(o.title, 120)), change: hc(clip(o.change, 600)), why: hc(clip(o.why, 400)), tradeoff: hc(clip(o.tradeoff, 400)), kind: (o.kind === "future_action" ? "future_action" : "apply_now") as OptionKind })),
    });
    if (items.length === 3) break;
  }
  return items.length ? { ok: true, value: items } : { ok: false, errors: ["no_usable_items"] };
}

export interface PublicChoice { itemId: string; choice: "a" | "b" | "keep"; custom?: string }

/** Every improvement needs exactly one decision; custom text only refines an option. */
export function validateChoices(raw: unknown, items: PublicImprovement[]): { ok: true; value: PublicChoice[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length !== items.length) return { ok: false, error: "choices_incomplete" };
  const out: PublicChoice[] = [];
  for (const it of items) {
    const c = raw.find((x: any) => x?.itemId === it.id);
    if (!c || !["a", "b", "keep"].includes(c.choice)) return { ok: false, error: "choices_incomplete" };
    const custom = c.choice !== "keep" && c.custom != null ? clip(c.custom, 600) : "";
    out.push({ itemId: it.id, choice: c.choice, ...(custom ? { custom } : {}) });
  }
  return { ok: true, value: out };
}

/** Facts passed to public_generate: diagnosis summary + the visitor's decisions. */
export function finalizeFacts(d: PublicDiagnosis, items: PublicImprovement[], choices: PublicChoice[]): Record<string, string> {
  const diag = VALUE_DIMENSIONS.map((k) => `${DIMENSION_LABELS[k]}: ${d.profile.dimensions[k].score ?? "not assessed"}`).join("; ");
  const decisions = items.map((it) => {
    const c = choices.find((x) => x.itemId === it.id)!;
    if (c.choice === "keep") return `- ${it.weakness}: keep current approach`;
    const o = it.options.find((x) => x.id === c.choice)!;
    const tag = o.kind === "future_action" ? "FUTURE ACTION (not in place yet)" : "APPLY NOW";
    return `- [${tag}${c.custom ? ", adjusted by the visitor" : ""}] ${it.weakness}: ${o.title} — ${c.custom || o.change}`;
  }).join("\n");
  return {
    diagnosis: `Before scores (0–10): ${diag}. Before verdicts: ${d.assessments.map((a) => `${a.criterionId}=${a.verdict}`).join(", ")}. Weaknesses: ${d.weaknesses.join(" | ")}`,
    selectedImprovements: decisions,
  };
}

// ---- Before/After consistency (deterministic) ------------------------------

const RANK: Record<CriterionVerdict, number> = { unknown: -1, weak: 0, partial: 1, strong: 2 };
const BY_RANK: CriterionVerdict[] = ["weak", "partial", "strong"];
const dimOf = (id: string) => VALUE_CRITERIA.find((c) => c.id === id)?.dimension;

/**
 * Keep the After assessment consistent with what the flow can actually change:
 * - no new proof is supplied in the public flow → proof never rises;
 * - planned changes count at most "partial" for perceived likelihood and at most one step elsewhere;
 * - a criterion only drops when the model explains a decrease for that dimension.
 * Re-scores the profile, syncs directions with the real deltas and lists future actions.
 */
export function reconcileFinal(result: PublicOfferResult, d: PublicDiagnosis, items: PublicImprovement[], choices: PublicChoice[]): PublicOfferResult {
  const before = new Map(d.assessments.map((a) => [a.criterionId, a]));
  const claimedDown = new Set(result.dimensionChanges.filter((c) => c.direction === "down").map((c) => c.dimension));
  const touched = new Set<ValueDimension>();
  const after = new Map(result.assessments.map((a) => [a.criterionId, a]));
  const out: CriterionAssessment[] = [];
  for (const crit of VALUE_CRITERIA) {
    const b = before.get(crit.id)?.verdict ?? "unknown";
    const orig = after.get(crit.id) ?? { criterionId: crit.id, verdict: "unknown" as CriterionVerdict, reasoning: "" };
    let v = orig.verdict;
    if (RANK[v] > RANK[b]) {
      let cap = Math.min(2, Math.max(RANK[b], 0) + 1);
      if (crit.id === "pl_proof") cap = RANK[b];
      else if (crit.dimension === "perceived_likelihood") cap = Math.min(cap, Math.max(RANK[b], 1));
      if (RANK[v] > cap) v = cap < 0 ? "unknown" : BY_RANK[cap];
    } else if (RANK[v] < RANK[b] && !claimedDown.has(crit.dimension)) v = b;
    if (v !== orig.verdict) touched.add(crit.dimension);
    out.push({ criterionId: crit.id, verdict: v, reasoning: hc(v === orig.verdict ? orig.reasoning : (before.get(crit.id)?.reasoning ?? orig.reasoning)) });
  }
  const profile = scoreValueProfile(out);
  const dimensionChanges: DimensionChange[] = result.dimensionChanges.map((c) => {
    const bs = d.profile.dimensions[c.dimension].score, as = profile.dimensions[c.dimension].score;
    const direction = bs == null || as == null ? c.direction : as > bs ? "up" : as < bs ? "down" : "same";
    return { ...c, direction, adjusted: touched.has(c.dimension) || direction !== c.direction };
  });
  const future = new Set(result.futureActions);
  for (const it of items) {
    const ch = choices.find((x) => x.itemId === it.id);
    const o = it.options.find((x) => x.id === ch?.choice);
    if (o?.kind === "future_action" && ![...future].some((f) => f.toLowerCase().includes(o.title.toLowerCase().slice(0, 20)))) future.add(ch?.custom ? `${o.title}: ${ch.custom}` : `${o.title}: ${o.change}`);
  }
  return { ...result, assessments: out, profile, beforeProfile: d.profile, dimensionChanges, futureActions: [...future].slice(0, 6) };
}

/** Decisions as shown to the visitor (provenance preserved). */
export function describeDecisions(items: PublicImprovement[], choices: PublicChoice[]) {
  return items.map((it) => {
    const c = choices.find((x) => x.itemId === it.id);
    const o = it.options.find((x) => x.id === c?.choice);
    return {
      area: it.weakness, dimension: it.dimension,
      status: !c ? "undecided" : c.choice === "keep" ? "kept" : o?.kind === "future_action" ? "future" : "applied",
      title: o?.title ?? null, detail: c?.custom || o?.change || null, adjusted: !!c?.custom,
    };
  });
}

// ---- Free Video Audit request ---------------------------------------------

export const AUDIT_CHANNELS = ["instagram_organic", "paid_ads", "referrals", "combination", "no_system", "other"] as const;
export type AuditChannel = typeof AUDIT_CHANNELS[number];
export const AUDIT_CONSENT_TEXT_VERSION = "video-audit-v1";
export const AUDIT_CHANNEL_LABELS: Record<AuditChannel, string> = {
  instagram_organic: "Instagram / organic content", paid_ads: "Paid advertising", referrals: "Referrals / networking",
  combination: "A combination of channels", no_system: "No consistent system yet", other: "Other",
};
export function scoresLine(snap: ReturnType<typeof auditSnapshot> | null): string {
  if (!snap?.beforeScores) return "";
  return VALUE_DIMENSIONS.map((k) => `${DIMENSION_LABELS[k]} ${snap.beforeScores?.[k] ?? "–"} → ${snap.afterScores?.[k] ?? "–"}`).join(" · ");
}

/** "@name", "name" or an instagram.com profile URL → "name". */
export function normalizeInstagram(v: unknown): string | null {
  let s = String(v ?? "").trim();
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)\/?(?:[?#].*)?$/i);
  if (m) s = m[1];
  s = s.replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s.toLowerCase() : null;
}

export function normalizeWebsite(v: unknown): string | null | false {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || s.length > 300) return false;
    return u.toString();
  } catch { return false; }
}

export interface AuditRequestInput { email: string; instagram: string; channel: AuditChannel; website: string | null; marketingConsent: boolean }

export function validateAuditRequest(raw: any): { ok: true; value: AuditRequestInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const email = String(raw?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "invalid_email";
  const instagram = normalizeInstagram(raw?.instagram);
  if (!instagram) errors.instagram = "invalid_instagram";
  const channel = raw?.channel;
  if (!AUDIT_CHANNELS.includes(channel)) errors.channel = "invalid_channel";
  const website = normalizeWebsite(raw?.website);
  if (website === false) errors.website = "invalid_website";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { email, instagram: instagram!, channel, website: website || null, marketingConsent: raw?.marketingConsent === true } };
}

/** Compact, admin-readable copy of the visitor's offer work. */
export function auditSnapshot(gen: { input?: any; diagnosis?: any; strengthen?: any; choices?: any; result?: any }) {
  const r = gen.result ?? null;
  return {
    answers: gen.input ?? null,
    beforeScores: gen.diagnosis?.profile ? Object.fromEntries(VALUE_DIMENSIONS.map((k) => [k, gen.diagnosis.profile.dimensions[k]?.score ?? null])) : null,
    afterScores: r?.profile ? Object.fromEntries(VALUE_DIMENSIONS.map((k) => [k, r.profile.dimensions[k]?.score ?? null])) : null,
    weaknesses: gen.diagnosis?.weaknesses ?? [],
    decisions: Array.isArray(gen.strengthen) && Array.isArray(gen.choices)
      ? gen.strengthen.map((it: any) => {
        const c = gen.choices.find((x: any) => x.itemId === it.id);
        return { area: it.weakness, choice: c?.choice === "keep" ? "Keep current approach" : it.options?.find((o: any) => o.id === c?.choice)?.title ?? null, custom: c?.custom ?? null };
      })
      : [],
    offer: r ? { name: r.offerName, promise: r.promise, audience: r.audience, method: r.methodSummary, deliverables: r.deliverables, pricing: r.pricing, futureActions: r.futureActions ?? [] } : null,
  };
}
