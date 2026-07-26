// =============================================================================
// Brand Strategy — tab + field configuration.
// Derived entirely from the Business Blueprint Registry (single source of
// truth). Every field is Coach-ready via `FieldCard` (field-scope Coach).
// =============================================================================

import { type LucideIcon } from "lucide-react";
import type { FieldDef } from "./clarityConfig";
import {
  getRegistryTab,
  calcSubBlockUnitsProgress,
  type RegistrySubBlock,
} from "@shared/blueprintRegistry";
import { resolveIcon, toFieldDef } from "./registryUi";

export type BrandTabId = "positioning" | "voice" | "visual" | "foundation";

export interface BrandFieldDef extends Omit<FieldDef, "key"> {
  key: string; // brand_strategy leaf keys (flat)
}

export interface BrandTabConfig {
  id: BrandTabId;
  label: string;
  icon: LucideIcon;
  description: string;
  fields: BrandFieldDef[];
}

const BRAND_SUB_BLOCKS: RegistrySubBlock[] = getRegistryTab("brand_strategy")?.subBlocks ?? [];

export const BRAND_STRATEGY_TABS: BrandTabConfig[] = BRAND_SUB_BLOCKS.map((sb) => ({
  id: sb.id as BrandTabId,
  label: sb.label,
  icon: resolveIcon(sb.iconKey),
  description: sb.description ?? "",
  fields: sb.fields.map((field) => toFieldDef(field) as BrandFieldDef),
}));

export const BRAND_FIELDS_BY_TAB: Record<BrandTabId, string[]> = Object.fromEntries(
  BRAND_STRATEGY_TABS.map((t) => [t.id, t.fields.map((f) => f.key)]),
) as Record<BrandTabId, string[]>;

export function calcBrandTabProgress(data: Record<string, any> | null | undefined, tabId: BrandTabId): number {
  const sb = BRAND_SUB_BLOCKS.find((s) => s.id === tabId);
  if (!sb) return 0;
  return calcSubBlockUnitsProgress(data ?? {}, sb, "brand_strategy");
}

export function calcBrandIdentityProgress(data: Record<string, any> | null | undefined): number {
  const tabs = BRAND_STRATEGY_TABS.map((t) => t.id);
  if (!tabs.length) return 0;
  const total = tabs.reduce((acc, t) => acc + calcBrandTabProgress(data, t), 0);
  return Math.round(total / tabs.length);
}


export type BrandIdentityData = Record<string, any>;
