// =============================================================================
// Generated offer content → existing Offer Design (category-aware). Writes are
// validated with the shared AI policy (all-or-nothing). No save path here:
// callers persist via the existing Primary (Blueprint) or per-offer queues.
// =============================================================================

import { OFFER_TIER_LAYOUTS, getOfferEditorFieldByPath, BLUEPRINT_LISTS, type OfferTier } from "../blueprintRegistry.ts";
import { isOfferTier, offerAiPermission, resolveVirtualListPaths, validateOfferAiWrites, type WriteError } from "../offerAiPolicy.ts";

/** Persistence target — Primary Core and Additional Core stay distinct. */
export type OfferPersistTarget =
  | { kind: "primary_core"; blueprintId: string }
  | { kind: "offer"; offerId: string; tier: OfferTier };

export interface GeneratedWrite { path: string; value: unknown }

export type MapResult =
  | { ok: true; design: Record<string, any>; applied: { path: string; value: unknown }[] }
  | { ok: false; errors: WriteError[] };

/** Writable paths for a whole category (all tabs) — the package op's contract. */
export function categoryWritableFields(tier: OfferTier) {
  const out: { path: string; label: string; tabId: string; kind: "field" | "list"; values?: string[]; itemKeys?: string[] }[] = [];
  for (const tab of OFFER_TIER_LAYOUTS[tier].tabs) for (const s of tab.sections) for (const i of s.items) {
    if (i.kind === "relationship") continue;
    if (i.kind === "field") {
      if (!offerAiPermission(tier, i.path).write) continue;
      const f = getOfferEditorFieldByPath(i.path) as any;
      const values = (f?.enumValues ?? []).map((v: any) => v.value);
      out.push({ path: i.path, label: f?.label ?? i.path, tabId: tab.id, kind: "field", ...(values.length ? { values } : {}) });
    } else {
      const list = BLUEPRINT_LISTS.find((l) => l.basePath === i.path);
      const keys = (list?.itemFields ?? []).map((k) => k.key).filter((k) => offerAiPermission(tier, `${i.path}.0.${k}`).write);
      if (keys.length) out.push({ path: i.path, label: list?.label ?? i.path, tabId: tab.id, kind: "list", itemKeys: keys });
    }
  }
  return out;
}

/**
 * Apply generated writes onto the current design for this category. The tier
 * must come from the persisted offer (or the chosen category for new offers).
 * Uses no tab restriction (the Builder works across tabs) but every other
 * policy rule applies: category fields only, enums, Free price fixed,
 * positive paid prices, no clearing, list append/update only.
 */
export function mapGeneratedToDesign(tier: unknown, design: Record<string, any> | null | undefined, writes: GeneratedWrite[]): MapResult {
  if (!isOfferTier(tier)) return { ok: false, errors: [{ path: "", reason: "unknown_tier" }] };
  if (!Array.isArray(writes) || writes.length === 0) return { ok: false, errors: [{ path: "", reason: "no_writes" }] };
  const base = JSON.parse(JSON.stringify(design ?? {}));
  const resolved = resolveVirtualListPaths(base, writes);
  const res = validateOfferAiWrites({ tier, tabId: null, design: base, writes: resolved });
  if ("errors" in res) return { ok: false, errors: res.errors };
  ensureIds(res.design);
  return { ok: true, design: res.design, applied: res.applied };
}

function ensureIds(root: any) {
  for (const l of BLUEPRINT_LISTS) {
    if (!l.basePath.startsWith("offer_stack.")) continue;
    let arr: any = root;
    for (const k of l.basePath.slice(12).split(".")) arr = arr?.[k];
    if (!Array.isArray(arr)) continue;
    arr.forEach((it, i) => { if (it && typeof it === "object" && !it.id) arr[i] = { ...it, id: crypto.randomUUID() }; });
  }
}
