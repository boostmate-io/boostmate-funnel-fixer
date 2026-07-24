// =============================================================================
// EditRouteDialog — V5 full route editor.
//
// Editable when NO linked funnel exists:
//   - Target offer
//   - Source (external / from another offer)
//   - Growth system (must be compatible with the target)
//   - Primary + Additional acquisition channels
//   - Notes
//
// When a linked funnel exists, structural fields (target, source, system) are
// locked with a clear explanation. Channels and notes remain editable so the
// route can be tuned post-build.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Star, X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import type {
  GrowthArchitectureRow,
  OfferRelationshipRow,
  AcquisitionChannelRow,
  GrowthSystemCatalogRow,
  RouteChannelRow,
} from "@/lib/growth-architecture/hooks";
import { rankSystemsForOffer } from "@/lib/growth-architecture/recommendations";
import { useGrowthSystemChannelCompat, useCurrentGrowthStage, useIsAppAdmin } from "@/lib/growth-architecture/useGrowthAuxHooks";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: GrowthArchitectureRow | null;
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[];
  systems: GrowthSystemCatalogRow[];
  channels: AcquisitionChannelRow[];
  primary: RouteChannelRow | null;
  additional: RouteChannelRow[];
  onSaveCore: (id: string, patch: Partial<GrowthArchitectureRow>) => Promise<unknown>;
  onAddChannel: (routeId: string, channelId: string, isPrimary: boolean) => Promise<unknown>;
  onRemoveChannel: (rowId: string) => Promise<unknown>;
  onSetPrimary: (routeId: string, channelId: string) => Promise<unknown>;
}

