// =============================================================================
// GrowthArchitectureSection — V3 Blueprint section.
// Combines: read-only Growth Map + routes list + Add Route.
// =============================================================================

import { useMemo, useState } from "react";
import { Workflow, Plus, Trash2, Loader2, Map as MapIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useGrowthArchitecture,
  useOfferRelationships,
  useAcquisitionChannels,
  useGrowthSystemsCatalog,
} from "@/lib/growth-architecture/hooks";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import AddRouteDialog from "./AddRouteDialog";
import GrowthMap from "./GrowthMap";

interface Props {
  offers: EcosystemOfferRow[];
  saving?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  retired: "bg-muted text-muted-foreground line-through",
};

const GrowthArchitectureSection = ({ offers }: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { rows: routes, loading: loadingRoutes, add, remove } = useGrowthArchitecture(activeSubAccountId ?? null);
  const { rows: relationships } = useOfferRelationships(activeSubAccountId ?? null);
  const { rows: channels } = useAcquisitionChannels();
  const { rows: systems } = useGrowthSystemsCatalog();

  const [addOpen, setAddOpen] = useState(false);

  const offerById = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers]);

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
              Routes connect a growth system to a specific target offer, either from another offer
              (an ascension path) or from an external channel.
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
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Read-only view. Dashed edges = planned routes. Solid = active.
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
                  const ch = r.acquisition_channel_id ? channels.find((c) => c.id === r.acquisition_channel_id) : null;
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{sys?.label ?? "System"}</span>
                          <Badge className={`text-[10px] ${STATUS_STYLES[r.status]}`} variant="secondary">
                            {r.status}
                          </Badge>
                          {ch && <Badge variant="outline" className="text-[10px]">{ch.label}</Badge>}
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
      />
    </div>
  );
};

export default GrowthArchitectureSection;
