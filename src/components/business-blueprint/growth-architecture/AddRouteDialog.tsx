// =============================================================================
// AddRouteDialog — pick system, source (optional), target, channel, status.
// Offer-to-offer routes are constrained to existing offer_relationships.
// =============================================================================

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import {
  useAcquisitionChannels,
  useGrowthSystemsCatalog,
  type GrowthArchStatus,
  type OfferRelationshipRow,
} from "@/lib/growth-architecture/hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[];
  onCreate: (payload: {
    system_catalog_id: string;
    source_offer_id: string | null;
    target_offer_id: string;
    acquisition_channel_id: string | null;
    status: GrowthArchStatus;
    notes: string | null;
  }) => Promise<string | null>;
}

const EXTERNAL = "__external__";
const NONE = "__none__";

const AddRouteDialog = ({ open, onOpenChange, offers, relationships, onCreate }: Props) => {
  const { rows: systems } = useGrowthSystemsCatalog();
  const { rows: channels } = useAcquisitionChannels();

  const [systemId, setSystemId] = useState<string>("");
  const [sourceId, setSourceId] = useState<string>(EXTERNAL);
  const [targetId, setTargetId] = useState<string>("");
  const [channelId, setChannelId] = useState<string>(NONE);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isExternal = sourceId === EXTERNAL;

  // For offer-to-offer routes, only allow target offers that have an existing relationship.
  const validTargets = useMemo(() => {
    if (isExternal) return offers;
    const targets = new Set(
      relationships.filter((r) => r.source_offer_id === sourceId).map((r) => r.target_offer_id),
    );
    return offers.filter((o) => targets.has(o.id));
  }, [isExternal, sourceId, offers, relationships]);

  const canSave = !!systemId && !!targetId && (isExternal || validTargets.some((o) => o.id === targetId));

  const reset = () => {
    setSystemId("");
    setSourceId(EXTERNAL);
    setTargetId("");
    setChannelId(NONE);
    setNotes("");
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const id = await onCreate({
      system_catalog_id: systemId,
      source_offer_id: isExternal ? null : sourceId,
      target_offer_id: targetId,
      acquisition_channel_id: channelId === NONE ? null : channelId,
      // Status is DERIVED (see deriveRouteState). We insert "planned" as a
      // neutral placeholder to satisfy the NOT NULL constraint on the legacy
      // column — the UI never reads it.
      status: "planned",
      notes: notes.trim() ? notes.trim() : null,
    });
    setSaving(false);
    if (id) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Growth Route</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">System</Label>
            <Select value={systemId} onValueChange={setSystemId}>
              <SelectTrigger><SelectValue placeholder="Pick a growth system…" /></SelectTrigger>
              <SelectContent>
                {systems.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Source</Label>
            <Select
              value={sourceId}
              onValueChange={(v) => {
                setSourceId(v);
                setTargetId("");
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EXTERNAL}>External acquisition (no source offer)</SelectItem>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>From: {o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isExternal && validTargets.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                No offer relationships exist from this offer yet. Add a "Next offer" on the source offer first.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Target offer</Label>
            <Select
              value={targetId}
              onValueChange={setTargetId}
              disabled={!isExternal && validTargets.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Pick the target offer…" /></SelectTrigger>
              <SelectContent>
                {validTargets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isExternal && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Acquisition channel (optional)</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specifics about this route…"
              rows={2}
            />
          </div>

          <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
            Implementation state is derived automatically from your architecture,
            linked funnels and Growth Roadmap — you don't set it manually.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Adding…" : "Add Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddRouteDialog;
