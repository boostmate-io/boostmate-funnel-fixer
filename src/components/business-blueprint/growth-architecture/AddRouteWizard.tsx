// =============================================================================
// AddRouteWizard — V2.1 engine in the restored V5 shell.
//
// 4 steps: Target Offer → Traffic Sources → Growth System → Review.
// Traffic Sources is one unified picker:
//   - External Channels     → persisted in growth_architecture_channels
//   - Existing Built Funnels → persisted as pending_upstream_funnel_ids on the
//                              route (materialized into funnel_connections when
//                              Start Building creates the target funnel)
// The old Source (offer-relationships) step is removed entirely.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Check, Lock, Sparkles, Star, Workflow } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import {
  useAcquisitionChannels,
  useGrowthSystemsCatalog,
  type OfferRelationshipRow,
  type GrowthArchitectureRow,
  type GrowthArchStatus,
} from "@/lib/growth-architecture/hooks";
import type { WorkspaceFunnelRow } from "@/lib/growth-architecture/funnelConnections";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useCurrentGrowthStage,
  useIsAppAdmin,
} from "@/lib/growth-architecture/useGrowthAuxHooks";
import { rankSystemsForOffer, type SystemSuggestion } from "@/lib/growth-architecture/recommendations";

type StepId = 1 | 2 | 3 | 4;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[]; // kept for signature; not used
  existingRoutes: GrowthArchitectureRow[];
  workspaceFunnels: WorkspaceFunnelRow[];
  preselectedSystemId?: string | null;
  preselectedOfferId?: string | null;
  onCreate: (payload: {
    system_catalog_id: string;
    source_offer_id: string | null;
    target_offer_id: string;
    status: GrowthArchStatus;
    notes: string | null;
    pending_upstream_funnel_ids: string[];
  }) => Promise<string | null>;
  onCreated?: (newRouteId: string) => void | Promise<void>;
}

interface WizardState {
  targetOfferId: string | null;
  selectedChannelIds: string[];
  primaryChannelId: string | null;
  selectedFunnelIds: string[];
  systemId: string | null;
  notes: string;
}

const empty = (preselectOffer: string | null): WizardState => ({
  targetOfferId: preselectOffer,
  selectedChannelIds: [],
  primaryChannelId: null,
  selectedFunnelIds: [],
  systemId: null,
  notes: "",
});

