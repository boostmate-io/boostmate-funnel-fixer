// Resolves the implementation state of the workspace's Main Offer Growth
// System (the "Client Converter" route in Growth Architecture).
//
// Used by the Growth Roadmap to derive completion of the
// `validate-refine-offer` task ("Build your main offer system").

import { supabase } from "@/integrations/supabase/client";

export const MAIN_OFFER_SYSTEM_KEY = "client-converter";

export interface MainOfferSystemStatus {
  /** A Client Converter route exists in Growth Architecture. */
  exists: boolean;
  /** That route has a funnel created (Start Building was used). */
  hasFunnel: boolean;
  /** The funnel has attached build guides and every active task is complete. */
  built: boolean;
}

const EMPTY: MainOfferSystemStatus = { exists: false, hasFunnel: false, built: false };

export async function fetchMainOfferSystemStatus(
  subAccountId: string | null,
): Promise<MainOfferSystemStatus> {
  if (!subAccountId) return EMPTY;

  const { data: catalog } = await supabase
    .from("growth_systems_catalog")
    .select("id")
    .eq("key", MAIN_OFFER_SYSTEM_KEY)
    .maybeSingle();
  if (!catalog?.id) return EMPTY;

  const { data: routes } = await supabase
    .from("growth_architecture_systems")
    .select("id, funnel_id")
    .eq("sub_account_id", subAccountId)
    .eq("system_catalog_id", catalog.id);

  const routeRows = routes ?? [];
  if (routeRows.length === 0) return EMPTY;

  const funnelIds = Array.from(
    new Set(routeRows.map((r) => r.funnel_id).filter((x): x is string => !!x)),
  );
  if (funnelIds.length === 0) return { exists: true, hasFunnel: false, built: false };

  const [{ data: guides }, { data: progress }] = await Promise.all([
    supabase.from("funnel_build_guides").select("funnel_id, build_guide_id").in("funnel_id", funnelIds),
    supabase
      .from("funnel_build_task_progress")
      .select("funnel_id, task_id, completed_at")
      .in("funnel_id", funnelIds),
  ]);

  const guideIds = Array.from(new Set((guides ?? []).map((g) => g.build_guide_id)));
  let taskRows: Array<{ task_id: string; build_guide_id: string }> = [];
  if (guideIds.length > 0) {
    const { data: stages } = await supabase
      .from("build_guide_stages")
      .select("id, build_guide_id")
      .in("build_guide_id", guideIds);
    const stageIds = (stages ?? []).map((s) => s.id);
    if (stageIds.length > 0) {
      const { data: tasks } = await supabase
        .from("build_guide_tasks")
        .select("id, stage_id")
        .in("stage_id", stageIds)
        .eq("is_active", true);
      const stageToGuide = new Map((stages ?? []).map((s) => [s.id, s.build_guide_id]));
      taskRows = (tasks ?? []).map((t) => ({
        task_id: t.id,
        build_guide_id: stageToGuide.get(t.stage_id) as string,
      }));
    }
  }

  const guidesByFunnel = new Map<string, Set<string>>();
  for (const g of guides ?? []) {
    const set = guidesByFunnel.get(g.funnel_id) ?? new Set<string>();
    set.add(g.build_guide_id);
    guidesByFunnel.set(g.funnel_id, set);
  }

  // Built when ANY client-converter funnel is fully complete.
  const built = funnelIds.some((fid) => {
    const attached = guidesByFunnel.get(fid) ?? new Set<string>();
    if (attached.size === 0) return false;
    const activeTasks = taskRows.filter((t) => attached.has(t.build_guide_id));
    if (activeTasks.length === 0) return false;
    const completed = (progress ?? []).filter(
      (p) => p.funnel_id === fid && p.completed_at && activeTasks.some((t) => t.task_id === p.task_id),
    ).length;
    return completed >= activeTasks.length;
  });

  return { exists: true, hasFunnel: true, built };
}
