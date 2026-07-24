// =============================================================================
// AddRouteWizard — offer-driven 5-step flow with auto-skip.
//
// Steps:
//  1. Target Offer
//  2. Source (external / from another offer)
//  3. Growth System
//  4. Channels (external-only; primary required)
//  5. Review
//
// Auto-skip rule: a step is skipped and the sole option preselected whenever
// only one valid option exists. Step 5 always renders and each auto-selected
// value has a Change link that unlocks the underlying step for the session.
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Lock, Sparkles, Wand2 } from "lucide-react";
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
import {
  useGrowthSystemChannelCompat,
  useCurrentGrowthStage,
  useIsAppAdmin,
} from "@/lib/growth-architecture/useGrowthAuxHooks";
import {
  rankSystemsForOffer,
  rankChannelsForSystem,
  type SystemSuggestion,
} from "@/lib/growth-architecture/recommendations";

type StepId = 1 | 2 | 3 | 4 | 5;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[];
  existingRoutes: GrowthArchitectureRow[];
  preselectedSystemId?: string | null;
  preselectedOfferId?: string | null;
  onCreate: (payload: {
    system_catalog_id: string;
    source_offer_id: string | null;
    target_offer_id: string;
    status: GrowthArchStatus;
    notes: string | null;
  }) => Promise<string | null>;
  onCreated?: () => void;
}

interface WizardState {
  targetOfferId: string | null;
  sourceKind: "external" | "offer";
  sourceOfferId: string | null;
  systemId: string | null;
  primaryChannelId: string | null;
  additionalChannelIds: string[];
  notes: string;
  autoSkipped: Record<StepId, boolean>;
  unlocked: Record<StepId, boolean>; // when the user clicked "Change"
}

const empty = (preselectOffer: string | null): WizardState => ({
  targetOfferId: preselectOffer,
  sourceKind: "external",
  sourceOfferId: null,
  systemId: null,
  primaryChannelId: null,
  additionalChannelIds: [],
  notes: "",
  autoSkipped: { 1: false, 2: false, 3: false, 4: false, 5: false },
  unlocked: { 1: false, 2: false, 3: false, 4: false, 5: false },
});

