// =============================================================================
// Field reference for the active non-Core offer's open tab — label, helper,
// section, current value, allowed values and category constraints, all read
// from the central registry. Context only: permissions stay in offerAiPolicy.
// =============================================================================

import { OFFER_TIER_LAYOUTS, getOfferEditorFieldByPath } from "./blueprintRegistry.ts";
import { isOfferTier, offerAiPermission } from "./offerAiPolicy.ts";

const get = (obj: any, path: string) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

const TIER_CONSTRAINTS: Record<string, string[]> = {
  free: ["Free offers are always free — never propose a price."],
  low_ticket: ["Prices must be above 0; never empty an existing price."],
  mid_ticket: ["Prices must be above 0; never empty an existing price."],
  premium: ["Premium Type and High-Touch Level accept only the allowed values listed."],
  continuity: ["Recurring Price is per the selected Billing Interval (monthly, quarterly or yearly) and must be above 0."],
};

const short = (v: unknown) => {
  if (v == null || v === "") return "(empty)";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 300 ? `${s.slice(0, 300)}…` : s;
};

export function renderOfferFieldReference(tier: string, tabId: string | null, design: Record<string, any> | null | undefined): string {
  if (!isOfferTier(tier) || tier === "core" || !tabId) return "";
  const tab = OFFER_TIER_LAYOUTS[tier].tabs.find((t) => t.id === tabId);
  if (!tab) return "";
  const lines = [`## Field reference — "${tab.label}" tab (use exact allowed values)`];
  for (const section of tab.sections) {
    for (const item of section.items) {
      if (item.kind === "relationship") continue;
      const path = (item as { path: string }).path;
      const f = getOfferEditorFieldByPath(path) as any;
      const label = (item as any).editor?.label ?? f?.editor?.label ?? f?.label ?? path;
      const helper = (item as any).editor?.helper ?? f?.editor?.helper ?? f?.helper;
      const values = (f?.enumValues ?? f?.options ?? []).map((v: any) => (typeof v === "string" ? v : v.value)).filter(Boolean);
      const writable = item.kind === "list" || offerAiPermission(tier, path, tabId).write;
      const rel = path.replace(/^offer_stack\./, "");
      lines.push(
        `- ${label} [${section.label}] \`${path}\`${writable ? "" : " (read-only for the Coach)"}` +
          (helper ? `\n  helper: ${helper}` : "") +
          (values.length ? `\n  allowed values: ${values.join(", ")}` : "") +
          `\n  current: ${short(get(design ?? {}, rel))}`,
      );
    }
  }
  const c = TIER_CONSTRAINTS[tier];
  if (c?.length) lines.push("Constraints:", ...c.map((x) => `- ${x}`));
  return lines.join("\n");
}
