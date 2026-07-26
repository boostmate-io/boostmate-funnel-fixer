// =============================================================================
// GrowthArchitectureSection — V5 shell (Map + Funnels tabs, RouteCard list)
// wired to the V2.1 data model:
//   - Traffic sources = external channels + upstream funnels
//   - Upstream funnels persist as pending_upstream_funnel_ids pre-build and as
//     funnel_connections post-build
//   - Offer relationships no longer drive the flow (kept in DB, not read here)
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Map as MapIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, PageTabs, PageBody } from "@/components/layout/PageLayout";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useGrowthArchitecture,
  useAcquisitionChannels,
  useGrowthSystemsCatalog,
  useRouteChannels,
  useRoutesBuildProgress,
} from "@/lib/growth-architecture/hooks";
import {
  useWorkspaceFunnels,
  useFunnelConnections,
} from "@/lib/growth-architecture/funnelConnections";
import { deriveRouteState } from "@/lib/growth-architecture/deriveStatus";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import AddRouteWizard from "./AddRouteWizard";
import DeleteRouteDialog from "./DeleteRouteDialog";
import EditRouteDialog from "./EditRouteDialog";
import GrowthMap from "./GrowthMap";
import RouteCard from "./RouteCard";

interface Props {
  offers: EcosystemOfferRow[];
  saving?: boolean;
}

type GrowthTab = "map" | "funnels";

