// =============================================================================
// EditRouteDialog — V2.1 engine, V5 shell.
//
// Structural fields (target offer, system) lock once a funnel exists.
// Traffic Sources — external channels and upstream funnels — remain editable
// at all times. Upstream funnel picks persist as pending IDs on the route
// pre-build and as funnel_connections rows post-build.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Star, X, Plus, Workflow } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import type {
  GrowthArchitectureRow,
  OfferRelationshipRow,
  AcquisitionChannelRow,
  GrowthSystemCatalogRow,
  RouteChannelRow,
} from "@/lib/growth-architecture/hooks";
import { rankSystemsForOffer } from "@/lib/growth-architecture/recommendations";
import { useCurrentGrowthStage, useIsAppAdmin } from "@/lib/growth-architecture/useGrowthAuxHooks";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { WorkspaceFunnelRow, FunnelConnectionRow } from "@/lib/growth-architecture/funnelConnections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: GrowthArchitectureRow | null;
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[]; // kept for signature compatibility
  systems: GrowthSystemCatalogRow[];
  channels: AcquisitionChannelRow[];
  primary: RouteChannelRow | null;
  additional: RouteChannelRow[];
  workspaceFunnels: WorkspaceFunnelRow[];
  funnelConnections: FunnelConnectionRow[];
  onSaveCore: (id: string, patch: Partial<GrowthArchitectureRow>) => Promise<unknown>;
  onAddChannel: (routeId: string, channelId: string, isPrimary: boolean) => Promise<unknown>;
  onRemoveChannel: (rowId: string) => Promise<unknown>;
  onSetPrimary: (routeId: string, channelId: string) => Promise<unknown>;
  onAddFunnelConnection: (sourceFunnelId: string, targetFunnelId: string) => Promise<unknown>;
  onRemoveFunnelConnectionBetween: (sourceFunnelId: string, targetFunnelId: string) => Promise<unknown>;
}

