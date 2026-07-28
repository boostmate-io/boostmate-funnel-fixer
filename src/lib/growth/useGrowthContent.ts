// =============================================================================
// useGrowthContent — delivery layer for the Growth Roadmap's editable content.
//
// Follows the "Editable Product Content" pattern (src/lib/content/README.md):
// admin-managed rows in `growth_stages` / `growth_systems`, localized through a
// `translations` JSONB overlay, cached once per session with the shared content
// cache policy.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_QUERY_OPTIONS, resolveContentList } from "@/lib/content/resolveContent";
import { STAGE_ORDER } from "./engine";
import type { GrowthStage, RelatedModule } from "./types";

export interface GrowthStageContentRow {
  stage: string;
  label: string;
  summary: string;
  typical_profile: string;
  unlock_condition: string;
  focus: string;
  success_criteria: string;
  bottleneck: string;
  objective: string;
  milestone: string;
  ai_guidance: string;
  sort_order: number;
  translations?: Record<string, Record<string, unknown>> | null;
}

export type GrowthStageContent = Omit<GrowthStageContentRow, "translations">;

export interface GrowthSystemContentRow {
  id: string;
  name: string;
  summary: string;
  addresses: string;
  stage_relevance: string[];
  related_module: string | null;
  ai_guidance: string;
  is_active: boolean;
  sort_order: number;
  translations?: Record<string, Record<string, unknown>> | null;
}

export type GrowthSystemContent = Omit<GrowthSystemContentRow, "translations">;

const STAGE_COLUMNS =
  "stage,label,summary,typical_profile,unlock_condition,focus,success_criteria,bottleneck,objective,milestone,ai_guidance,sort_order,translations";
const SYSTEM_COLUMNS =
  "id,name,summary,addresses,stage_relevance,related_module,ai_guidance,is_active,sort_order,translations";

/** Empty placeholder so components can render before content arrives. */
const EMPTY_STAGE = (stage: string): GrowthStageContent => ({
  stage,
  label: "",
  summary: "",
  typical_profile: "",
  unlock_condition: "",
  focus: "",
  success_criteria: "",
  bottleneck: "",
  objective: "",
  milestone: "",
  ai_guidance: "",
  sort_order: STAGE_ORDER.indexOf(stage as GrowthStage) + 1,
});

/** All stage content, resolved for the active locale and keyed by stage. */
export function useGrowthStageContent() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const query = useQuery({
    queryKey: ["growth-stage-content"],
    queryFn: async (): Promise<GrowthStageContentRow[]> => {
      const { data, error } = await supabase
        .from("growth_stages")
        .select(STAGE_COLUMNS)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as GrowthStageContentRow[];
    },
    ...CONTENT_QUERY_OPTIONS,
  });

  const resolved = resolveContentList(query.data ?? [], lang);
  const byStage = Object.fromEntries(resolved.map((r) => [r.stage, r])) as Record<
    string,
    GrowthStageContent
  >;

  /** Never returns undefined — falls back to blanks while loading. */
  const getStage = (stage: GrowthStage): GrowthStageContent =>
    byStage[stage] ?? EMPTY_STAGE(stage);

  return { stages: resolved, byStage, getStage, isLoading: query.isLoading };
}

/**
 * All active Growth Systems, resolved for the active locale.
 *
 * Canonical source: `growth_systems_catalog` (the single Growth Systems
 * catalog managed in Admin → Growth → Growth Systems). Catalog columns are
 * mapped onto the roadmap-facing content shape here.
 */
export function useGrowthSystemsContent(opts: { includeInactive?: boolean } = {}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const query = useQuery({
    queryKey: ["growth-systems-content", opts.includeInactive ?? false],
    queryFn: async (): Promise<GrowthSystemContentRow[]> => {
      let q = supabase.from("growth_systems_catalog").select(SYSTEM_COLUMNS);
      if (!opts.includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q.order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.key),
        name: String(r.label ?? ""),
        summary: String(r.description ?? ""),
        addresses: String(r.primary_objective ?? ""),
        stage_relevance: (r.recommended_stages as string[]) ?? [],
        related_module: "funnels",
        ai_guidance: String(r.ai_guidance ?? ""),
        is_active: Boolean(r.is_active),
        sort_order: Number(r.sort_order ?? 0),
        translations: (r.translations as GrowthSystemContentRow["translations"]) ?? null,
      }));
    },
    ...CONTENT_QUERY_OPTIONS,
  });

  const systems = resolveContentList(query.data ?? [], lang);

  const getSystem = (id: string | undefined | null): GrowthSystemContent | undefined =>
    id ? systems.find((s) => s.id === id) : undefined;

  const forStage = (stage: GrowthStage): GrowthSystemContent[] =>
    systems.filter((s) => (s.stage_relevance ?? []).includes(stage));

  const relatedModule = (s: GrowthSystemContent): RelatedModule =>
    (s.related_module as RelatedModule) ?? "none";

  return { systems, getSystem, forStage, relatedModule, isLoading: query.isLoading };
}