const EditRouteDialog = ({
  open,
  onOpenChange,
  route,
  offers,
  relationships,
  systems,
  channels,
  primary,
  additional,
  onSaveCore,
  onAddChannel,
  onRemoveChannel,
  onSetPrimary,
}: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { bySystem: compatBySystem } = useGrowthSystemChannelCompat();
  const { stage } = useCurrentGrowthStage(activeSubAccountId);
  const { isAdmin } = useIsAppAdmin();

  const hasFunnel = !!route?.funnel_id;
  const locked = hasFunnel;

  const [targetOfferId, setTargetOfferId] = useState<string | null>(null);
  const [sourceKind, setSourceKind] = useState<"external" | "offer">("external");
  const [sourceOfferId, setSourceOfferId] = useState<string | null>(null);
  const [systemId, setSystemId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [addChannelSel, setAddChannelSel] = useState<string>("");

  // Reset local state when opening
  useEffect(() => {
    if (!open || !route) return;
    setTargetOfferId(route.target_offer_id);
    setSourceKind(route.source_offer_id ? "offer" : "external");
    setSourceOfferId(route.source_offer_id);
    setSystemId(route.system_catalog_id);
    setNotes(route.notes ?? "");
    setAddChannelSel("");
  }, [open, route]);

  const targetOffer = useMemo(
    () => offers.find((o) => o.id === targetOfferId) ?? null,
    [offers, targetOfferId],
  );

  const incomingRels = useMemo(
    () => relationships.filter((r) => r.target_offer_id === targetOfferId),
    [relationships, targetOfferId],
  );
  const sourceOfferOptions = useMemo(
    () => offers.filter((o) =>
      incomingRels.some((r) => r.source_offer_id === o.id) && o.id !== targetOfferId,
    ),
    [offers, incomingRels, targetOfferId],
  );

  const suggestions = useMemo(
    () => rankSystemsForOffer(
      systems,
      targetOffer,
      stage,
      [],
      sourceKind === "offer" ? sourceOfferId : null,
    ),
    [systems, targetOffer, stage, sourceKind, sourceOfferId],
  );
  const selectableSystems = useMemo(
    () => suggestions.filter((s) => s.compatible && (s.buildable || isAdmin)),
    [suggestions, isAdmin],
  );

  const isExternal = sourceKind === "external";

  const canSave = useMemo(() => {
    if (!route) return false;
    if (!targetOfferId || !systemId) return false;
    if (sourceKind === "offer" && !sourceOfferId) return false;
    return true;
  }, [route, targetOfferId, systemId, sourceKind, sourceOfferId]);

  const coreChanged = useMemo(() => {
    if (!route) return false;
    return (
      route.target_offer_id !== targetOfferId ||
      (route.source_offer_id ?? null) !== (sourceKind === "offer" ? sourceOfferId : null) ||
      route.system_catalog_id !== systemId ||
      (route.notes ?? "") !== notes
    );
  }, [route, targetOfferId, sourceKind, sourceOfferId, systemId, notes]);

  const handleSave = async () => {
    if (!route || !canSave) return;
    setSaving(true);
    try {
      if (coreChanged) {
        const patch: Partial<GrowthArchitectureRow> = {
          notes: notes.trim() ? notes.trim() : null,
        };
        if (!locked) {
          patch.target_offer_id = targetOfferId!;
          patch.source_offer_id = sourceKind === "offer" ? sourceOfferId : null;
          patch.system_catalog_id = systemId!;
        }
        await onSaveCore(route.id, patch);
      }
      onOpenChange(false);
      toast.success("Route updated.");
    } finally {
      setSaving(false);
    }
  };

  if (!route) return null;

  const linkedIds = new Set([
    ...(primary ? [primary.channel_id] : []),
    ...additional.map((a) => a.channel_id),
  ]);
  const availableToAdd = channels.filter((c) => !linkedIds.has(c.id));
  const primaryChannel = primary ? channels.find((c) => c.id === primary.channel_id) ?? null : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit route</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {locked && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex gap-2 text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground mb-0.5">Structure locked</div>
                <div className="text-muted-foreground">
                  A funnel is linked to this route. Target offer, source and growth system can no
                  longer be changed. Delete the route (and its funnel) to rebuild it differently.
                </div>
              </div>
            </div>
          )}

          {/* Target offer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Target offer
            </Label>
            {locked ? (
              <div className="text-sm font-medium">{targetOffer?.name ?? "—"}</div>
            ) : (
              <Select value={targetOfferId ?? ""} onValueChange={(v) => {
                setTargetOfferId(v);
                // Reset dependent fields when target changes
                setSourceKind("external");
                setSourceOfferId(null);
                setSystemId(null);
              }}>
                <SelectTrigger><SelectValue placeholder="Pick an offer…" /></SelectTrigger>
                <SelectContent>
                  {offers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="text-xs text-muted-foreground mr-2">{o.tier.replace("_", " ")}</span>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </Label>
            {locked ? (
              <div className="text-sm font-medium">
                {route.source_offer_id
                  ? `From: ${offers.find((o) => o.id === route.source_offer_id)?.name ?? "Unknown offer"}`
                  : "External acquisition"}
              </div>
            ) : (
              <>
                <RadioGroup
                  value={sourceKind}
                  onValueChange={(v) => {
                    setSourceKind(v as "external" | "offer");
                    if (v === "external") setSourceOfferId(null);
                    setSystemId(null);
                  }}
                  className="grid gap-2"
                >
                  <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${sourceKind === "external" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="external" className="mt-1" />
                    <div className="text-sm">
                      <div className="font-semibold">From an acquisition channel</div>
                      <div className="text-xs text-muted-foreground">External traffic.</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 border rounded-lg ${incomingRels.length === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${sourceKind === "offer" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="offer" className="mt-1" disabled={incomingRels.length === 0} />
                    <div className="text-sm">
                      <div className="font-semibold">From another offer</div>
                      <div className="text-xs text-muted-foreground">
                        {incomingRels.length === 0
                          ? "No incoming offer relationships. Add a Next Offer on the source offer first."
                          : "Ascension route."}
                      </div>
                    </div>
                  </label>
                </RadioGroup>
                {sourceKind === "offer" && (
                  <Select value={sourceOfferId ?? ""} onValueChange={(v) => { setSourceOfferId(v); setSystemId(null); }}>
                    <SelectTrigger><SelectValue placeholder="Pick source offer…" /></SelectTrigger>
                    <SelectContent>
                      {sourceOfferOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>

          {/* Growth system */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Growth system
            </Label>
            {locked ? (
              <div className="text-sm font-medium">
                {systems.find((s) => s.id === route.system_catalog_id)?.label ?? "—"}
              </div>
            ) : (
              <Select value={systemId ?? ""} onValueChange={(v) => setSystemId(v)}>
                <SelectTrigger><SelectValue placeholder="Pick a compatible system…" /></SelectTrigger>
                <SelectContent>
                  {selectableSystems.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No compatible systems for this offer.
                    </div>
                  )}
                  {selectableSystems.map((s) => (
                    <SelectItem key={s.system.id} value={s.system.id}>
                      {s.system.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Channels — always editable */}
          {isExternal && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Acquisition channels
              </Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {primaryChannel ? (
                  <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-1 border"
                    style={primaryChannel.color ? { borderColor: primaryChannel.color, color: primaryChannel.color } : undefined}>
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-[11px] font-semibold">{primaryChannel.label}</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-75 ml-1">Primary</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground italic">
                    No primary channel
                  </Badge>
                )}
                {additional.map((a) => {
                  const ch = channels.find((c) => c.id === a.channel_id);
                  if (!ch) return null;
                  return (
                    <Badge key={a.id} variant="outline" className="gap-1 pl-2 pr-0.5 py-1">
                      <span className="text-[11px]">{ch.label}</span>
                      <Button size="icon" variant="ghost" className="h-4 w-4 hover:text-destructive"
                        onClick={() => onRemoveChannel(a.id)} aria-label={`Remove ${ch.label}`}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-end gap-2 pt-1">
                {availableToAdd.length > 0 && (
                  <div className="flex items-end gap-2">
                    <Select value={addChannelSel} onValueChange={setAddChannelSel}>
                      <SelectTrigger className="h-8 text-xs w-[200px]">
                        <SelectValue placeholder="Add channel…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToAdd.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8 gap-1"
                      disabled={!addChannelSel}
                      onClick={async () => {
                        if (!addChannelSel) return;
                        await onAddChannel(route.id, addChannelSel, !primary);
                        setAddChannelSel("");
                      }}>
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                )}
                {(primary || additional.length > 0) && (
                  <div className="flex items-end gap-2">
                    <Select value={primary?.channel_id ?? ""} onValueChange={(v) => onSetPrimary(route.id, v)}>
                      <SelectTrigger className="h-8 text-xs w-[200px]">
                        <SelectValue placeholder="Change primary…" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...(primary ? [{ id: primary.channel_id }] : []), ...additional.map((a) => ({ id: a.channel_id }))].map((r) => {
                          const c = channels.find((c) => c.id === r.id);
                          if (!c) return null;
                          return (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.label}{primary?.channel_id === c.id ? " (current)" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Channel changes save immediately.</p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-route-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="edit-route-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this route…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !canSave || !coreChanged}>
            {saving ? "Saving…" : coreChanged ? "Save changes" : "No changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRouteDialog;
