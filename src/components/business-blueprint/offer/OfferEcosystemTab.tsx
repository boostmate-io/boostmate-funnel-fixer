// =============================================================================
// OfferEcosystemTab — Tab 4 (redesigned)
// Each card uses the same structure: Name, Price, Description, Core Outcome,
// Delivery Type. Primary purpose removed.
// =============================================================================

import { useEffect, useState } from "react";
import {
  Network, Sparkles, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SectionShell from "./SectionShell";
import SectionHelpCoach from "../SectionHelpCoach";
import CoreOfferDialog from "./CoreOfferDialog";
import TierOfferDialog from "./TierOfferDialog";
import OfferSummaryCard from "./OfferSummaryCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { designForRow, designToRowValues } from "@/lib/offers/offerRepository";

/** Non-Core categories already served by the Universal Offer Editor. */
const UNIVERSAL_EDITOR_TIERS: EcosystemTier[] = ["free", "low_ticket", "mid_ticket", "premium", "continuity"];
import type { OfferSaveStatus } from "./OfferEditorShell";


interface Props {
  blueprintId: string | null;
  offerDesign: OfferDesignData;
  onChangeOfferDesign?: (patch: Partial<OfferDesignData>) => void;
  saving: boolean;
  primarySaveStatus?: OfferSaveStatus;
  flushPrimary?: () => Promise<boolean>;
  businessType?: string;
  pendingOpenOfferId?: string | null;
  onOpenedOffer?: () => void;
}

const numberOrEmpty = (raw: string): number | "" => {
  if (raw.trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "";
};

// Existing per-offer fields (unchanged) — now shown in a dialog instead of inline.
const OfferFieldsEditor = ({
  offer,
  onUpdate,
  cur,
  openCoach,
  tierLabel,
}: {
  offer: EcosystemOfferRow;
  onUpdate: (patch: Partial<Pick<EcosystemOfferRow, "name" | "data">>) => void;
  cur: string;
  openCoach: (spec: OfferCoachSpec) => void;
  tierLabel: string;
}) => {
  const coachId = (field: string) => `offer_stack.ecosystem.${offer.id}.${field}`;
  const canCoach = true;
  const isCore = false;
  return (
    <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">Offer Name</Label>
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
            </div>
            <Input
              value={offer.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Offer name"
              className="h-9 font-medium text-sm"
              disabled={isCore}
            />
          </div>
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
  );
};

const OfferEcosystemTab = ({ blueprintId, offerDesign, onChangeOfferDesign, saving, primarySaveStatus, flushPrimary, businessType, pendingOpenOfferId, onOpenedOffer }: Props) => {
  const { symbol: cur } = useCurrency();
  const bt = getBusinessType(businessType);
  const { offers, addOffer, updateOffer, deleteOffer, tierCounts, flushOffer, applyCoachWrites, saveStatuses } = useEcosystemOffers({ blueprintId });
  const [coachRevision, setCoachRevision] = useState(0);
  const progress = calcEcosystemProgress(tierCounts);
  const { openCoach, openListCoach, panel } = useOfferCoach(() => ({ offer_ecosystem: offers }));

  const appendEcosystemOffer = async (tier: EcosystemTier, item: Record<string, string>) => {
    const id = await addOffer(tier);
    if (!id) return;
    await updateOffer(id, {
      name: (item.name ?? "Untitled Offer").trim() || "Untitled Offer",
      data: {
        description: (item.description ?? "").trim(),
        core_outcome: (item.core_outcome ?? "").trim(),
      } as any,
    });
  };

  const [editing, setEditing] = useState<{ id: string; isPrimary: boolean } | null>(null);
  const [editingSimpleId, setEditingSimpleId] = useState<string | null>(null);
  const editingSimple = offers.find((o) => o.id === editingSimpleId) ?? null;
  const [editingTier, setEditingTier] = useState<{ id: string; initial: OfferDesignData } | null>(null);
  const editingTierRow = editingTier ? offers.find((o) => o.id === editingTier.id) ?? null : null;

  /** Open the existing editor that fits this offer (Core dialog vs. field dialog). */
  const openEditor = (offer: EcosystemOfferRow) => {
    if (offer.tier === "core") setEditing({ id: offer.id, isPrimary: offer.source === "blueprint_core" });
    // Seeded in memory from the summary when no design exists — no write on open.
    else if (UNIVERSAL_EDITOR_TIERS.includes(offer.tier)) setEditingTier({ id: offer.id, initial: designForRow(offer) });
    else setEditingSimpleId(offer.id);
  };

  const handleAddSimple = async (tier: EcosystemTier) => {
    const id = await addOffer(tier);
    if (!id) return;
    if (UNIVERSAL_EDITOR_TIERS.includes(tier)) setEditingTier({ id, initial: designForRow({ name: "Untitled Offer", data: {} as any, tier }) });
    else setEditingSimpleId(id);
  };

  // Deep-link: open a specific offer's editor once the row is available in state
  useEffect(() => {
    if (!pendingOpenOfferId) return;
    const row = offers.find((o) => o.id === pendingOpenOfferId);
    if (!row) return;
    openEditor(row);
    onOpenedOffer?.();
  }, [pendingOpenOfferId, offers, onOpenedOffer]);

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
      void updateOffer(editing.id, designToRowValues(next, row as any) as any);
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
      progress={progress}
      saving={saving}
      helpButton={<>
          <SectionHelpCoach sectionId="offer_design.ecosystem" sectionLabel="Offer Design — Ecosystem" />
          <SectionHelpCoach variant="walkthrough" sectionId="offer_design.ecosystem" sectionLabel="Offer Design — Ecosystem" />
        </>}
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        openListCoach({
                          id: `ecosystem_${tier.id}`,
                          label: `${tier.label} — Ideas`,
                          helper: `${tier.description} ${tier.examples}`,
                          basePath: `offer_ecosystem.${tier.id}`,
                          itemFields: [
                            { key: "name", label: "Offer Name", kind: "text", helper: "Short, evocative offer name." },
                            { key: "description", label: "Description", kind: "textarea", helper: "What this offer is in 1–2 sentences." },
                            { key: "core_outcome", label: "Core Outcome", kind: "text", helper: "What the buyer walks away with." },
                          ],
                          currentCount: tierOffers.length,
                          suggestedCount: [2, 3],
                          appendItem: (item) => appendEcosystemOffer(tier.id, item),
                        })
                      }
                      disabled={!blueprintId}
                      className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Coach
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSimple(tier.id)}
                      className="gap-1.5 h-8"
                      disabled={!blueprintId}
                    >
                      {tier.addLabel}
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-4">
                {tierOffers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">{tier.emptyHint}</p>
                    {!isCoreSection && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          openListCoach({
                            id: `ecosystem_${tier.id}`,
                            label: `${tier.label} — Ideas`,
                            helper: `${tier.description} ${tier.examples}`,
                            basePath: `offer_ecosystem.${tier.id}`,
                            itemFields: [
                              { key: "name", label: "Offer Name", kind: "text" },
                              { key: "description", label: "Description", kind: "textarea" },
                              { key: "core_outcome", label: "Core Outcome", kind: "text" },
                            ],
                            currentCount: 0,
                            suggestedCount: [2, 3],
                            appendItem: (item) => appendEcosystemOffer(tier.id, item),
                          })
                        }
                        className="gap-1.5 text-primary hover:bg-primary/5"
                        disabled={!blueprintId}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Ask Coach for Ideas
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tierOffers.map((offer) => (
                      <OfferSummaryCard
                        key={offer.id}
                        offer={offer}
                        cur={cur}
                        onEdit={() => openEditor(offer)}
                        onDelete={() => deleteOffer(offer.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!editingSimple}
        onOpenChange={(o) => {
          if (!o) {
            if (editingSimpleId) void flushOffer(editingSimpleId);
            setEditingSimpleId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display">
              {ECOSYSTEM_TIERS.find((t) => t.id === editingSimple?.tier)?.label ?? "Offer"} — Edit Offer
            </DialogTitle>
          </DialogHeader>
          {editingSimple && (
            <OfferFieldsEditor
              offer={editingSimple}
              cur={cur}
              onUpdate={(patch) => updateOffer(editingSimple.id, patch)}
              openCoach={openCoach}
              tierLabel={ECOSYSTEM_TIERS.find((t) => t.id === editingSimple.tier)?.label ?? ""}
            />
          )}
          <DialogFooter>
            <Button onClick={() => {
              if (editingSimpleId) void flushOffer(editingSimpleId);
              setEditingSimpleId(null);
            }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingTier && editingTierRow && (
        <TierOfferDialog
          open
          onOpenChange={(o) => { if (!o) setEditingTier(null); }}
          tier={editingTierRow.tier}
          categoryLabel={ECOSYSTEM_TIERS.find((t) => t.id === editingTierRow.tier)?.label ?? "Offer"}
          offerId={editingTierRow.id}
          initial={editingTier.initial}
          onChange={(next) => {
            const row = offers.find((o) => o.id === editingTier.id);
            // Design is the source of truth; summary fields are derived from it.
            if (row) void updateOffer(row.id, designToRowValues(next, row as any, "Untitled Offer", row.tier) as any);
          }}
          saveStatus={saveStatuses[editingTierRow.id] ?? "saved"}
          flushChanges={() => flushOffer(editingTierRow.id)}
          businessType={businessType}
        />
      )}

      <CoreOfferDialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
          }
        }}
        title={dialogTitle}
        offerId={editing?.id}
        isPrimary={editing?.isPrimary}
        saveStatus={editing?.isPrimary ? primarySaveStatus : saveStatuses[editing?.id ?? ""] ?? "saved"}
        flushChanges={editing?.isPrimary ? flushPrimary : editing ? () => flushOffer(editing.id) : undefined}
        initial={dialogInitial}
        onChange={handleDialogChange}
        scopedOffer={
          editing && !editing.isPrimary
            ? {
                id: editing.id,
                name: offers.find((o) => o.id === editing.id)?.name ?? "",
                persistWrites: async (writes) => {
                  const offerId = editing.id;
                  const res = await applyCoachWrites(offerId, writes);
                  if (res.appliedPaths.length) setCoachRevision((r) => r + 1);
                  return res;
                },
              }
            : null
        }
        externalRevision={coachRevision}
        saving={saving}
        businessType={businessType}
      />
      {panel}
    </SectionShell>
  );
};

export default OfferEcosystemTab;
