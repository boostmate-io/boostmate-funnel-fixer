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
    .replace(/\b(?:this|the)\s+dimension\b/gi, "this part of your offer")
    .replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** True when b adds nothing beyond a (identical or contained). */
export function isRedundant(a: string, b: string): boolean {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}