const AddRouteWizard = ({
  open,
  onOpenChange,
  offers,
  relationships,
  existingRoutes,
  preselectedSystemId,
  preselectedOfferId,
  onCreate,
  onCreated,
}: Props) => {
  const { rows: systems } = useGrowthSystemsCatalog();
  const { rows: channels } = useAcquisitionChannels();
  const { bySystem: compatBySystem } = useGrowthSystemChannelCompat();
  const { activeSubAccountId } = useActiveSubAccount();
  const { stage } = useCurrentGrowthStage(activeSubAccountId);
  const { isAdmin } = useIsAppAdmin();

  const [state, setState] = useState<WizardState>(() => empty(preselectedOfferId ?? null));
  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setState(empty(preselectedOfferId ?? null));
      setStep(1);
    }
  }, [open, preselectedOfferId]);

  const patch = useCallback((p: Partial<WizardState>) => setState((s) => ({ ...s, ...p })), []);

  // ---- Derived option sets --------------------------------------------------
  const targetOffer = useMemo(
    () => offers.find((o) => o.id === state.targetOfferId) ?? null,
    [offers, state.targetOfferId],
  );

  const incomingRels = useMemo(
    () => relationships.filter((r) => r.target_offer_id === state.targetOfferId),
    [relationships, state.targetOfferId],
  );

  const sourceOfferOptions = useMemo(
    () =>
      offers.filter((o) =>
        incomingRels.some((r) => r.source_offer_id === o.id) && o.id !== state.targetOfferId,
      ),
    [offers, incomingRels, state.targetOfferId],
  );

  const systemSuggestions: SystemSuggestion[] = useMemo(
    () =>
      rankSystemsForOffer(
        systems,
        targetOffer,
        stage,
        existingRoutes,
        state.sourceKind === "offer" ? state.sourceOfferId : null,
      ),
    [systems, targetOffer, stage, existingRoutes, state.sourceKind, state.sourceOfferId],
  );

  // A system is user-selectable when compatible + buildable (or admin override).
  const selectableSystems = useMemo(
    () => systemSuggestions.filter((s) => s.compatible && (s.buildable || isAdmin)),
    [systemSuggestions, isAdmin],
  );

  const compatChannelIds = useMemo(() => {
    if (!state.systemId) return new Set<string>();
    return compatBySystem.get(state.systemId) ?? new Set<string>();
  }, [state.systemId, compatBySystem]);

  const channelSuggestions = useMemo(() => {
    if (!state.systemId) return [];
    const sys = systems.find((s) => s.id === state.systemId);
    return rankChannelsForSystem(channels, compatChannelIds, sys?.label ?? "this system");
  }, [state.systemId, systems, channels, compatChannelIds]);

  const availableChannels = useMemo(() => {
    if (compatChannelIds.size === 0) return isAdmin ? channels : [];
    return channels.filter((c) => compatChannelIds.has(c.id));
  }, [channels, compatChannelIds, isAdmin]);

  // ---- Auto-skip predicates -------------------------------------------------
  // Only for external routes; offer-to-offer never needs channels.
  const isExternal = state.sourceKind === "external";

  // Advance from a step: apply auto-skip forward until we hit a step needing input.
  const advanceFrom = useCallback(
    (from: StepId) => {
      let next: StepId = (from + 1) as StepId;
      while (next <= 5) {
        // Step 5 is always shown
        if (next === 5) break;

        // If user manually unlocked this step, always render.
        if (state.unlocked[next]) break;

        if (next === 2) {
          // Skip if no incoming relationships → force external
          if (incomingRels.length === 0) {
            setState((s) => ({
              ...s,
              sourceKind: "external",
              sourceOfferId: null,
              autoSkipped: { ...s.autoSkipped, 2: true },
            }));
            next = 3;
            continue;
          }
          break;
        }
        if (next === 3) {
          // Only one selectable system → auto-skip
          if (selectableSystems.length === 1) {
            const only = selectableSystems[0];
            setState((s) => ({
              ...s,
              systemId: only.system.id,
              autoSkipped: { ...s.autoSkipped, 3: true },
            }));
            next = 4;
            continue;
          }
          break;
        }
        if (next === 4) {
          // Offer-to-offer: skip channel step
          if (!isExternal) {
            setState((s) => ({ ...s, autoSkipped: { ...s.autoSkipped, 4: true } }));
            next = 5;
            continue;
          }
          // Empty compat: cannot auto-skip; render warning
          if (compatChannelIds.size === 0) break;
          // Only one compat channel → auto-skip
          if (availableChannels.length === 1) {
            setState((s) => ({
              ...s,
              primaryChannelId: availableChannels[0].id,
              autoSkipped: { ...s.autoSkipped, 4: true },
            }));
            next = 5;
            continue;
          }
          break;
        }
      }
      setStep(next);
    },
    [state.unlocked, incomingRels.length, selectableSystems, isExternal, compatChannelIds.size, availableChannels],
  );

  const goBack = useCallback(() => {
    // Move to the nearest previous step that wasn't auto-skipped OR is Step 1.
    let prev: StepId = (step - 1) as StepId;
    while (prev >= 1) {
      if (prev === 1) break;
      if (!state.autoSkipped[prev]) break;
      prev = (prev - 1) as StepId;
    }
    setStep(Math.max(1, prev) as StepId);
  }, [step, state.autoSkipped]);

  const unlockAndGo = useCallback((s: StepId) => {
    setState((prev) => ({
      ...prev,
      unlocked: { ...prev.unlocked, [s]: true },
      autoSkipped: { ...prev.autoSkipped, [s]: false },
    }));
    setStep(s);
  }, []);

  // ---- Save -----------------------------------------------------------------
  const canSave = useMemo(() => {
    if (!state.targetOfferId || !state.systemId) return false;
    if (isExternal && !state.primaryChannelId) return false;
    if (state.sourceKind === "offer" && !state.sourceOfferId) return false;
    return true;
  }, [state, isExternal]);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const id = await onCreate({
      system_catalog_id: state.systemId!,
      source_offer_id: state.sourceKind === "offer" ? state.sourceOfferId : null,
      target_offer_id: state.targetOfferId!,
      status: "planned" as GrowthArchStatus,
      notes: state.notes.trim() ? state.notes.trim() : null,
    });
    if (!id) { setSaving(false); return; }

    // Insert primary channel + additional channels
    const rows: any[] = [];
    if (isExternal && state.primaryChannelId) {
      rows.push({ architecture_system_id: id, channel_id: state.primaryChannelId, is_primary: true, sort_order: 0 });
    }
    state.additionalChannelIds.forEach((cid, i) => {
      if (cid === state.primaryChannelId) return;
      rows.push({ architecture_system_id: id, channel_id: cid, is_primary: false, sort_order: i + 1 });
    });
    if (rows.length > 0) {
      const { error } = await supabase.from("growth_architecture_channels").insert(rows);
      if (error) toast.error("Route created, but some channels could not be attached.");
    }
    setSaving(false);
    onCreated?.();
    onOpenChange(false);
    toast.success("Route created.");
  };

  // Preselect from Roadmap on Step 3 arrival
  useEffect(() => {
    if (!open || !preselectedSystemId || state.systemId) return;
    // If offer already picked and preselected system is selectable, preselect it
    if (targetOffer) {
      const found = selectableSystems.find((s) => s.system.id === preselectedSystemId);
      if (found) patch({ systemId: preselectedSystemId });
    }
  }, [open, preselectedSystemId, targetOffer, selectableSystems, state.systemId, patch]);

  // ---- Render ---------------------------------------------------------------
  const stepLabels: Record<StepId, string> = { 1: "Target offer", 2: "Source", 3: "Growth system", 4: "Channels", 5: "Review" };

  const canGoNext = useMemo(() => {
    if (step === 1) return !!state.targetOfferId;
    if (step === 2) return state.sourceKind === "external" || !!state.sourceOfferId;
    if (step === 3) return !!state.systemId;
    if (step === 4) return !isExternal || !!state.primaryChannelId;
    return false;
  }, [step, state, isExternal]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Growth Route</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {([1, 2, 3, 4, 5] as StepId[]).map((s) => (
              <div key={s} className={`text-[11px] px-2 py-0.5 rounded-full ${step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}. {stepLabels[s]}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          {step === 1 && (
            <Step1Target offers={offers} existingRoutes={existingRoutes} value={state.targetOfferId} onChange={(id) => patch({ targetOfferId: id, systemId: null, primaryChannelId: null })} />
          )}
          {step === 2 && (
            <Step2Source
              value={state.sourceKind}
              sourceOfferId={state.sourceOfferId}
              sourceOptions={sourceOfferOptions}
              onKindChange={(k) => patch({ sourceKind: k, sourceOfferId: k === "external" ? null : state.sourceOfferId, systemId: null })}
              onSourceOfferChange={(id) => patch({ sourceOfferId: id, systemId: null })}
              hasRelationships={incomingRels.length > 0}
            />
          )}
          {step === 3 && (
            <Step3System
              suggestions={systemSuggestions}
              stage={stage}
              value={state.systemId}
              onChange={(id) => patch({ systemId: id, primaryChannelId: null, additionalChannelIds: [] })}
              preselectedSystemId={preselectedSystemId ?? null}
              isAdmin={isAdmin}
            />
          )}
          {step === 4 && (
            <Step4Channels
              isExternal={isExternal}
              compatChannelIds={compatChannelIds}
              suggestions={channelSuggestions}
              channels={availableChannels}
              primary={state.primaryChannelId}
              additional={state.additionalChannelIds}
              onPrimaryChange={(id) => patch({ primaryChannelId: id })}
              onAdditionalToggle={(id) =>
                patch({
                  additionalChannelIds: state.additionalChannelIds.includes(id)
                    ? state.additionalChannelIds.filter((c) => c !== id)
                    : [...state.additionalChannelIds, id],
                })
              }
              isAdmin={isAdmin}
              hasAnyCompat={compatChannelIds.size > 0}
            />
          )}
          {step === 5 && (
            <Step5Review
              state={state}
              offers={offers}
              systems={systems}
              channels={channels}
              stage={stage}
              onChange={unlockAndGo}
              onNotes={(v) => patch({ notes: v })}
              isExternal={isExternal}
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
            {step < 5 ? (
              <Button size="sm" disabled={!canGoNext} onClick={() => advanceFrom(step)}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" disabled={!canSave || saving} onClick={handleSave}>
                {saving ? "Adding…" : "Add Growth Route"}
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
        Add at least one offer in Offer Ecosystem before creating a growth route.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">Which offer are you building a growth route for?</Label>
        <p className="text-xs text-muted-foreground mt-1">Pick the offer you want customers to reach through this route.</p>
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
              className={`text-left p-3 rounded-lg border transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{o.tier.replace("_", " ")}</div>
                  <div className="text-sm font-semibold truncate">{o.name}</div>
                  {typeof o.data?.price === "number" && o.data.price > 0 && (
                    <div className="text-[11px] text-muted-foreground tabular-nums">${o.data.price.toLocaleString()}</div>
                  )}
                </div>
                {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                {routeCount === 0 ? "No routes yet" : `${routeCount} route${routeCount > 1 ? "s" : ""}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Step 2 ----------------------------------------------------------
function Step2Source({ value, sourceOfferId, sourceOptions, onKindChange, onSourceOfferChange, hasRelationships }: {
  value: "external" | "offer";
  sourceOfferId: string | null;
  sourceOptions: EcosystemOfferRow[];
  onKindChange: (k: "external" | "offer") => void;
  onSourceOfferChange: (id: string) => void;
  hasRelationships: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">How will people reach this offer?</Label>
        <p className="text-xs text-muted-foreground mt-1">External acquisition brings new leads in from outside your ecosystem; ascension routes convert existing customers.</p>
      </div>
      <RadioGroup value={value} onValueChange={(v) => onKindChange(v as any)} className="grid gap-2">
        <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${value === "external" ? "border-primary bg-primary/5" : "border-border"}`}>
          <RadioGroupItem value="external" id="src-ext" className="mt-1" />
          <div>
            <div className="text-sm font-semibold">From an acquisition channel</div>
            <div className="text-xs text-muted-foreground">External traffic — cold outreach, ads, organic content, etc.</div>
          </div>
        </label>
        <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${value === "offer" ? "border-primary bg-primary/5" : "border-border"} ${!hasRelationships ? "opacity-60" : ""}`}>
          <RadioGroupItem value="offer" id="src-offer" className="mt-1" disabled={!hasRelationships} />
          <div>
            <div className="text-sm font-semibold">From another offer</div>
            <div className="text-xs text-muted-foreground">
              {hasRelationships
                ? "Ascension route — customers of another offer move up to this one."
                : "No offer relationships lead into this offer yet. Add a Next Offer on the source offer first."}
            </div>
          </div>
        </label>
      </RadioGroup>
      {value === "offer" && (
        <div>
          <Label className="text-xs font-medium mb-1.5 block">Source offer</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sourceOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onSourceOfferChange(o.id)}
                className={`text-left p-2.5 rounded-lg border ${sourceOfferId === o.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <div className="text-[10px] uppercase text-muted-foreground">{o.tier.replace("_", " ")}</div>
                <div className="text-sm font-semibold truncate">{o.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Step 3 ----------------------------------------------------------
function Step3System({ suggestions, stage, value, onChange, preselectedSystemId, isAdmin }: {
  suggestions: SystemSuggestion[];
  stage: string | null;
  value: string | null;
  onChange: (id: string) => void;
  preselectedSystemId: string | null;
  isAdmin: boolean;
}) {
  const roadmapPre = preselectedSystemId ? suggestions.find((s) => s.system.id === preselectedSystemId) : null;
  const [showOther, setShowOther] = useState(false);

  const best = suggestions.filter((s) => s.group === "best_fit");
  const rec = suggestions.filter((s) => s.group === "recommended");
  const other = suggestions.filter((s) => s.group === "other_compatible");

  const noneSelectable = suggestions.every((s) => !s.compatible || (!s.buildable && !isAdmin));

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Choose a growth system</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {stage
            ? `Recommendations reflect your current growth stage: ${stage}.`
            : "Growth stage unknown — showing all compatible systems ranked by admin priority. Complete your Growth Assessment for stage-aware recommendations."}
        </p>
      </div>

      {roadmapPre && !roadmapPre.compatible && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            The Roadmap task pointed to <strong>{roadmapPre.system.label}</strong>, but it isn't compatible with this offer. Pick another compatible system or go back and choose a different offer.
          </div>
        </div>
      )}

      {noneSelectable && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
          No buildable growth systems are compatible with this offer. Admins can configure Seed Templates in Admin → Growth Systems.
        </div>
      )}

      {stage && best.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Best fit</div>
          <div className="space-y-2">
            {best.map((s) => <SystemCard key={s.system.id} sug={s} selected={value === s.system.id} onSelect={() => onChange(s.system.id)} isAdmin={isAdmin} highlighted />)}
          </div>
        </div>
      )}

      {stage && rec.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Also recommended</div>
          <div className="space-y-2">
            {rec.map((s) => <SystemCard key={s.system.id} sug={s} selected={value === s.system.id} onSelect={() => onChange(s.system.id)} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}

      {(other.length > 0) && (
        <div>
          {stage ? (
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowOther((v) => !v)}>
              {showOther ? "Hide" : "Show"} other compatible systems ({other.length})
            </button>
          ) : (
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Compatible systems</div>
          )}
          {(showOther || !stage) && (
            <div className="space-y-2 mt-2">
              {other.map((s) => <SystemCard key={s.system.id} sug={s} selected={value === s.system.id} onSelect={() => onChange(s.system.id)} isAdmin={isAdmin} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SystemCard({ sug, selected, onSelect, isAdmin, highlighted }: {
  sug: SystemSuggestion;
  selected: boolean;
  onSelect: () => void;
  isAdmin: boolean;
  highlighted?: boolean;
}) {
  const disabled = !sug.compatible || (!sug.buildable && !isAdmin);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${selected ? "border-primary bg-primary/10" : highlighted ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">{sug.system.label}</div>
            {!sug.buildable && (
              <Badge variant="destructive" className="text-[9px]"><Lock className="w-3 h-3 mr-0.5" /> No Seed Template</Badge>
            )}
            {sug.duplicate && <Badge variant="outline" className="text-[9px]">Duplicate</Badge>}
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
}

// ---------- Step 4 ----------------------------------------------------------
function Step4Channels({ isExternal, compatChannelIds, suggestions, channels, primary, additional, onPrimaryChange, onAdditionalToggle, isAdmin, hasAnyCompat }: {
  isExternal: boolean;
  compatChannelIds: Set<string>;
  suggestions: ReturnType<typeof rankChannelsForSystem>;
  channels: ReturnType<typeof useAcquisitionChannels>["rows"];
  primary: string | null;
  additional: string[];
  onPrimaryChange: (id: string) => void;
  onAdditionalToggle: (id: string) => void;
  isAdmin: boolean;
  hasAnyCompat: boolean;
}) {
  if (!isExternal) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        This route uses your existing offer relationship. No acquisition channel is needed.
      </div>
    );
  }

  if (!hasAnyCompat && !isAdmin) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-xs">
        No compatible channels are configured for this growth system yet. Ask an admin to add compatible channels in Admin → Growth Systems before continuing.
      </div>
    );
  }

  const list = hasAnyCompat ? suggestions : channels.map((c) => ({ channel: c, compatible: false, isSuggestedDefault: false, why: "Admin override — no compatibility configured." }));

  return (
    <div className="space-y-4">
      {!hasAnyCompat && isAdmin && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
          Admin override: no compatibility configured for this system. Any channel may be picked, but non-admins would be blocked here.
        </div>
      )}

      <div>
        <Label className="text-sm font-semibold">Primary acquisition channel</Label>
        <p className="text-xs text-muted-foreground mt-1">The main way people enter this route.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {list.map((s) => (
            <button
              key={s.channel.id}
              type="button"
              onClick={() => onPrimaryChange(s.channel.id)}
              className={`text-left p-3 rounded-lg border ${primary === s.channel.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    {s.channel.label}
                    {s.isSuggestedDefault && <Badge variant="secondary" className="text-[9px]">Suggested default</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{s.why}</div>
                </div>
                {primary === s.channel.id && <Check className="w-4 h-4 text-primary shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {list.length > 1 && (
        <div>
          <Label className="text-sm font-semibold">Additional channels (optional)</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {list.filter((s) => s.channel.id !== primary).map((s) => {
              const on = additional.includes(s.channel.id);
              return (
                <button
                  key={s.channel.id}
                  type="button"
                  onClick={() => onAdditionalToggle(s.channel.id)}
                  className={`text-[11px] px-2 py-1 rounded-md border ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {on ? "✓ " : "+ "}{s.channel.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Step 5 ----------------------------------------------------------
function Step5Review({ state, offers, systems, channels, stage, onChange, onNotes, isExternal }: {
  state: WizardState;
  offers: EcosystemOfferRow[];
  systems: ReturnType<typeof useGrowthSystemsCatalog>["rows"];
  channels: ReturnType<typeof useAcquisitionChannels>["rows"];
  stage: string | null;
  onChange: (s: StepId) => void;
  onNotes: (v: string) => void;
  isExternal: boolean;
}) {
  const target = offers.find((o) => o.id === state.targetOfferId);
  const source = state.sourceKind === "offer" ? offers.find((o) => o.id === state.sourceOfferId) : null;
  const sys = systems.find((s) => s.id === state.systemId);
  const primary = channels.find((c) => c.id === state.primaryChannelId);
  const addChannels = channels.filter((c) => state.additionalChannelIds.includes(c.id));

  const Row = ({ label, value, stepId }: { label: string; value: React.ReactNode; stepId: StepId }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {state.autoSkipped[stepId] && (
          <Badge variant="secondary" className="text-[9px] gap-1"><Wand2 className="w-3 h-3" /> Auto-selected</Badge>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => onChange(stepId)}>Change</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Review your route</Label>
        {stage && <p className="text-xs text-muted-foreground mt-1">Growth stage: {stage}</p>}
      </div>

      <div className="rounded-lg border border-border p-3">
        <Row label="Target offer" value={target?.name ?? "—"} stepId={1} />
        <Row label="Source" value={source ? `From: ${source.name}` : "External acquisition"} stepId={2} />
        <Row label="Growth system" value={sys?.label ?? "—"} stepId={3} />
        {isExternal && <Row label="Primary channel" value={primary?.label ?? "—"} stepId={4} />}
        {isExternal && addChannels.length > 0 && (
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Additional channels</div>
            <div className="flex flex-wrap gap-1 mt-1">{addChannels.map((c) => <Badge key={c.id} variant="outline" className="text-[10px]">{c.label}</Badge>)}</div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        <div className="text-[10px] uppercase tracking-wide mb-1">Route summary</div>
        <div className="text-sm font-mono">
          {source ? source.name : primary?.label ?? "—"} → {sys?.label ?? "—"} → {target?.name ?? "—"}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-1.5 block">Notes (optional)</Label>
        <Textarea rows={2} value={state.notes} onChange={(e) => onNotes(e.target.value)} placeholder="Any specifics about this route…" />
      </div>

      <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
        Adding the route does not build the funnel. Use <strong>Start Building</strong> on the route card when you're ready.
      </p>
    </div>
  );
}

import { useWorkspace as _useWorkspace } from "@/contexts/WorkspaceContext";
function useActiveSubAccount(): { activeSubAccountId: string | null } {
  const w = _useWorkspace();
  return { activeSubAccountId: w.activeSubAccountId ?? null };
}

export default AddRouteWizard;
