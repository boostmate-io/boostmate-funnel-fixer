// =============================================================================
// Tier-aware Coach permissions + server-side value validation (pure helpers).
//
// Permission = actual offer category (from the DB) × current editor tab ×
// registry definition × persisted design path. Manual editability never
// implies AI writability. Offer relationships have no design path and are
// never writable. No Deno / network imports — also used by vitest.
// =============================================================================

import {
  BLUEPRINT_FIELD_BY_PATH,
  BLUEPRINT_LISTS,
  DELIVERY_TYPE_VALUES,
  OFFER_PRICE_PATHS,
  OFFER_TIER_AI_POLICY,
  OFFER_TIER_LAYOUTS,
  OFFER_TIERS,
  getOfferEditorFieldByPath,
  type EnumValue,
  type OfferTier,
  type RegistryField,
  type RegistryList,
} from "./blueprintRegistry.ts";

export interface OfferAiPermission {
  read: boolean;
  write: boolean;
  /** Editor tab that owns the path for this tier. */
  tabId: string | null;
  reason?: "unknown_tier" | "not_in_tier" | "other_tab" | "denied" | "read_only" | "not_ai_writable" | "unknown_list_field";
}

export const isOfferTier = (t: unknown): t is OfferTier => typeof t === "string" && (OFFER_TIERS as string[]).includes(t);

interface Resolved {
  kind: "field" | "list";
  /** Field path, or list base path. */
  basePath: string;
  field?: RegistryField;
  list?: RegistryList;
  /** Item key for list item paths. */
  itemKey?: string;
  itemIndex?: number;
}

const LIST_ITEM_RE = /^(.*)\.(\d+)\.([a-z_]+)$/;

function resolvePath(path: string): Resolved | null {
  const m = LIST_ITEM_RE.exec(path);
  if (m) {
    const list = BLUEPRINT_LISTS.find((l) => l.basePath === m[1]);
    if (list) return { kind: "list", basePath: list.basePath, list, itemIndex: Number(m[2]), itemKey: m[3] };
  }
  const field = getOfferEditorFieldByPath(path);
  if (field && path.startsWith("offer_stack.")) return { kind: "field", basePath: path, field };
  return null;
}

function tabFor(tier: OfferTier, basePath: string, kind: "field" | "list"): string | null {
  for (const tab of OFFER_TIER_LAYOUTS[tier].tabs) {
    for (const s of tab.sections) {
      for (const i of s.items) if (i.kind === kind && i.path === basePath) return tab.id;
    }
  }
  return null;
}

/** Can the Coach read / write `path` on an offer of `tier` while `tabId` is open? */
export function offerAiPermission(tier: unknown, path: string, tabId?: string | null): OfferAiPermission {
  if (!isOfferTier(tier)) return { read: false, write: false, tabId: null, reason: "unknown_tier" };
  const r = resolvePath(path);
  if (!r) return { read: false, write: false, tabId: null, reason: "not_in_tier" };
  const ownTab = tabFor(tier, r.basePath, r.kind);
  if (!ownTab) return { read: false, write: false, tabId: null, reason: "not_in_tier" };
  const no = (reason: OfferAiPermission["reason"]): OfferAiPermission => ({ read: true, write: false, tabId: ownTab, reason });
  if (r.kind === "list" && !r.list!.itemFields.some((f) => f.key === r.itemKey && f.aiWritable !== false)) {
    return no("unknown_list_field");
  }
  const policy = OFFER_TIER_AI_POLICY[tier];
  if (policy.mode === "registry") {
    // Core: unchanged — the Coach-visible registry flag decides.
    const ok = r.kind === "list" ? r.list!.aiWritable : !!BLUEPRINT_FIELD_BY_PATH[path]?.aiWritable;
    if (!ok) return no("not_ai_writable");
  }
  if (policy.denyPrefixes.some((p) => path.startsWith(p))) return no("denied");
  if (policy.readOnly.includes(r.basePath)) return no("read_only");
  if (tabId && tabId !== ownTab) return no("other_tab");
  return { read: true, write: true, tabId: ownTab };
}