const GrowthArchitectureSection = ({ offers }: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { rows: routes, loading: loadingRoutes, add, update, reload: reloadRoutes } =
    useGrowthArchitecture(activeSubAccountId ?? null);
  const { rows: channels } = useAcquisitionChannels();
  const { rows: systems } = useGrowthSystemsCatalog();
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);
  const routeChannels = useRouteChannels(routeIds);
  const funnelIds = useMemo(() => routes.map((r) => r.funnel_id), [routes]);
  const { byFunnel: buildProgress, reload: reloadProgress } = useRoutesBuildProgress(funnelIds);

  const { rows: workspaceFunnels, reload: reloadWorkspaceFunnels } = useWorkspaceFunnels(activeSubAccountId ?? null);
  const funnelConnHook = useFunnelConnections(activeSubAccountId ?? null);

  const [active, setActive] = useState<GrowthTab>("map");
  const [addOpen, setAddOpen] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [preselectedSystemId, setPreselectedSystemId] = useState<string | null>(null);
  const [preselectedOfferId, setPreselectedOfferId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; hasFunnel: boolean } | null>(null);
  const [editRouteId, setEditRouteId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { systemId?: string | null; offerId?: string | null } | undefined;
      setPreselectedSystemId(detail?.systemId ?? null);
      setPreselectedOfferId(detail?.offerId ?? null);
      setAddOpen(true);
    };
    window.addEventListener("boostmate:open-add-growth-route", handler);
    return () => window.removeEventListener("boostmate:open-add-growth-route", handler);
  }, []);

  const offerById = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers]);
  const funnelById = useMemo(
    () => new Map(workspaceFunnels.map((f) => [f.id, f] as const)),
    [workspaceFunnels],
  );
  const funnelIdToRouteId = useMemo(() => {
    const m = new Map<string, string>();
    routes.forEach((r) => { if (r.funnel_id) m.set(r.funnel_id, r.id); });
    return m;
  }, [routes]);

  // Upstream count per route (for deriveRouteState) — persisted + pending.
  const upstreamByRoute = useMemo(() => {
    const m = new Map<string, string[]>();
    routes.forEach((r) => {
      const persisted = r.funnel_id
        ? funnelConnHook.rows
            .filter((c) => c.target_funnel_id === r.funnel_id)
            .map((c) => c.source_funnel_id)
        : [];
      const pending = r.pending_upstream_funnel_ids ?? [];
      m.set(r.id, Array.from(new Set([...persisted, ...pending])));
    });
    return m;
  }, [routes, funnelConnHook.rows]);

  const openFunnel = (funnelId: string | null) => {
    window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "funnels" }));
    if (funnelId) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("boostmate:open-funnel", { detail: { funnelId } }));
      }, 50);
    }
  };

  const handleStartBuilding = async (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;
    setStartingId(routeId);
    try {
      const { data, error } = await supabase.functions.invoke("start-building-route", {
        body: { route_id: routeId },
      });
      if (error) throw error;
      const funnelId = (data as any)?.funnel_id as string | undefined;

      // Materialize pending upstream funnel picks into funnel_connections.
      const pending = route.pending_upstream_funnel_ids ?? [];
      if (funnelId && pending.length > 0) {
        for (const src of pending) {
          await funnelConnHook.add(src, funnelId);
        }
        await supabase
          .from("growth_architecture_systems")
          .update({ pending_upstream_funnel_ids: [] })
          .eq("id", routeId);
      }

      toast.success("Funnel created — opening Funnel Builder…");
      await Promise.all([reloadRoutes(), reloadProgress(), reloadWorkspaceFunnels(), funnelConnHook.reload()]);
      openFunnel(funnelId ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start building");
    } finally {
      setStartingId(null);
    }
  };

  const tabs: { id: GrowthTab; label: string; icon: typeof MapIcon }[] = [
    { id: "map", label: "Growth Map", icon: MapIcon },
    { id: "funnels", label: `Funnels (${routes.length})`, icon: List },
  ];

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Growth Architecture"
        subtitle="Each funnel connects a growth system to a target offer. Traffic sources are the mix of external acquisition channels and upstream funnels that feed customers in."
        divider={false}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Funnel
          </Button>
        }
      />

      <PageTabs
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
        value={active}
        onChange={(id) => setActive(id as GrowthTab)}
      />

      <PageBody>


          {active === "map" && (
            <div>
              <GrowthMap
                offers={offers}
                relationships={[]}
                routes={routes}
                channels={channels}
                systems={systems}
                routeChannelsByRoute={routeChannels.byRoute}
                workspaceFunnels={workspaceFunnels}
                funnelConnections={funnelConnHook.rows}
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                Read-only view. Dashed edges = pending upstream funnels (created on Start Building).
                Solid edges = live funnel-to-funnel connections.
              </p>
            </div>
          )}

          {active === "funnels" && (
            loadingRoutes ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : routes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No funnels yet. Add your first funnel to describe how customers reach your offers.
                </p>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Add Funnel
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {routes.map((r) => {
                  const sys = systems.find((s) => s.id === r.system_catalog_id);
                  const tgt = offerById.get(r.target_offer_id);
                  const bucket = routeChannels.byRoute.get(r.id) ?? { primary: null, additional: [] };
                  const buildInfo = r.funnel_id ? buildProgress.get(r.funnel_id) : undefined;
                  const upstreamIds = upstreamByRoute.get(r.id) ?? [];
                  const derived = deriveRouteState(
                    r, [], bucket.primary?.channel_id ?? null, buildInfo, upstreamIds.length,
                  );
                  const canStart = derived.state === "ready_to_build";
                  const isBusy = startingId === r.id;
                  const systemLabel = sys?.label ?? "System";
                  const targetLabel = tgt?.name ?? "Unknown offer";

                  const upstreamFunnels = upstreamIds
                    .map((fid) => {
                      const f = funnelById.get(fid);
                      const routeId = funnelIdToRouteId.get(fid) ?? "";
                      return { routeId, funnelName: f?.name ?? "Unknown funnel" };
                    });

                  return (
                    <RouteCard
                      key={r.id}
                      routeId={r.id}
                      systemLabel={systemLabel}
                      targetLabel={targetLabel}
                      derived={derived}
                      primary={bucket.primary}
                      additional={bucket.additional}
                      channels={channels}
                      upstreamFunnels={upstreamFunnels}
                      funnelName={r.funnel_id ? funnelById.get(r.funnel_id)?.name ?? null : null}
                      hasFunnel={!!r.funnel_id}
                      buildProgress={buildInfo ? {
                        active: buildInfo.activeTaskCount,
                        completed: buildInfo.completedTaskCount,
                        guideCount: buildInfo.guideCount,
                      } : null}
                      notes={r.notes ?? null}
                      isBusy={isBusy}
                      canStart={canStart}
                      onStartBuilding={() => handleStartBuilding(r.id)}
                      onOpenFunnel={() => openFunnel(r.funnel_id)}
                      onEdit={() => setEditRouteId(r.id)}
                      onDelete={() => setDeleteTarget({
                        id: r.id,
                        label: `${systemLabel} → ${targetLabel}`,
                        hasFunnel: !!r.funnel_id,
                      })}
                      onAddAdditional={(routeId, channelId) => routeChannels.addChannel(routeId, channelId, false)}
                      onRemoveChannel={(rowId) => routeChannels.removeChannel(rowId)}
                      onSetPrimary={(routeId, channelId) => routeChannels.setPrimary(routeId, channelId)}
                    />
                  );
                })}
              </div>
            )
          )}
      </PageBody>


      <AddRouteWizard
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) { setPreselectedSystemId(null); setPreselectedOfferId(null); }
        }}
        offers={offers}
        relationships={[]}
        existingRoutes={routes}
        workspaceFunnels={workspaceFunnels}
        preselectedSystemId={preselectedSystemId}
        preselectedOfferId={preselectedOfferId}
        onCreate={async (payload) => await add(payload)}
        onCreated={async (newRouteId) => {
          await routeChannels.fetchAndMerge(newRouteId);
          await reloadRoutes();
        }}
      />

      <EditRouteDialog
        open={!!editRouteId}
        onOpenChange={(open) => { if (!open) setEditRouteId(null); }}
        route={editRouteId ? routes.find((r) => r.id === editRouteId) ?? null : null}
        offers={offers}
        relationships={[]}
        systems={systems}
        channels={channels}
        primary={editRouteId ? routeChannels.byRoute.get(editRouteId)?.primary ?? null : null}
        additional={editRouteId ? routeChannels.byRoute.get(editRouteId)?.additional ?? [] : []}
        workspaceFunnels={workspaceFunnels}
        funnelConnections={funnelConnHook.rows}
        onSaveCore={async (id, patch) => { await update(id, patch); await reloadRoutes(); }}
        onAddChannel={(routeId, channelId, isPrimary) => routeChannels.addChannel(routeId, channelId, isPrimary)}
        onRemoveChannel={(rowId) => routeChannels.removeChannel(rowId)}
        onSetPrimary={(routeId, channelId) => routeChannels.setPrimary(routeId, channelId)}
        onAddFunnelConnection={(src, tgt) => funnelConnHook.add(src, tgt)}
        onRemoveFunnelConnectionBetween={(src, tgt) => funnelConnHook.removeBetween(src, tgt)}
      />

      <DeleteRouteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        routeId={deleteTarget?.id ?? null}
        routeLabel={deleteTarget?.label ?? ""}
        hasFunnel={deleteTarget?.hasFunnel ?? false}
        onDeleted={() => { setDeleteTarget(null); void reloadRoutes(); void routeChannels.reload(); void funnelConnHook.reload(); }}
      />
    </div>
  );
};

export default GrowthArchitectureSection;
