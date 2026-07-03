// =============================================================================
// OfferEcosystemTab — Tab 4 (redesigned)
// Each card uses the same structure: Name, Price, Description, Core Outcome,
// Delivery Type. Primary purpose removed.
// =============================================================================

import { useState } from "react";
import {
  Network, Trash2, Sparkles, Lock, Pencil, ChevronDown, ChevronRight, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SectionShell from "./SectionShell";
import CoreOfferDialog from "./CoreOfferDialog";
import { useCurrency } from "@/hooks/useCurrency";
import DeliveryTypePicker from "./DeliveryTypePicker";
import CoachIconButton from "./CoachIconButton";
import { useOfferCoach, type OfferCoachSpec } from "./useOfferCoach";
import {
  ECOSYSTEM_TIERS,
  calcEcosystemProgress,
  emptyOfferDesign,
  type EcosystemTier,
  type OfferDesignData,
} from "../offerDesignTypes";
import { useEcosystemOffers, type EcosystemOfferRow } from "../useEcosystemOffers";
import { getBusinessType } from "../businessTypes";

interface Props {
  blueprintId: string | null;
  offerDesign: OfferDesignData;
  onChangeOfferDesign?: (patch: Partial<OfferDesignData>) => void;
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
  cur,
  openCoach,
  tierLabel,
}: {
  offer: EcosystemOfferRow;
  onUpdate: (patch: Partial<Pick<EcosystemOfferRow, "name" | "data">>) => void;
  onDelete: () => void;
  isCore: boolean;
  cur: string;
  openCoach: (spec: OfferCoachSpec) => void;
  tierLabel: string;
}) => {
  const [open, setOpen] = useState(false);
  const coachId = (field: string) => `offer_stack.ecosystem.${offer.id}.${field}`;
  const canCoach = !isCore;

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
        {canCoach && (
          <CoachIconButton
            compact
            onClick={() =>
              openCoach({
                id: coachId("name"),
                label: `${tierLabel} — Offer Name`,
                helper: "Short, evocative name for this offer.",
                currentValue: offer.name ?? "",
                apply: (v) => onUpdate({ name: v }),
              })
            }
          />
        )}
        {typeof offer.data?.price === "number" && offer.data.price > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
            {cur}{offer.data.price.toLocaleString()}
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
              <span className="text-sm text-muted-foreground">{cur}</span>
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
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">Description</Label>
              {canCoach && (
                <CoachIconButton
                  compact
                  onClick={() =>
                    openCoach({
                      id: coachId("description"),
                      label: `${tierLabel} — Description`,
                      helper: "What this offer is in 1–2 sentences.",
                      currentValue: offer.data?.description ?? "",
                      apply: (v) => onUpdate({ data: { ...offer.data, description: v } }),
                    })
                  }
                />
              )}
            </div>
            <AutoTextarea
              value={offer.data?.description ?? ""}
              onChange={(e) => onUpdate({ data: { ...offer.data, description: e.target.value } })}
              placeholder="What this offer is in 1–2 sentences…"
              rows={2}
              className="resize-none text-sm"
              disabled={isCore}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">Core Outcome</Label>
              {canCoach && (
                <CoachIconButton
                  compact
                  onClick={() =>
                    openCoach({
                      id: coachId("core_outcome"),
                      label: `${tierLabel} — Core Outcome`,
                      helper: "What the buyer walks away with.",
                      currentValue: offer.data?.core_outcome ?? "",
                      apply: (v) => onUpdate({ data: { ...offer.data, core_outcome: v } }),
                    })
                  }
                />
              )}
            </div>
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

const OfferEcosystemTab = ({ blueprintId, offerDesign, onChangeOfferDesign, saving, businessType }: Props) => {
  const { symbol: cur } = useCurrency();
  const bt = getBusinessType(businessType);
  const { offers, addOffer, updateOffer, deleteOffer, tierCounts } = useEcosystemOffers({
    blueprintId,
    offerDesign,
  });
  const progress = calcEcosystemProgress(tierCounts);
  const { openCoach, panel } = useOfferCoach(() => ({ offer_ecosystem: offers }));

  const [editing, setEditing] = useState<{ id: string; isPrimary: boolean } | null>(null);

  const handleGenerateIdeas = (tier: EcosystemTier) => {
    toast.info(`Generate ${tier.replace("_", " ")} ideas — AI coming soon`);
  };

  const handleAddCore = async () => {
    const id = await addOffer("core");
    if (id) {
      // Seed an empty design snapshot
      await updateOffer(id, {
        name: "New Core Offer",
        data: { design: emptyOfferDesign() } as any,
      });
      setEditing({ id, isPrimary: false });
    }
  };

  // Build initial OfferDesignData for the dialog
  const dialogInitial = (() => {
    if (!editing) return emptyOfferDesign();
    if (editing.isPrimary) return offerDesign;
    const row = offers.find((o) => o.id === editing.id);
    const stored = (row?.data as any)?.design as OfferDesignData | undefined;
    return stored ?? emptyOfferDesign();
  })();

  const handleDialogChange = (next: OfferDesignData) => {
    if (!editing) return;
    if (editing.isPrimary) {
      // Update the blueprint — this auto-syncs to the primary core offer row.
      onChangeOfferDesign?.(next);
    } else {
      // Keep all 3-tab fields inside the offer row's data.design.
      const row = offers.find((o) => o.id === editing.id);
      if (!row) return;
      const name = next.angle.main_offer_name?.trim() || row.name || "Untitled Core Offer";
      const description = next.angle.short_description?.trim() || "";
      const coreOutcome = next.angle.core_outcome?.trim() || "";
      const price = next.pricing.core_price;
      const deliveryTypes = Array.from(new Set([
        ...(next.stack.deliverables ?? []).flatMap((d) => d.delivery_types ?? []),
        ...(next.stack.support_channels ?? []).map((s) => s.name).filter(Boolean),
      ]));
      void updateOffer(editing.id, {
        name,
        data: {
          ...(row.data as any),
          description,
          core_outcome: coreOutcome,
          price: typeof price === "number" ? price : "",
          delivery_types: deliveryTypes,
          design: next,
        } as any,
      });
    }
  };

  const dialogTitle = (() => {
    if (!editing) return "";
    if (editing.isPrimary) return "Edit Primary Core Offer";
    const row = offers.find((o) => o.id === editing.id);
    return row?.name || "Edit Core Offer";
  })();

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
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 italic">{tier.examples}</p>
                </div>
                {isCoreSection ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddCore}
                    className="gap-1.5 h-8 shrink-0"
                    disabled={!blueprintId}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Core Offer
                  </Button>
                ) : (
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
                ) : isCoreSection ? (
                  tierOffers.map((offer) => {
                    const isPrimary = offer.source === "blueprint_core";
                    return (
                      <div
                        key={offer.id}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{offer.name}</span>
                            {typeof offer.data?.price === "number" && offer.data.price > 0 && (
                              <Badge variant="secondary" className="text-xs tabular-nums">
                                {cur}{offer.data.price.toLocaleString()}
                              </Badge>
                            )}
                            {isPrimary && (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Lock className="w-3 h-3" />
                                Primary (synced with tabs)
                              </Badge>
                            )}
                          </div>
                          {offer.data?.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{offer.data.description}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 shrink-0"
                          onClick={() => setEditing({ id: offer.id, isPrimary })}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        {!isPrimary && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteOffer(offer.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  tierOffers.map((offer) => (
                    <OfferCardRow
                      key={offer.id}
                      offer={offer}
                      isCore={false}
                      cur={cur}
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

      <CoreOfferDialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        title={dialogTitle}
        initial={dialogInitial}
        onChange={handleDialogChange}
        saving={saving}
        businessType={businessType}
      />
    </SectionShell>
  );
};

export default OfferEcosystemTab;