/** Every writable path pattern for a tier (list items as `<base>.<n>.<key>`). */
export function offerAiWritablePaths(tier: OfferTier, tabId?: string | null): string[] {
  const out: string[] = [];
  for (const tab of OFFER_TIER_LAYOUTS[tier].tabs) {
    for (const s of tab.sections) {
      for (const i of s.items) {
        if (i.kind === "field" && offerAiPermission(tier, i.path, tabId).write) out.push(i.path);
        if (i.kind === "list") {
          const list = BLUEPRINT_LISTS.find((l) => l.basePath === i.path);
          for (const f of list?.itemFields ?? []) {
            if (offerAiPermission(tier, `${i.path}.0.${f.key}`, tabId).write) out.push(`${i.path}.<n>.${f.key}`);
          }
        }
      }
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// Value validation
// -----------------------------------------------------------------------------

export interface ProposedWrite { path: string; value: unknown }
export interface WriteError { path: string; reason: string }
export type ValidateResult =
  | { ok: true; design: Record<string, any>; applied: { path: string; value: unknown }[] }
  | { ok: false; errors: WriteError[] };

const MAX_TEXT = 5000;

function matchEnum(values: EnumValue[], raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  const hit = values.find((v) => v.value.toLowerCase() === s || v.label.toLowerCase() === s);
  return hit ? hit.value : null;
}

function toArray(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((v) => v.trim()).filter(Boolean);
  return null;
}

/** Parse a price ("€1.500", "1,500", "49.99") → non-negative number, or null. */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[€$£\s]/g, "").replace(/(eur|usd|gbp)$/i, "");
  // thousands separators: "1.500" / "1,500" (3-digit groups) → strip
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
  s = s.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeValue(tier: OfferTier, path: string, r: Resolved, raw: unknown): { value?: unknown; reason?: string } {
  const isBlank = raw == null || (typeof raw === "string" && raw.trim() === "") || (Array.isArray(raw) && raw.length === 0);
  if (isBlank) return { reason: "clear_not_allowed" };
  if (r.kind === "list") {
    if (typeof raw !== "string" && typeof raw !== "number") return { reason: "invalid_text" };
    const s = String(raw).trim();
    return s.length > MAX_TEXT ? { reason: "too_long" } : { value: s };
  }
  const f = r.field!;
  if (OFFER_PRICE_PATHS.includes(path)) {
    if (tier === "free") return { reason: "free_price_fixed" };
    const n = parsePrice(raw);
    if (n == null) return { reason: "invalid_price" };
    // A paid offer without a price stays empty — never a placeholder 0.
    if (n === 0) return { reason: "zero_price_on_paid_offer" };
    return { value: n };
  }
  if (f.valueType === "enum") {
    const v = matchEnum(f.enumValues ?? [], raw);
    return v ? { value: v } : { reason: "invalid_option" };
  }
  if (f.valueType === "string[]") {
    const arr = toArray(raw);
    if (!arr || !arr.length) return { reason: "invalid_option" };
    const out: string[] = [];
    for (const item of arr) {
      const v = f.enumValues
        ? matchEnum(f.enumValues, item)
        : DELIVERY_TYPE_VALUES.find((d) => d.toLowerCase() === item.toLowerCase()) ?? null;
      if (!v) return { reason: "invalid_option" };
      if (!out.includes(v)) out.push(v);
    }
    return { value: out };
  }
  if (f.valueType === "number") {
    const n = parsePrice(raw);
    return n == null ? { reason: "invalid_number" } : { value: n };
  }
  if (f.valueType === "boolean") return { reason: "not_ai_writable" };
  if (typeof raw !== "string") return { reason: "invalid_text" };
  const s = raw.trim();
  return s.length > MAX_TEXT ? { reason: "too_long" } : { value: s };
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? {}));

/**
 * Validate AI-proposed writes for one offer. All-or-nothing: any invalid write
 * rejects the whole batch, so unrelated changes are never partially applied.
 * Paths are `offer_stack.*`; the returned design is the offer design with only
 * the validated paths set (every other — including hidden — field untouched).
 */
export function validateOfferAiWrites(input: {
  tier: unknown;
  tabId?: string | null;
  design: Record<string, any> | null | undefined;
  writes: ProposedWrite[];
}): ValidateResult {
  const errors: WriteError[] = [];
  const next = clone(input.design ?? {});
  const applied: { path: string; value: unknown }[] = [];
  const lengths = new Map<string, number>();
  for (const w of input.writes ?? []) {
    const path = String(w?.path ?? "");
    const perm = offerAiPermission(input.tier, path, input.tabId);
    if (!perm.write) { errors.push({ path, reason: perm.reason ?? "not_ai_writable" }); continue; }
    const r = resolvePath(path)!;
    const norm = normalizeValue(input.tier as OfferTier, path, r, w.value);
    if (norm.reason) { errors.push({ path, reason: norm.reason }); continue; }
    const rel = path.slice("offer_stack.".length).split(".");
    if (r.kind === "list") {
      const baseRel = r.basePath.slice("offer_stack.".length).split(".");
      let arr: any = next;
      for (const k of baseRel) arr = arr?.[k];
      const existing = Array.isArray(arr) ? arr.length : 0;
      const known = lengths.get(r.basePath) ?? existing;
      // Respect structure: update an existing item or append exactly one new item.
      if (r.itemIndex! > known) { errors.push({ path, reason: "list_index_out_of_range" }); continue; }
      if (arr != null && !Array.isArray(arr)) { errors.push({ path, reason: "invalid_structure" }); continue; }
      lengths.set(r.basePath, Math.max(known, r.itemIndex! + 1));
    }
    let cur: any = next;
    let broken = false;
    for (let i = 0; i < rel.length - 1; i++) {
      const k = rel[i];
      const nextIsIndex = /^\d+$/.test(rel[i + 1]);
      if (cur[k] == null) cur[k] = nextIsIndex ? [] : {};
      else if (typeof cur[k] !== "object") { broken = true; break; }
      cur = cur[k];
    }
    if (broken) { errors.push({ path, reason: "invalid_structure" }); continue; }
    cur[rel[rel.length - 1]] = norm.value;
    applied.push({ path, value: norm.value });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, design: next, applied };
}

// -----------------------------------------------------------------------------
// Coach write-back gate (Phase 2) — shared by the server proposal flow and the
// client apply step, so both enforce identical rules.
// -----------------------------------------------------------------------------

const VIRTUAL_RE = /^(.*)\.new_(\d+)\.([a-z_]+)$/;

/**
 * Map Coach list proposals (`<base>.new_<k>.<key>`) onto append indices
 * (`<base>.<len + k>.<key>`), keeping new items in proposal order.
 */
export function resolveVirtualListPaths(design: Record<string, any> | null | undefined, writes: ProposedWrite[]): ProposedWrite[] {
  const order = new Map<string, Map<string, number>>();
  return (writes ?? []).map((w) => {
    const m = VIRTUAL_RE.exec(String(w?.path ?? ""));
    if (!m) return w;
    const [, base, k, key] = m;
    let arr: any = design ?? {};
    for (const seg of base.replace(/^offer_stack\./, "").split(".")) arr = arr?.[seg];
    const len = Array.isArray(arr) ? arr.length : 0;
    const seen = order.get(base) ?? new Map<string, number>();
    if (!seen.has(k)) seen.set(k, seen.size);
    order.set(base, seen);
    return { ...w, path: `${base}.${len + seen.get(k)!}.${key}` };
  });
}

/** Stringify a validated value for the existing string-valued write card. */
export const writeValueToString = (v: unknown): string => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

/**
 * Validate a batch of Coach writes for a non-Primary offer. Rejects the whole
 * batch on any invalid write. Returns the original paths (virtual list paths
 * preserved for the approval card) with normalized string values.
 */
export function gateOfferCoachWrites(input: {
  tier: unknown;
  tabId?: string | null;
  design: Record<string, any> | null | undefined;
  writes: { path: string; value: unknown; label?: string }[];
}): { ok: true; writes: { path: string; value: string; label?: string }[] } | { ok: false; errors: WriteError[] } {
  const resolved = resolveVirtualListPaths(input.design, input.writes);
  const res = validateOfferAiWrites({ tier: input.tier, tabId: input.tabId, design: input.design, writes: resolved });
  if (!res.ok) return res;
  return {
    ok: true,
    writes: input.writes.map((w, i) => ({ ...w, value: writeValueToString(res.applied[i].value) })),
  };
}

/** Valid editor tab for a tier, or null (untrusted client claim). */
export function validTierTab(tier: unknown, tabId: unknown): string | null {
  if (!isOfferTier(tier) || typeof tabId !== "string") return null;
  return OFFER_TIER_LAYOUTS[tier].tabs.some((t) => t.id === tabId) ? tabId : null;
}
