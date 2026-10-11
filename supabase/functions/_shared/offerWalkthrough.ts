// =============================================================================
// Category-aware walkthrough state for non-Primary offers. Field order, tabs,
// sections and statuses come from OFFER_TIER_LAYOUTS (what the editor shows).
// Pure — imported by coach-chat and vitest. The Primary Core Offer keeps the
// Blueprint-based walkthrough in coach-chat.
// =============================================================================

import { OFFER_TIER_LAYOUTS, getOfferEditorFieldByPath, type OfferFieldStatus } from "./blueprintRegistry.ts";
import { isOfferTier } from "./offerAiPolicy.ts";

const PRICE_PATHS = new Set(["offer_stack.pricing.core_price", "offer_stack.pricing.recurring_offer.monthly_price"]);

const get = (obj: any, path: string) =>
  path.replace(/^offer_stack\./, "").split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

const blank = (v: unknown): boolean => {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return !Number.isFinite(v);
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return v.every(blank);
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).filter(([k]) => k !== "id").every(([, x]) => blank(x));
  return false;
};

/** Is this field complete for this category, using its persisted structure? */
export function isOfferFieldComplete(tier: string, path: string, design: Record<string, any> | null | undefined): boolean {
  const v = get(design ?? {}, path);
  if (PRICE_PATHS.has(path)) {
    if (tier === "free") return true; // Free is always free — 0 is complete
    if (v == null || v === "") return false; // missing paid price is never 0
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0;
  }
  return !blank(v);
}

export interface WalkthroughItem { path: string; label: string; status: OfferFieldStatus; complete: boolean; tabId: string; tabLabel: string; section: string }

export function offerWalkthroughItems(tier: string, design: Record<string, any> | null | undefined): WalkthroughItem[] {
  if (!isOfferTier(tier)) return [];
  const out: WalkthroughItem[] = [];
  for (const tab of OFFER_TIER_LAYOUTS[tier].tabs) {
    for (const section of tab.sections) {
      for (const item of section.items) {
        if (item.kind === "relationship") continue; // links are not offer design fields
        const f = getOfferEditorFieldByPath(item.path) as any;
        out.push({
          path: item.path,
          label: (item as any).editor?.label ?? f?.editor?.label ?? f?.label ?? item.path.split(".").pop()!,
          status: item.status,
          complete: isOfferFieldComplete(tier, item.path, design),
          tabId: tab.id, tabLabel: tab.label, section: section.label,
        });
      }
    }
  }
  return out;
}

/** Next field worth working on: essential/recommended only (optional never forced). */
export function nextWalkthroughItem(items: WalkthroughItem[], tabId: string | null) {
  const pending = items.filter((i) => !i.complete && i.status !== "optional");
  const inTab = tabId ? pending.find((i) => i.tabId === tabId) ?? null : null;
  const elsewhere = pending.find((i) => i.tabId !== tabId) ?? null;
  return { inTab, elsewhere };
}

const STATUS_LABEL: Record<OfferFieldStatus, string> = { min: "essential", recommended: "recommended", optional: "optional" };

export function renderOfferWalkthroughState(
  offer: { tier: string; name: string; design: Record<string, any> },
  tabId: string | null,
  discussedUnfilled: string[] = [],
): string | null {
  const items = offerWalkthroughItems(offer.tier, offer.design);
  if (!items.length) return null;
  const tab = tabId && items.some((i) => i.tabId === tabId) ? tabId : null;
  const discussed = new Set(discussedUnfilled);
  const tabs = [...new Map(items.map((i) => [i.tabId, i.tabLabel])).entries()];
  const lines: string[] = [];
  for (const [id, label] of tabs) {
    lines.push(`${id === tab ? "**" + label + " (active tab)**" : label}:`);
    for (const i of items.filter((x) => x.tabId === id)) {
      const note = i.complete ? "DONE" : discussed.has(i.path) ? "EMPTY — discussed earlier but NEVER applied" : "EMPTY";
      lines.push(`- ${i.path} — ${i.label} [${STATUS_LABEL[i.status]}]: ${note}`);
    }
  }
  const { inTab, elsewhere } = nextWalkthroughItem(items, tab);
  const next = inTab
    ? `Next field to work on: ${inTab.path} — ${inTab.label} (${inTab.section}).`
    : elsewhere
      ? `Every essential/recommended field on ${tab ? "this tab" : "the open tab"} is done. The next one is "${elsewhere.label}" on the "${elsewhere.tabLabel}" tab — tell the user to open that tab; do NOT propose writes for it from here.`
      : "All essential and recommended fields are done. Optional fields may be improved if the user wants — never push them.";
  return `# Offer walkthrough state — SINGLE SOURCE OF TRUTH (HARD CONSTRAINT)
Offer: "${offer.name}". These are the fields the editor shows for this category, in editor order. A field is complete ONLY when the offer currently holds a value — discussing or proposing it doesn't count.

${lines.join("\n")}

${next}

Rules:
- Follow this order; never use the Primary Core Offer's field order for this offer.
- Briefly say why the next field matters, use existing context before asking, then propose through the normal approval flow.
- Writes stay inside the active tab${tab ? "" : " (the active tab is unknown — make no writes; ask the user to open the relevant tab)"}. If the next field is on another tab, guide the user there.
- Optional fields are never required to finish. Don't treat hidden or inapplicable fields as missing.
- For "discussed earlier but NEVER applied": briefly acknowledge it wasn't applied and ask what didn't fit.`;
}
