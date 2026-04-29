// =============================================================================
// FunnelArchitectureTab — Tab 2: map each offer to its selling funnel.
// =============================================================================

import { Plus, Trash2, Workflow, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FUNNEL_TYPES,
  getFunnelTypeLabel,
  type FunnelMappingRow,
} from "../growthSystemTypes";
import type { EcosystemOfferRow } from "../useEcosystemOffers";

interface Props {
  mappings: FunnelMappingRow[];
  offers: EcosystemOfferRow[];
  trafficSources: string[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<FunnelMappingRow>) => void;
  onDelete: (id: string) => void;
}

const TIER_ORDER: Record<string, number> = {
  free: 1,
  low_ticket: 2,
  mid_ticket: 3,
  core: 4,
  premium: 5,
  continuity: 6,
};

const FunnelArchitectureTab = ({
  mappings,
  offers,
  trafficSources,
  onAdd,
  onUpdate,
  onDelete,
}: Props) => {
  const sortedOffers = [...offers].sort(
    (a, b) => (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99),
  );

  const offerName = (id?: string | null) =>
    sortedOffers.find((o) => o.id === id)?.name || "—";

  // Build flow for preview (only valid mappings)
  const flowItems = mappings
    .filter((m) => m.offer_id)
    .map((m) => ({
      offerName: offerName(m.offer_id),
      funnelLabel: getFunnelTypeLabel(m.funnel_type),
      nextOfferName: m.next_offer_id ? offerName(m.next_offer_id) : null,
    }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-display font-bold text-foreground">Offer ↔ Funnel Mappings</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Define which funnel sells each of your offers. Used later by the Funnel Builder.
          </p>
        </div>
        <Button onClick={onAdd} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Mapping
        </Button>
      </div>

      {offers.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No offers yet. Build your offers first in{" "}
            <span className="font-medium text-foreground">Offer Design → Ecosystem</span>.
          </p>
        </div>
      )}

      {mappings.length === 0 && offers.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No funnel mappings yet. Click <span className="font-medium text-foreground">Add Mapping</span> to start.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {mappings.map((m, idx) => (
          <div
            key={m.id}
            className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mapping #{idx + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(m.id)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Offer */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  Offer
                </label>
                <Select
                  value={m.offer_id || ""}
                  onValueChange={(v) => onUpdate(m.id, { offer_id: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an offer" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedOffers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="text-xs uppercase text-muted-foreground mr-2">
                          {o.tier.replace("_", " ")}
                        </span>
                        {o.name || "Untitled"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Funnel Type */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  Funnel Type
                </label>
                <Select
                  value={m.funnel_type}
                  onValueChange={(v) => onUpdate(m.id, { funnel_type: v as FunnelMappingRow["funnel_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNNEL_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Why this funnel */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Why this funnel exists
              </label>
              <Textarea
                value={m.purpose}
                onChange={(e) => onUpdate(m.id, { purpose: e.target.value })}
                placeholder="e.g. Convert cold traffic into buyers before pitching the core offer."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Traffic Sources feeding this funnel */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Traffic Sources Feeding This Funnel
              </label>
              {trafficSources.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Add traffic sources in the Acquisition tab first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {trafficSources.map((src) => {
                    const active = m.traffic_sources.includes(src);
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? m.traffic_sources.filter((s) => s !== src)
                            : [...m.traffic_sources, src];
                          onUpdate(m.id, { traffic_sources: next });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {src}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next Offer */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Next Offer This Funnel Feeds Into <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Select
                value={m.next_offer_id || "_none"}
                onValueChange={(v) => onUpdate(m.id, { next_offer_id: v === "_none" ? null : v })}
              >
                <SelectTrigger className="md:max-w-md">
                  <SelectValue placeholder="No next offer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No next offer</SelectItem>
                  {sortedOffers
                    .filter((o) => o.id !== m.offer_id)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name || "Untitled"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Funnel Flow */}
      {flowItems.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Workflow className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wide text-primary">
              Visual Funnel Flow
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            {flowItems.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-full max-w-md">
                <div className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
                  {item.offerName}
                </div>
                <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs">
                  {item.funnelLabel}
                </div>
                {item.nextOfferName && (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
                      {item.nextOfferName}
                    </div>
                  </>
                )}
                {i < flowItems.length - 1 && (
                  <div className="h-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FunnelArchitectureTab;
