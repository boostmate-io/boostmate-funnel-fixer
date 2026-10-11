// =============================================================================
// scopedOfferWrites — applies Coach-proposed writes to ONE offer's design
// (an additional Core Offer), never to the Blueprint.
//
// Validation is the same as the Blueprint write-back (registry-backed
// isWritablePath) plus a hard restriction to Offer Design paths. Anything
// else is rejected — never silently redirected.
// =============================================================================

import type { OfferDesignData } from "@/components/business-blueprint/offerDesignTypes";
import type { CoachBlueprintWrite } from "./types";
import { coerceForPath, isWritablePath, setDeep } from "./applyBlueprintWrites";
import { resolveVirtualListPaths, validateOfferAiWrites } from "@shared/offerAiPolicy";

const OFFER_ROOT = "offer_stack";
const DESIGN_SECTIONS = new Set(["angle", "stack", "pricing"]);

export type ScopedRejectReason =
  | "not_offer_design_path"
  | "not_writable"
  | "invalid_value"
  | "invalid_list_index";

export interface ScopedWriteResult {
  next: OfferDesignData;
  applied: CoachBlueprintWrite[];
  rejected: { write: CoachBlueprintWrite; reason: ScopedRejectReason }[];
}

const MAX_VALUE_LENGTH = 5000;
const MAX_LIST_INDEX = 49;

function validate(write: CoachBlueprintWrite): ScopedRejectReason | null {
  const path = typeof write?.path === "string" ? write.path : "";
  const segments = path.split(".");
  if (segments[0] !== OFFER_ROOT || !DESIGN_SECTIONS.has(segments[1] ?? "")) {
    return "not_offer_design_path";
  }
  if (segments.some((s) => s === "__proto__" || s === "constructor" || s === "prototype" || s === "")) {
    return "not_offer_design_path";
  }
  if (!isWritablePath(path)) return "not_writable";
  if (segments.some((s) => /^\d+$/.test(s) && Number(s) > MAX_LIST_INDEX)) return "invalid_list_index";
  if (typeof write.value !== "string" || write.value.length > MAX_VALUE_LENGTH) return "invalid_value";
  return null;
}

/** Give every list item an id without dropping any existing keys. */
function ensureListIds(root: any) {
  const lists: any[] = [
    root?.angle?.framework?.pillars,
    root?.stack?.deliverables,
    root?.stack?.resources,
    root?.stack?.support_channels,
    root?.stack?.bonuses,
    root?.stack?.milestones,
    root?.pricing?.payment_plans,
  ];
  for (const arr of lists) {
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
      arr[i] = { ...item, id: item.id || crypto.randomUUID() };
    }
  }
}

/**
 * Pure: returns the next design for the scoped offer. The input is not mutated.
 */
export function applyScopedOfferWrites(
  design: OfferDesignData,
  writes: CoachBlueprintWrite[],
  tier: string = "core",
  tabId: string | null = null,
): ScopedWriteResult {
  if (tier !== "core") return applyTierOfferWrites(design, writes, tier, tabId);
  const working: { offer_stack: any } = { offer_stack: structuredClone(design ?? {}) };
  const applied: CoachBlueprintWrite[] = [];
  const rejected: ScopedWriteResult["rejected"] = [];

  for (const write of writes ?? []) {
    const reason = validate(write);
    if (reason) {
      rejected.push({ write, reason });
      continue;
    }
    setDeep(working, write.path.split("."), coerceForPath(write.path, write.value));
    applied.push(write);
  }

  if (applied.length) ensureListIds(working.offer_stack);
  return { next: working.offer_stack as OfferDesignData, applied, rejected };
}

/**
 * Non-Core categories: the shared tier-aware policy (same rules as the
 * server). All-or-nothing — one invalid write rejects the whole batch.
 */
function applyTierOfferWrites(
  design: OfferDesignData,
  writes: CoachBlueprintWrite[],
  tier: string,
  tabId: string | null,
): ScopedWriteResult {
  const base = structuredClone(design ?? {}) as any;
  const resolved = resolveVirtualListPaths(base, writes ?? []);
  const res = validateOfferAiWrites({ tier, tabId, design: base, writes: resolved });
  if ("errors" in res) {
    const bad = new Map<string, string>(res.errors.map((e) => [e.path, e.reason]));
    return {
      next: design,
      applied: [],
      rejected: (writes ?? []).map((write, i) => ({
        write,
        reason: (bad.has(resolved[i].path) && /tier|tab|denied|writable|read_only|list_field/.test(bad.get(resolved[i].path)!)
          ? "not_writable"
          : "invalid_value") as ScopedRejectReason,
      })),
    };
  }
  if (!("design" in res)) return { next: design, applied: [], rejected: [] };
  ensureListIds(res.design);
  return { next: res.design as OfferDesignData, applied: [...(writes ?? [])], rejected: [] };
}