const AddRouteWizard = ({
  open,
  onOpenChange,
  offers,
  existingRoutes,
  workspaceFunnels,
  preselectedSystemId,
  preselectedOfferId,
  onCreate,
  onCreated,
}: Props) => {
  const { rows: systems } = useGrowthSystemsCatalog();
  const { rows: channels } = useAcquisitionChannels();
  const { activeSubAccountId } = useWorkspace();
  const { stage } = useCurrentGrowthStage(activeSubAccountId);
  const { isAdmin } = useIsAppAdmin();

  const [state, setState] = useState<WizardState>(() => empty(preselectedOfferId ?? null));
  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setState(empty(preselectedOfferId ?? null));
      setStep(1);
    }
  }, [open, preselectedOfferId]);

  const patch = useCallback((p: Partial<WizardState>) => setState((s) => ({ ...s, ...p })), []);

  const targetOffer = useMemo(
    () => offers.find((o) => o.id === state.targetOfferId) ?? null,
    [offers, state.targetOfferId],
  );

  const systemSuggestions: SystemSuggestion[] = useMemo(
    () => rankSystemsForOffer(systems, targetOffer, stage, existingRoutes, null),
    [systems, targetOffer, stage, existingRoutes],
  );
  const selectableSystems = useMemo(
    () => systemSuggestions.filter((s) => s.compatible && (s.buildable || isAdmin)),
    [systemSuggestions, isAdmin],
  );

  // Only funnels that already exist (have been built) are pickable as upstream.
  const availableFunnels = useMemo(
    () => workspaceFunnels.filter((f) => f.status !== "archived"),
    [workspaceFunnels],
  );

  useEffect(() => {
    if (!open || !preselectedSystemId || state.systemId) return;
    if (targetOffer && selectableSystems.some((s) => s.system.id === preselectedSystemId)) {
      patch({ systemId: preselectedSystemId });
    }
  }, [open, preselectedSystemId, targetOffer, selectableSystems, state.systemId, patch]);

  // Auto-adjust primary when channel selection changes.
  useEffect(() => {
    if (state.selectedChannelIds.length === 0) {
      if (state.primaryChannelId !== null) patch({ primaryChannelId: null });
      return;
    }
    if (!state.primaryChannelId || !state.selectedChannelIds.includes(state.primaryChannelId)) {
      patch({ primaryChannelId: state.selectedChannelIds[0] });
    }
  }, [state.selectedChannelIds, state.primaryChannelId, patch]);

  const canGoNext = useMemo(() => {
    if (step === 1) return !!state.targetOfferId;
    if (step === 2) return state.selectedChannelIds.length > 0 || state.selectedFunnelIds.length > 0;
    if (step === 3) return !!state.systemId;
    return true;
  }, [step, state]);

  const canSave = useMemo(() => {
    if (!state.targetOfferId || !state.systemId) return false;
    if (state.selectedChannelIds.length === 0 && state.selectedFunnelIds.length === 0) return false;
    if (state.selectedChannelIds.length > 0 && !state.primaryChannelId) return false;
    return true;
  }, [state]);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const id = await onCreate({
        system_catalog_id: state.systemId!,
        source_offer_id: null,
        target_offer_id: state.targetOfferId!,
        status: "planned" as GrowthArchStatus,
        notes: state.notes.trim() ? state.notes.trim() : null,
        pending_upstream_funnel_ids: state.selectedFunnelIds,
      });
      if (!id) { setSaving(false); return; }

      // Persist channels
      const rows: any[] = [];
      state.selectedChannelIds.forEach((cid, i) => {
        rows.push({
          architecture_system_id: id,
          channel_id: cid,
          is_primary: cid === state.primaryChannelId,
          sort_order: i,
        });
      });
      if (rows.length > 0) {
        const { error } = await supabase.from("growth_architecture_channels").insert(rows);
        if (error) toast.error("Route created, but some channels could not be attached.");
      }
      await onCreated?.(id);
      onOpenChange(false);
      toast.success("Funnel added.");
    } finally {
      setSaving(false);
    }
  };

  const stepLabels: Record<StepId, string> = {
    1: "Target offer",
    2: "Traffic sources",
    3: "Growth system",
    4: "Review",
  };

  const advance = () => setStep(Math.min(4, (step + 1)) as StepId);
  const goBack = () => setStep(Math.max(1, (step - 1)) as StepId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Funnel</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {([1, 2, 3, 4] as StepId[]).map((s) => (
              <div
                key={s}
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s}. {stepLabels[s]}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          {step === 1 && (
            <Step1Target
              offers={offers}
              existingRoutes={existingRoutes}
              value={state.targetOfferId}
              onChange={(id) => patch({ targetOfferId: id, systemId: null })}
            />
          )}
          {step === 2 && (
            <Step2TrafficSources
              channels={channels}
              funnels={availableFunnels}
              selectedChannelIds={state.selectedChannelIds}
              primaryChannelId={state.primaryChannelId}
              selectedFunnelIds={state.selectedFunnelIds}
              onToggleChannel={(id) => patch({
                selectedChannelIds: state.selectedChannelIds.includes(id)
                  ? state.selectedChannelIds.filter((c) => c !== id)
                  : [...state.selectedChannelIds, id],
              })}
              onSetPrimary={(id) => patch({ primaryChannelId: id })}
              onToggleFunnel={(id) => patch({
                selectedFunnelIds: state.selectedFunnelIds.includes(id)
                  ? state.selectedFunnelIds.filter((f) => f !== id)
                  : [...state.selectedFunnelIds, id],
              })}
            />
          )}
          {step === 3 && (
            <Step3System
              suggestions={systemSuggestions}
              stage={stage}
              value={state.systemId}
              onChange={(id) => patch({ systemId: id })}
              isAdmin={isAdmin}
            />
          )}
          {step === 4 && (
            <Step4Review
              state={state}
              offers={offers}
              systems={systems}
              channels={channels}
              funnels={availableFunnels}
              onNotes={(v) => patch({ notes: v })}
              onJump={(s) => setStep(s)}
            />
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            {step < 4 ? (
              <Button size="sm" disabled={!canGoNext} onClick={advance}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" disabled={!canSave || saving} onClick={handleSave}>
                {saving ? "Adding…" : "Add Funnel"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Step 1 ----------------------------------------------------------
function Step1Target({ offers, existingRoutes, value, onChange }: {
  offers: EcosystemOfferRow[];
  existingRoutes: GrowthArchitectureRow[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  if (offers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Add at least one offer in Offer Ecosystem before adding a funnel.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">Which offer does this funnel sell?</Label>
        <p className="text-xs text-muted-foreground mt-1">The end destination — the offer customers reach through this funnel.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {offers.map((o) => {
          const routeCount = existingRoutes.filter((r) => r.target_offer_id === o.id).length;
          const selected = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {o.tier.replace("_", " ")}
                  </div>
                  <div className="text-sm font-semibold truncate">{o.name}</div>
                  {typeof o.data?.price === "number" && o.data.price > 0 && (
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      ${o.data.price.toLocaleString()}
                    </div>
                  )}
                </div>
                {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                {routeCount === 0 ? "No funnels yet" : `${routeCount} funnel${routeCount > 1 ? "s" : ""}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Step 2 ----------------------------------------------------------
function Step2TrafficSources({
  channels,
  funnels,
  selectedChannelIds,
  primaryChannelId,
  selectedFunnelIds,
  onToggleChannel,
  onSetPrimary,
  onToggleFunnel,
}: {
  channels: ReturnType<typeof useAcquisitionChannels>["rows"];
  funnels: WorkspaceFunnelRow[];
  selectedChannelIds: string[];
  primaryChannelId: string | null;
  selectedFunnelIds: string[];
  onToggleChannel: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onToggleFunnel: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Where does traffic come from?</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Pick any combination of external acquisition channels and existing funnels that feed into this one.
          At least one source is required.
        </p>
      </div>

      {/* External Channels */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> External channels
        </div>
        {channels.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">No channels available.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {channels.map((c) => {
              const on = selectedChannelIds.includes(c.id);
              const isPrimary = primaryChannelId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleChannel(c.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={c.color ? { color: on ? c.color : undefined } : undefined}>
                        {c.label}
                      </div>
                      {c.description && (
                        <div className="text-[11px] text-muted-foreground truncate">{c.description}</div>
                      )}
                    </div>
                    {on && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  {on && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSetPrimary(c.id); }}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isPrimary
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Star className={`w-2.5 h-2.5 mr-1 inline ${isPrimary ? "fill-current" : ""}`} />
                        {isPrimary ? "Primary" : "Set as primary"}
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Existing Funnels */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <Workflow className="w-3 h-3" /> Existing funnels
        </div>
        {funnels.length === 0 ? (
          <div className="text-xs text-muted-foreground italic rounded-lg border border-dashed border-border p-3">
            No built funnels yet in this workspace. Add external channels for now — you can wire upstream funnels once they exist.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {funnels.map((f) => {
              const on = selectedFunnelIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onToggleFunnel(f.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{f.name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{f.status}</div>
                    </div>
                    {on && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedChannelIds.length > 0 && !primaryChannelId && (
        <div className="text-[11px] text-amber-600">Pick a primary channel to continue.</div>
      )}
    </div>
  );
}

// ---------- Step 3 ----------------------------------------------------------
function Step3System({ suggestions, stage, value, onChange, isAdmin }: {
  suggestions: SystemSuggestion[];
  stage: string | null;
  value: string | null;
  onChange: (id: string) => void;
  isAdmin: boolean;
}) {
  const list = suggestions.filter((s) => s.compatible && (s.buildable || isAdmin));
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Choose a growth system</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {stage ? `Recommendations reflect your current growth stage: ${stage}.` : "Complete your Growth Assessment for stage-aware ranking."}
        </p>
      </div>
      {list.length === 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
          No buildable growth systems are compatible with this offer.
        </div>
      )}
      <div className="space-y-2">
        {list.map((sug) => {
          const selected = value === sug.system.id;
          return (
            <button
              key={sug.system.id}
              type="button"
              onClick={() => onChange(sug.system.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected
                  ? "border-primary bg-primary/10"
                  : sug.group === "best_fit"
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{sug.system.label}</div>
                    {!sug.buildable && (
                      <Badge variant="destructive" className="text-[9px]">
                        <Lock className="w-3 h-3 mr-0.5" /> No Seed Template
                      </Badge>
                    )}
                  </div>
                  {sug.system.primary_objective && (
                    <div className="text-xs text-muted-foreground mt-0.5">{sug.system.primary_objective}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-1 italic">{sug.why}</div>
                </div>
                {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Step 4 ----------------------------------------------------------
function Step4Review({ state, offers, systems, channels, funnels, onNotes, onJump }: {
  state: WizardState;
  offers: EcosystemOfferRow[];
  systems: ReturnType<typeof useGrowthSystemsCatalog>["rows"];
  channels: ReturnType<typeof useAcquisitionChannels>["rows"];
  funnels: WorkspaceFunnelRow[];
  onNotes: (v: string) => void;
  onJump: (s: StepId) => void;
}) {
  const target = offers.find((o) => o.id === state.targetOfferId);
  const sys = systems.find((s) => s.id === state.systemId);
  const primary = channels.find((c) => c.id === state.primaryChannelId);
  const additional = channels.filter((c) => state.selectedChannelIds.includes(c.id) && c.id !== state.primaryChannelId);
  const funnelsPicked = funnels.filter((f) => state.selectedFunnelIds.includes(f.id));

  const Row = ({ label, value, stepId }: { label: string; value: React.ReactNode; stepId: StepId }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => onJump(stepId)}>Change</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Review</Label>
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Target offer" value={target?.name ?? "—"} stepId={1} />
        <Row
          label="Traffic sources"
          stepId={2}
          value={
            <div className="flex flex-wrap gap-1 mt-1">
              {primary && (
                <Badge variant="secondary" className="gap-1"><Star className="w-3 h-3 fill-current" />{primary.label}</Badge>
              )}
              {additional.map((c) => <Badge key={c.id} variant="outline">{c.label}</Badge>)}
              {funnelsPicked.map((f) => (
                <Badge key={f.id} variant="outline" className="gap-1"><Workflow className="w-3 h-3" />{f.name}</Badge>
              ))}
              {!primary && additional.length === 0 && funnelsPicked.length === 0 && <span className="text-muted-foreground">—</span>}
            </div>
          }
        />
        <Row label="Growth system" value={sys?.label ?? "—"} stepId={3} />
      </div>
      <div>
        <Label htmlFor="wiz-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
        <Textarea
          id="wiz-notes"
          value={state.notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Internal notes about this funnel…"
          rows={3}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}

export default AddRouteWizard;
