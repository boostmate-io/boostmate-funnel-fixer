// =============================================================================
// GrowthArchitectureSection — V3 Blueprint section.
// Read-only Growth Map + Routes list with per-route channel management.
// =============================================================================

import { useMemo, useState } from "react";
import { Workflow, Plus, Trash2, Loader2, Map as MapIcon, List, Rocket, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { deriveRouteState, ROUTE_STATE_STYLES } from "@/lib/growth-architecture/deriveStatus";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import AddRouteDialog from "./AddRouteDialog";
import GrowthMap from "./GrowthMap";
import RouteChannelsManager from "./RouteChannelsManager";

interface Props {
  offers: EcosystemOfferRow[];
  saving?: boolean;
}

const GrowthArchitectureSection = ({ offers }: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { rows: routes, loading: loadingRoutes, add, remove, reload: reloadRoutes } = useGrowthArchitecture(activeSubAccountId ?? null);
  const { rows: relationships } = useOfferRelationships(activeSubAccountId ?? null);
  const { rows: channels } = useAcquisitionChannels();
  const { rows: systems } = useGrowthSystemsCatalog();
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);
  const routeChannels = useRouteChannels(routeIds);
  const funnelIds = useMemo(() => routes.map((r) => r.funnel_id), [routes]);
  const { byFunnel: buildProgress, reload: reloadProgress } = useRoutesBuildProgress(funnelIds);

  const [addOpen, setAddOpen] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const offerById = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers]);

  const openFunnelsModule = () => {
    window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "funnels" }));
  };

  const handleStartBuilding = async (routeId: string) => {
    setStartingId(routeId);
    try {
      const { data, error } = await supabase.functions.invoke("start-building-route", {
        body: { route_id: routeId },
      });
      if (error) throw error;
      if ((data as any)?.injection_warning === "ambiguous_entry") {
        toast.warning("Funnel created, but entry node was ambiguous — set one on the seed template.");
      } else {
        toast.success("Funnel created — opening Funnels…");
      }
      await Promise.all([reloadRoutes(), reloadProgress()]);
      openFunnelsModule();
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
              Read-only view. Dashed edges = planned routes. Solid = active. Primary channel shown; additional channels count in hover label.
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
                  const derived = deriveRouteState(r, relationships, bucket.primary?.channel_id ?? null);
                  return (
                    <div key={r.id} className="p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{sys?.label ?? "System"}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className={`text-[10px] ${ROUTE_STATE_STYLES[derived.state]}`} variant="secondary">
                                  {derived.label}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{derived.reason}</TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {src ? src.name : "External acquisition"} <span className="mx-1">→</span> {tgt?.name ?? "Unknown offer"}
                          </div>
                          {r.notes && <div className="text-[11px] text-muted-foreground mt-1 italic">{r.notes}</div>}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(r.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <RouteChannelsManager
                        routeId={r.id}
                        channels={channels}
                        primary={bucket.primary}
                        additional={bucket.additional}
                        onAddAdditional={(routeId, channelId) => routeChannels.addChannel(routeId, channelId, false)}
                        onRemove={(rowId) => routeChannels.removeChannel(rowId)}
                        onSetPrimary={(routeId, channelId) => routeChannels.setPrimary(routeId, channelId)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddRouteDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        offers={offers}
        relationships={relationships}
        onCreate={async (payload) => await add(payload)}
        onCreated={() => { void reloadRoutes(); void routeChannels.reload(); }}
      />
    </div>
  );
};

export default GrowthArchitectureSection;