const EditRouteDialog = ({
  open,
  onOpenChange,
  route,
  offers,
  systems,
  channels,
  primary,
  additional,
  workspaceFunnels,
  funnelConnections,
  onSaveCore,
  onAddChannel,
  onRemoveChannel,
  onSetPrimary,
  onAddFunnelConnection,
  onRemoveFunnelConnectionBetween,
}: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { stage } = useCurrentGrowthStage(activeSubAccountId);
  const { isAdmin } = useIsAppAdmin();

  const hasFunnel = !!route?.funnel_id;
  const locked = hasFunnel;

  const [targetOfferId, setTargetOfferId] = useState<string | null>(null);
  const [systemId, setSystemId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [addChannelSel, setAddChannelSel] = useState<string>("");
  const [addFunnelSel, setAddFunnelSel] = useState<string>("");

  useEffect(() => {
    if (!open || !route) return;
    setTargetOfferId(route.target_offer_id);
    setSystemId(route.system_catalog_id);
    setNotes(route.notes ?? "");
    setAddChannelSel("");
    setAddFunnelSel("");
  }, [open, route]);

  const targetOffer = useMemo(
    () => offers.find((o) => o.id === targetOfferId) ?? null,
    [offers, targetOfferId],
  );

  const suggestions = useMemo(
    () => rankSystemsForOffer(systems, targetOffer, stage, [], null),
    [systems, targetOffer, stage],
  );
  const selectableSystems = useMemo(
    () => suggestions.filter((s) => s.compatible && (s.buildable || isAdmin)),
    [suggestions, isAdmin],
  );

  // Persisted upstream connections for this route (only when funnel exists)
  const persistedUpstream = useMemo(() => {
    if (!route?.funnel_id) return [] as FunnelConnectionRow[];
    return funnelConnections.filter((c) => c.target_funnel_id === route.funnel_id);
  }, [route?.funnel_id, funnelConnections]);

  // Pending upstream (planned routes)
  const pendingUpstreamIds = route?.pending_upstream_funnel_ids ?? [];

  const upstreamFunnelIds = useMemo(() => {
    if (route?.funnel_id) return persistedUpstream.map((c) => c.source_funnel_id);
    return pendingUpstreamIds;
  }, [route?.funnel_id, persistedUpstream, pendingUpstreamIds]);

  const availableFunnelsToAdd = useMemo(() => {
    const excluded = new Set<string>([...upstreamFunnelIds, ...(route?.funnel_id ? [route.funnel_id] : [])]);
    return workspaceFunnels.filter((f) => !excluded.has(f.id) && f.status !== "archived");
  }, [workspaceFunnels, upstreamFunnelIds, route?.funnel_id]);

  const canSave = useMemo(() => {
    if (!route) return false;
    if (!targetOfferId || !systemId) return false;
    return true;
  }, [route, targetOfferId, systemId]);

  const coreChanged = useMemo(() => {
    if (!route) return false;
    return (
      route.target_offer_id !== targetOfferId ||
      route.system_catalog_id !== systemId ||
      (route.notes ?? "") !== notes
    );
  }, [route, targetOfferId, systemId, notes]);

  const handleSave = async () => {
    if (!route || !canSave) return;
    setSaving(true);
    try {
      if (coreChanged) {
        const patch: Partial<GrowthArchitectureRow> = { notes: notes.trim() ? notes.trim() : null };
        if (!locked) {
          patch.target_offer_id = targetOfferId!;
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

  const handleAddFunnel = async (funnelId: string) => {
    if (!route) return;
    if (route.funnel_id) {
      await onAddFunnelConnection(funnelId, route.funnel_id);
    } else {
      const next = Array.from(new Set([...(route.pending_upstream_funnel_ids ?? []), funnelId]));
      const { error } = await supabase
        .from("growth_architecture_systems")
        .update({ pending_upstream_funnel_ids: next })
        .eq("id", route.id);
      if (error) { toast.error("Could not save upstream funnel"); return; }
      route.pending_upstream_funnel_ids = next;
    }
    setAddFunnelSel("");
  };

  const handleRemoveFunnel = async (funnelId: string) => {
    if (!route) return;
    if (route.funnel_id) {
      await onRemoveFunnelConnectionBetween(funnelId, route.funnel_id);
    } else {
      const next = (route.pending_upstream_funnel_ids ?? []).filter((id) => id !== funnelId);
      const { error } = await supabase
        .from("growth_architecture_systems")
        .update({ pending_upstream_funnel_ids: next })
        .eq("id", route.id);
      if (error) { toast.error("Could not remove upstream funnel"); return; }
      route.pending_upstream_funnel_ids = next;
    }
  };

  if (!route) return null;

  const linkedIds = new Set([
    ...(primary ? [primary.channel_id] : []),
    ...additional.map((a) => a.channel_id),
  ]);
  const availableChannelsToAdd = channels.filter((c) => !linkedIds.has(c.id));
  const primaryChannel = primary ? channels.find((c) => c.id === primary.channel_id) ?? null : null;

  const funnelById = new Map(workspaceFunnels.map((f) => [f.id, f] as const));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit funnel</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {locked && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex gap-2 text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground mb-0.5">Structure locked</div>
                <div className="text-muted-foreground">
                  A funnel is linked to this route. Target offer and growth system can no longer be changed.
                  Traffic sources remain editable.
                </div>
              </div>
            </div>
          )}

          {/* Target offer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target offer</Label>
            {locked ? (
              <div className="text-sm font-medium">{targetOffer?.name ?? "—"}</div>
            ) : (
              <Select value={targetOfferId ?? ""} onValueChange={(v) => { setTargetOfferId(v); setSystemId(null); }}>
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

          {/* Growth system */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Growth system</Label>
            {locked ? (
              <div className="text-sm font-medium">{systems.find((s) => s.id === route.system_catalog_id)?.label ?? "—"}</div>
            ) : (
              <Select value={systemId ?? ""} onValueChange={(v) => setSystemId(v)}>
                <SelectTrigger><SelectValue placeholder="Pick a compatible system…" /></SelectTrigger>
                <SelectContent>
                  {selectableSystems.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No compatible systems for this offer.</div>
                  )}
                  {selectableSystems.map((s) => (
                    <SelectItem key={s.system.id} value={s.system.id}>{s.system.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* External Channels */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">External channels</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {primaryChannel ? (
                <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-1 border"
                  style={primaryChannel.color ? { borderColor: primaryChannel.color, color: primaryChannel.color } : undefined}>
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-[11px] font-semibold">{primaryChannel.label}</span>
                  <span className="text-[9px] uppercase tracking-wider opacity-75 ml-1">Primary</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] text-muted-foreground italic">No primary channel</Badge>
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
              {availableChannelsToAdd.length > 0 && (
                <div className="flex items-end gap-2">
                  <Select value={addChannelSel} onValueChange={setAddChannelSel}>
                    <SelectTrigger className="h-8 text-xs w-[200px]"><SelectValue placeholder="Add channel…" /></SelectTrigger>
                    <SelectContent>
                      {availableChannelsToAdd.map((c) => (
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
                <Select value={primary?.channel_id ?? ""} onValueChange={(v) => onSetPrimary(route.id, v)}>
                  <SelectTrigger className="h-8 text-xs w-[200px]"><SelectValue placeholder="Change primary…" /></SelectTrigger>
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
              )}
            </div>
          </div>

          {/* Upstream funnels */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upstream funnels</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {upstreamFunnelIds.length === 0 && (
                <Badge variant="outline" className="text-[11px] text-muted-foreground italic">No upstream funnels</Badge>
              )}
              {upstreamFunnelIds.map((fid) => {
                const f = funnelById.get(fid);
                return (
                  <Badge key={fid} variant="outline" className="gap-1 pl-2 pr-0.5 py-1">
                    <Workflow className="w-3 h-3" />
                    <span className="text-[11px]">{f?.name ?? "Unknown funnel"}</span>
                    <Button size="icon" variant="ghost" className="h-4 w-4 hover:text-destructive"
                      onClick={() => handleRemoveFunnel(fid)} aria-label="Remove upstream funnel">
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
            {availableFunnelsToAdd.length > 0 && (
              <div className="flex items-end gap-2 pt-1">
                <Select value={addFunnelSel} onValueChange={setAddFunnelSel}>
                  <SelectTrigger className="h-8 text-xs w-[240px]"><SelectValue placeholder="Add upstream funnel…" /></SelectTrigger>
                  <SelectContent>
                    {availableFunnelsToAdd.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8 gap-1"
                  disabled={!addFunnelSel}
                  onClick={async () => { if (addFunnelSel) await handleAddFunnel(addFunnelSel); }}>
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              {route.funnel_id
                ? "Changes save immediately as funnel-to-funnel connections."
                : "Selections are saved on the route until Start Building creates the connections."}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-route-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea id="edit-route-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this funnel…" rows={3} />
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
