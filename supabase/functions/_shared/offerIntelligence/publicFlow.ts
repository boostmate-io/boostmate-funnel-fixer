// =============================================================================
// Public Mini Offer Builder — pure helpers for the staged public flow
// (Discover → Diagnose → Strengthen → Improved Offer) and the Free Video
// Audit request. Reuses the shared diagnose/strengthen/public_generate
// operations and scoring; no network, no workspace access.
// =============================================================================

import { validateOperationOutput } from "./operations.ts";
import { scoreValueProfile, DIMENSION_LABELS, VALUE_DIMENSIONS, type CriterionAssessment, type ValueDimension, type ValueProfile } from "./valueEquation.ts";
import { EMAIL_RE } from "./publicResult.ts";

const clip = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const clipList = (v: unknown, max: number, n = 300) => (Array.isArray(v) ? v.map((x) => clip(x, n)).filter(Boolean).slice(0, max) : []);

export const PUBLIC_DIAGNOSE_INSTRUCTION = "Audience: a coach or consultant without marketing training. Write every reason, strength, weakness and improvement in plain, encouraging English — one short sentence each, no jargon and never criterion codes. Give 2–3 strengths, 2–3 weaknesses and exactly 3 top improvements.";
export const PUBLIC_STRENGTHEN_INSTRUCTION = "Public light version: return 2–3 items (highest impact first), each with EXACTLY 2 clearly different options. Plain English for a non-marketer: weakness as a short friendly title (max 7 words, e.g. \"Make your offer more believable\"), whyItMatters in 1–2 sentences from the buyer's view, option title max 7 words, change in 1–2 sentences, why in one sentence, tradeoff in one sentence. Never invent proof, testimonials, credentials, guarantees, scarcity or results; never just add deliverables.";

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
      assessments: v.assessments, profile: scoreValueProfile(v.assessments),
      strengths: clipList(v.strengths, 3), weaknesses: clipList(v.weaknesses, 3), topImprovements: clipList(v.topImprovements, 3),
    },
  };
}

export interface PublicOption { id: "a" | "b"; title: string; change: string; why: string; tradeoff: string }
export interface PublicImprovement { id: string; weakness: string; dimension: ValueDimension; whyItMatters: string; options: PublicOption[] }

export function buildStrengthen(raw: unknown): { ok: true; value: PublicImprovement[] } | { ok: false; errors: string[] } {
  const c = validateOperationOutput("strengthen", raw);
  if (!c.ok) return { ok: false, errors: (c as any).errors };
  const items: PublicImprovement[] = [];
  for (const it of c.value.items as any[]) {
    const opts = (it.options as any[]).filter((o) => clip(o.title, 1) && clip(o.change, 1)).slice(0, 2);
    if (opts.length < 2 || !VALUE_DIMENSIONS.includes(it.dimension)) continue;
    items.push({
      id: `i${items.length}`, weakness: clip(it.weakness, 120), dimension: it.dimension, whyItMatters: clip(it.whyItMatters, 500),
      options: opts.map((o, i) => ({ id: (i === 0 ? "a" : "b") as "a" | "b", title: clip(o.title, 120), change: clip(o.change, 600), why: clip(o.why, 400), tradeoff: clip(o.tradeoff, 400) })),
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
    return `- ${it.weakness}: ${o.title} — ${c.custom || o.change}`;
  }).join("\n");
  return {
    diagnosis: `Before scores (0–10): ${diag}. Weaknesses: ${d.weaknesses.join(" | ")}`,
    selectedImprovements: decisions,
  };
}

// ---- Free Video Audit request ---------------------------------------------

export const AUDIT_CHANNELS = ["instagram_organic", "paid_ads", "referrals", "combination", "no_system", "other"] as const;
export type AuditChannel = typeof AUDIT_CHANNELS[number];
export const AUDIT_CONSENT_TEXT_VERSION = "video-audit-v1";

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
    offer: r ? { name: r.offerName, promise: r.promise, audience: r.audience, method: r.methodSummary, deliverables: r.deliverables, pricing: r.pricing, scoreChanges: r.scoreChanges } : null,
  };
}
