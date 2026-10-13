// Plain-language helpers for AI-generated offer text (pure; shared by the
// public result screen and the Offer Blueprint PDF).

/** Structured AI content → readable text. Never prints raw objects/JSON. */
export function toText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join("; ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const head = toText(o.name ?? o.title ?? o.label ?? "");
    const body = toText(o.description ?? o.summary ?? o.text ?? o.value ?? "");
    if (head || body) return head && body ? `${head}: ${body}` : head || body;
    return Object.values(o).map(toText).filter(Boolean).join("; ");
  }
  return "";
}

/** Replace internal scoring vocabulary with plain language. */
export function humanize(s: unknown): string {
  return toText(s)
    .replace(/\(\s*['"]?[a-z ]+['"]?\s*(?:,\s*['"]?[a-z ]+['"]?\s*)*\)\s*from\s+(?:partial|weak)(?:\s*\/\s*(?:partial|weak))?\s+to\s+(?:strong|partial)/gi, "")
    .replace(/,?\s*(?:moving|taking|raising|shifting)\s+[^.;]*?\bfrom\s+(?:partial|weak|a gap)[^.;]*?\bto\s+(?:strong|partial|a clear strength)/gi, "")
    .replace(/\s*\bfrom\s+(?:partial|weak)(?:\s*\/\s*(?:partial|weak))?\s+to\s+(?:strong|partial)\b/gi, "")
    .replace(/\bfrom\s+weak\s+to\s+partial\b/gi, "from missing to partly in place")
    .replace(/\b(?:partial|weak)\s*\/\s*(?:partial|weak)\b/gi, "underdeveloped")
    .replace(/\b(criteri(?:on|a))\b/gi, (m) => (m.toLowerCase() === "criteria" ? "areas" : "area"))
    .replace(/\bverdicts?\b/gi, "assessment")
    .replace(/\b(?:the\s+)?(?:apply[ _-]now|future[ _-]actions?)\s+(?:improvements?|items?|changes?|decisions?)\b/gi, "the changes you chose")
    .replace(/\[?\b(?:APPLY[ _-]NOW|FUTURE[ _-]ACTIONS?|apply_now|future_action)\b\]?:?\s*/g, "")
    .replace(/\bselectedImprovements\b/g, "your chosen improvements")
    .replace(/,?\s*moving (?:the )?(?:overall )?(?:dimension )?score (?:upwards|up|higher)(?: from (?:weak|partial|unknown))?/gi, "")
    .replace(/\b(?:the\s+)?overall\s+dimension\s+score\b/gi, "the overall assessment")
    .replace(/\s*(?:to move )?(?:beyond|above|from|to|at|maintains?|keeps?) (?:an? |the )?['"‘’]?(?:strong|partial|weak|unknown)['"‘’]? (?:assessment|rating|verdict|level)( for [a-z ]+)?/gi, "")
    .replace(/['"‘’](strong|partial|weak|unknown)['"‘’]/gi, "$1")
    .replace(/\b(?:this|the)\s+dimension\b/gi, "this part of your offer")
    .replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** True when b adds nothing beyond a (identical or contained). */
export function isRedundant(a: string, b: string): boolean {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}

/** Pricing guidance headings — shared by the website and the PDF. */
export function pricingHeadings(hasPrice: boolean): [string, string, string] {
  return hasPrice
    ? ["What influences whether this price makes sense", "How to strengthen the perceived value", "What to validate before changing your price"]
    : ["What should influence your pricing", "How to strengthen the perceived value", "What to validate before setting your price"];
}

/** Implementation warning that only names what the proposal actually contains. */
export function promotionWarning(texts: string[]): string {
  const all = texts.join(" ").toLowerCase();
  const items: string[] = [];
  if (/assessment|fit call|discovery call|clarity call/.test(all)) items.push("the proposed assessment");
  if (/method|framework|curriculum|steps/.test(all)) items.push("the coaching method and materials");
  if (/onboard|process|journey|delivery/.test(all)) items.push("the delivery process");
  if (/testimonial|case stud/.test(all)) items.push("genuine testimonials or case studies (with consent)");
  if (/guarantee/.test(all)) items.push("the terms of any guarantee");
  const what = items.length ? items.join(", ").replace(/, ([^,]*)$/, " and $1") : "everything listed in your implementation checklist";
  return `Before promoting this offer, develop ${what}. Validate any claims about client outcomes before using them in marketing.`;
}

/** Score-change wording that contradicts the final reconciled score (e.g. "improved" when unchanged). */
const UP_RE = /\b(improv\w*|increas\w*|rais\w*|boost\w*|higher|lift\w*|went up|moved up|stronger score|score (?:rose|grew))\b/i;
const DOWN_RE = /\b(decreas\w*|lower\w*|drop\w*|fell|declin\w*|reduc\w* the score)\b/i;
/**
 * Explanation for why a score moved, aligned to the FINAL reconciled state.
 * The AI's own wording is kept only when it does not contradict the numbers.
 */
export function alignScoreWhy(state: "up" | "down" | "same", text: string, label: string, after: string): string {
  const t = (text ?? "").trim();
  const contradicts = state === "same" ? UP_RE.test(t) || DOWN_RE.test(t) : state === "up" ? DOWN_RE.test(t) && !UP_RE.test(t) : UP_RE.test(t) && !DOWN_RE.test(t);
  if (t && !contradicts) return t;
  if (state === "same") return `The proposed changes may make this part of your offer clearer, but they are not yet in place or supported by evidence, so ${label} stays at ${after}. The score can rise once these changes are implemented and show results.`;
  if (state === "up") return `The improved offer describes this part more concretely, which raises ${label} to ${after}. The proposed changes still need to be put in place and tested.`;
  return `The improved offer leaves this part less clearly supported than before, so ${label} is now ${after}.`;
}

const normName = (s: unknown) => toText(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
/** Deliverables minus anything the AI positioned as a separate pre-enrollment step. */
export function splitPreProgram<T extends { name?: unknown }>(deliverables: T[], pre: { name: string }[] | undefined): T[] {
  const names = new Set((pre ?? []).map((p) => normName(p.name)).filter(Boolean));
  return names.size ? deliverables.filter((d) => !names.has(normName(d.name))) : deliverables;
}

/** Shown with every Before/After comparison (website and PDF). */
export const IMPROVED_ASSESSMENT_NOTE = "The improved assessment reflects the offer as designed, assuming the proposed changes are implemented. It does not represent proven results or guaranteed conversion improvements.";
