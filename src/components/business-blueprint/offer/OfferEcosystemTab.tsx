// =============================================================================
// OfferEcosystemTab — Tab 4 (redesigned)
// Each card uses the same structure: Name, Price, Description, Core Outcome,
// Delivery Type. Primary purpose removed.
// =============================================================================

import { useState } from "react";
import {
  Network, Trash2, Sparkles, Lock, Pencil, ChevronDown, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SectionShell from "./SectionShell";
import DeliveryTypePicker from "./DeliveryTypePicker";
import {
  ECOSYSTEM_TIERS,
  calcEcosystemProgress,
  type EcosystemTier,
  type OfferDesignData,
} from "../offerDesignTypes";
import { useEcosystemOffers, type EcosystemOfferRow } from "../useEcosystemOffers";
import { getBusinessType } from "../businessTypes";

interface Props {
  blueprintId: string | null;
  offerDesign: OfferDesignData;
  saving: boolean;
  businessType?: string;
}

const numberOrEmpty = (raw: string): number | "" => {
  if (raw.trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "";
};

const OfferCardRow = ({
  offer,
  onUpdate,
  onDelete,
  isCore,
}: {
  offer: EcosystemOfferRow;
  onUpdate: (patch: Partial<Pick<EcosystemOfferRow, "name" | "data">>) => void;
  onDelete: () => void;
  isCore: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground p-0.5"
          aria-label="Toggle details"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <Input
          value={offer.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Offer name"
          className="h-9 font-medium border-0 bg-transparent px-2 focus-visible:ring-1"
          disabled={isCore}
        />
        {typeof offer.data?.price === "number" && offer.data.price > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
            €{offer.data.price.toLocaleString()}
          </Badge>
        )}
        {isCore ? (
          <Badge variant="outline" className="gap-1 text-[10px] shrink-0">
            <Lock className="w-3 h-3" />
            Auto-synced
          </Badge>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
          {isCore && (
            <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
              <Pencil className="w-3 h-3" />
              Core offer is auto-generated from tabs 1–3. Edit those tabs to update it.
            </p>
          )}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price</Label>
            <div className="flex items-center gap-1 max-w-xs">
              <span className="text-sm text-muted-foreground">€</span>
              <Input
                type="number"
                inputMode="decimal"
                value={offer.data?.price === "" || offer.data?.price === undefined ? "" : offer.data.price}
                onChange={(e) => onUpdate({ data: { ...offer.data, price: numberOrEmpty(e.target.value) } })}
                placeholder="0"
                className="h-9 text-sm"
                disabled={isCore}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label>
            <Textarea
              value={offer.data?.description ?? ""}
              onChange={(e) => onUpdate({ data: { ...offer.data, description: e.target.value } })}
              placeholder="What this offer is in 1–2 sentences…"
              rows={2}
              className="resize-none text-sm"
              disabled={isCore}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Core Outcome</Label>
            <Input
              value={offer.data?.core_outcome ?? ""}
              onChange={(e) => onUpdate({ data: { ...offer.data, core_outcome: e.target.value } })}
              placeholder="What the buyer walks away with"
              className="h-9 text-sm"
              disabled={isCore}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Delivery Type</Label>
            <DeliveryTypePicker
              value={offer.data?.delivery_types ?? []}
              onChange={(v) => onUpdate({ data: { ...offer.data, delivery_types: v } })}
              placeholder="How is it delivered?"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const OfferEcosystemTab = ({ blueprintId, offerDesign, saving, businessType }: Props) => {
  const bt = getBusinessType(businessType);
  const { offers, addOffer, updateOffer, deleteOffer, tierCounts } = useEcosystemOffers({
    blueprintId,
    offerDesign,
  });
  const progress = calcEcosystemProgress(tierCounts);

  const handleGenerateIdeas = (tier: EcosystemTier) => {
    toast.info(`Generate ${tier.replace("_", " ")} ideas — AI coming soon`);
  };

  const feedback =
    progress >= 100
      ? "Complete value ladder — your LTV will compound."
      : progress >= 80
      ? "Strong ladder. You've built a real ascension path."
      : progress >= 50
      ? "Nice baseline. Keep mapping each step of the ladder."
      : null;

  return (
    <SectionShell
      icon={Network}
      title="Offer Ecosystem"
      description="Build your full monetization ecosystem — from free entry to premium retention."
      insight="Most buyers aren't ready for the core offer immediately. A clear ladder lets them ascend at their pace and lifts your LTV dramatically."
      progress={progress}
      saving={saving}
      feedback={feedback}
    >
      <div className="space-y-5">
        {ECOSYSTEM_TIERS.map((tier) => {
          const tierOffers = offers.filter((o) => o.tier === tier.id);
          const isCoreSection = tier.id === "core";

          return (
            <div key={tier.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-display font-bold text-foreground">{tier.label}</h3>
                    {tierOffers.length > 0 && (
                      <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {tierOffers.length}
                      </span>
                    )}
                    {isCoreSection && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Lock className="w-3 h-3" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 italic">{tier.examples}</p>
                </div>
                {!isCoreSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addOffer(tier.id)}
                    className="gap-1.5 h-8 shrink-0"
                    disabled={!blueprintId}
                  >
                    {tier.addLabel}
                  </Button>
                )}
              </div>

              <div className="p-4 space-y-2">
                {tierOffers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">{tier.emptyHint}</p>
                    {!isCoreSection && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateIdeas(tier.id)}
                        className="gap-1.5 text-primary hover:bg-primary/5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Offer Ideas
                      </Button>
                    )}
                  </div>
                ) : (
                  tierOffers.map((offer) => (
                    <OfferCardRow
                      key={offer.id}
                      offer={offer}
                      isCore={offer.source === "blueprint_core"}
                      onUpdate={(patch) => updateOffer(offer.id, patch)}
                      onDelete={() => deleteOffer(offer.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
};

export default OfferEcosystemTab;
