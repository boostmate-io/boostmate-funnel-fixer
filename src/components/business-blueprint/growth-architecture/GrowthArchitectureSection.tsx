// =============================================================================
// GrowthArchitectureSection — V3/V5 Blueprint section.
// Read-only Growth Map + Routes list (RouteCard) with per-route channel management.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Workflow, Plus, Loader2, Map as MapIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useGrowthArchitecture,
  useOfferRelationships,
  useAcquisitionChannels,
  useGrowthSystemsCatalog,
  useRouteChannels,
  useRoutesBuildProgress,
} from "@/lib/growth-architecture/hooks";
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

const GrowthArchitectureSection = ({ offers }: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { rows: routes, loading: loadingRoutes, add, update, reload: reloadRoutes } = useGrowthArchitecture(activeSubAccountId ?? null);
  const { rows: relationships } = useOfferRelationships(activeSubAccountId ?? null);
  const { rows: channels } = useAcquisitionChannels();
  const { rows: systems } = useGrowthSystemsCatalog();
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);
  const routeChannels = useRouteChannels(routeIds);
  const funnelIds = useMemo(() => routes.map((r) => r.funnel_id), [routes]);
  const { byFunnel: buildProgress, reload: reloadProgress } = useRoutesBuildProgress(funnelIds);

  // Lightweight funnel-name lookup for RouteCard display.
  const [funnelNames, setFunnelNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const ids = funnelIds.filter((v): v is string => !!v);
    if (ids.length === 0) { setFunnelNames(new Map()); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("funnels").select("id,name").in("id", ids);
      if (cancelled || error || !data) return;
      setFunnelNames(new Map(data.map((f: any) => [f.id as string, (f.name as string) ?? ""])));
    })();
    return () => { cancelled = true; };
  }, [funnelIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openFunnel = (funnelId: string | null) => {
    window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "funnels" }));
    if (funnelId) {
      // Fire on next tick so FunnelModule has mounted and its listener is live.
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("boostmate:open-funnel", { detail: { funnelId } }),
        );
      }, 50);
    }
  };

  const handleStartBuilding = async (routeId: string) => {
    setStartingId(routeId);
    try {
      const { data, error } = await supabase.functions.invoke("start-building-route", {
        body: { route_id: routeId },
      });
      if (error) throw error;
      const funnelId = (data as any)?.funnel_id as string | undefined;
      toast.success("Funnel created — opening Funnel Builder…");
      await Promise.all([reloadRoutes(), reloadProgress()]);
      openFunnel(funnelId ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start building");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Workflow className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-display font-bold text-foreground">Growth Architecture</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              How buyers actually flow through your business — from acquisition to ascension.
              Each route connects a growth system to a target offer, and can use one primary
              acquisition channel plus additional supporting channels.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Add Route
          </Button>
        </div>

        <Tabs defaultValue="map">
          <TabsList>
            <TabsTrigger value="map" className="gap-1.5"><MapIcon className="w-4 h-4" /> Growth Map</TabsTrigger>
            <TabsTrigger value="routes" className="gap-1.5"><List className="w-4 h-4" /> Routes ({routes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <GrowthMap
              offers={offers}
              relationships={relationships}
              routes={routes}
              channels={channels}
              systems={systems}
              routeChannelsByRoute={routeChannels.byRoute}
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Read-only view. Dashed edges = planned routes. Solid = active. Only route-participating
              offers appear on the graph; unrouted offers are listed below.
            </p>
          </TabsContent>

          <TabsContent value="routes" className="mt-4">
            {loadingRoutes ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : routes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No routes yet. Add your first growth route to describe how customers reach your offers.
                </p>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Add Route
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {routes.map((r) => {
                  const sys = systems.find((s) => s.id === r.system_catalog_id);
                  const src = r.source_offer_id ? offerById.get(r.source_offer_id) : null;
                  const tgt = offerById.get(r.target_offer_id);
                  const bucket = routeChannels.byRoute.get(r.id) ?? { primary: null, additional: [] };
                  const buildInfo = r.funnel_id ? buildProgress.get(r.funnel_id) : undefined;
                  const derived = deriveRouteState(r, relationships, bucket.primary?.channel_id ?? null, buildInfo);
                  const canStart = derived.state === "ready_to_build";
                  const isBusy = startingId === r.id;
                  const systemLabel = sys?.label ?? "System";
                  const targetLabel = tgt?.name ?? "Unknown offer";
                  const sourceLabel = src ? src.name : "External acquisition";

                  return (
                    <RouteCard
                      key={r.id}
                      routeId={r.id}
                      systemLabel={systemLabel}
                      sourceLabel={sourceLabel}
                      targetLabel={targetLabel}
                      derived={derived}
                      primary={bucket.primary}
                      additional={bucket.additional}
                      channels={channels}
                      funnelName={r.funnel_id ? funnelNames.get(r.funnel_id) ?? null : null}
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
                      onOpenFunnel={openFunnelsModule}
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
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddRouteWizard
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) { setPreselectedSystemId(null); setPreselectedOfferId(null); }
        }}
        offers={offers}
        relationships={relationships}
        existingRoutes={routes}
        preselectedSystemId={preselectedSystemId}
        preselectedOfferId={preselectedOfferId}
        onCreate={async (payload) => await add(payload)}
        onCreated={async (newRouteId) => {
          // Fetch the new route's channels directly (routeIds state hasn't
          // flushed yet, so a generic reload would miss them), then refresh
          // routes so derived state + map pick everything up.
          await routeChannels.fetchAndMerge(newRouteId);
          await reloadRoutes();
        }}
      />

      <EditRouteDialog
        open={!!editRouteId}
        onOpenChange={(open) => { if (!open) setEditRouteId(null); }}
        route={editRouteId ? routes.find((r) => r.id === editRouteId) ?? null : null}
        offers={offers}
        relationships={relationships}
        systems={systems}
        channels={channels}
        primary={editRouteId ? routeChannels.byRoute.get(editRouteId)?.primary ?? null : null}
        additional={editRouteId ? routeChannels.byRoute.get(editRouteId)?.additional ?? [] : []}
        onSaveCore={async (id, patch) => { await update(id, patch); await reloadRoutes(); }}
        onAddChannel={(routeId, channelId, isPrimary) => routeChannels.addChannel(routeId, channelId, isPrimary)}
        onRemoveChannel={(rowId) => routeChannels.removeChannel(rowId)}
        onSetPrimary={(routeId, channelId) => routeChannels.setPrimary(routeId, channelId)}
      />

      <DeleteRouteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        routeId={deleteTarget?.id ?? null}
        routeLabel={deleteTarget?.label ?? ""}
        hasFunnel={deleteTarget?.hasFunnel ?? false}
        onDeleted={() => { setDeleteTarget(null); void reloadRoutes(); void routeChannels.reload(); }}
      />
    </div>
  );
};

export default GrowthArchitectureSection;
