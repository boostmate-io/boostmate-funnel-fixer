// =============================================================================
// AddRouteDialog — pick system, source (optional), target, PRIMARY channel.
// Offer-to-offer routes use an existing offer_relationship (source → target);
// a missing one can be created inline, only after an explicit click. A route
// is a separate record: deleting it never deletes the relationship.
// On save: inserts the route, then inserts one growth_architecture_channels
// row with is_primary = true.
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { OFFER_RELATIONSHIP_TYPES, type OfferRelationshipType } from "@shared/blueprintRegistry";
import { supabase } from "@/integrations/supabase/client";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import {
  useAcquisitionChannels,
  useGrowthSystemsCatalog,
  type GrowthArchStatus,
  type OfferRelationshipRow,
} from "@/lib/growth-architecture/hooks";

const REL_TYPES = Object.keys(OFFER_RELATIONSHIP_TYPES) as OfferRelationshipType[];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: EcosystemOfferRow[];
  relationships: OfferRelationshipRow[];
  onCreate: (payload: {
    system_catalog_id: string;
    source_offer_id: string | null;
    target_offer_id: string;
    status: GrowthArchStatus;
    notes: string | null;
  }) => Promise<string | null>;
  onCreated?: () => void;
  /** Creates a missing relationship (useOfferRelationships().add). */
  onCreateRelationship?: (p: { source_offer_id: string; target_offer_id: string; relationship_type: OfferRelationshipType }) => Promise<string | null>;
  /** Current workspace; offers outside it can't be linked. */
  workspaceId?: string | null;
}

const EXTERNAL = "__external__";

const AddRouteDialog = ({ open, onOpenChange, offers: allOffers, relationships, onCreate, onCreated, onCreateRelationship, workspaceId }: Props) => {
  const offers = workspaceId === undefined ? allOffers : allOffers.filter((o) => o.sub_account_id === workspaceId);
  const { rows: systems } = useGrowthSystemsCatalog();
  const { rows: channels } = useAcquisitionChannels();

  const [systemId, setSystemId] = useState<string>("");
  const [sourceId, setSourceId] = useState<string>(EXTERNAL);
  const [targetId, setTargetId] = useState<string>("");
  const [primaryChannelId, setPrimaryChannelId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [relType, setRelType] = useState<OfferRelationshipType>("ascends_to");
  const [creatingRel, setCreatingRel] = useState(false);

  const isExternal = sourceId === EXTERNAL;

  // Any other workspace offer can be a target; the route needs a matching relationship.
  const validTargets = useMemo(
    () => (isExternal ? offers : offers.filter((o) => o.id !== sourceId)),
    [isExternal, sourceId, offers],
  );
  const existingRels = !isExternal && targetId
    ? relationships.filter((r) => r.source_offer_id === sourceId && r.target_offer_id === targetId)
    : [];
  const needsRelationship = !isExternal && !!targetId && existingRels.length === 0;

  const canSave =
    !!systemId &&
    !!targetId &&
    !!primaryChannelId &&
    (isExternal || (validTargets.some((o) => o.id === targetId) && !needsRelationship));

  const createRelationship = async () => {
    if (!onCreateRelationship || creatingRel || !needsRelationship) return;
    setCreatingRel(true);
    try {
      const id = await onCreateRelationship({ source_offer_id: sourceId, target_offer_id: targetId, relationship_type: relType });
      if (id) toast.success("Offer relationship created");
    } finally { setCreatingRel(false); }
  };

  const reset = () => {
    setSystemId("");
    setSourceId(EXTERNAL);
    setTargetId("");
    setPrimaryChannelId("");
    setNotes("");
    setRelType("ascends_to");
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const id = await onCreate({
      system_catalog_id: systemId,
      source_offer_id: isExternal ? null : sourceId,
      target_offer_id: targetId,
      status: "planned",
      notes: notes.trim() ? notes.trim() : null,
    });
    // Route failed: nothing is half-created (a relationship made above stays valid on its own).
    if (!id) { setSaving(false); return; }

    const { error } = await supabase
      .from("growth_architecture_channels")
      .insert({
        architecture_system_id: id,
        channel_id: primaryChannelId,
        is_primary: true,
        sort_order: 0,
      });
    setSaving(false);
    if (error) {
      toast.error("Route created but primary channel could not be attached");
    } else {
      onCreated?.();
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
              <p className="text-[11px] text-muted-foreground mt-1">There are no other offers in this workspace to route to yet.</p>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Target offer</Label>
            <Select value={targetId} onValueChange={setTargetId} disabled={!isExternal && validTargets.length === 0}>
              <SelectTrigger aria-label="Target offer"><SelectValue placeholder="Pick the target offer…" /></SelectTrigger>
              <SelectContent>
                {validTargets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isExternal && targetId && existingRels.length > 0 && (
              <p data-route-relationship="existing" className="text-[11px] text-muted-foreground mt-1">
                Uses the existing relationship: {existingRels.map((r) => OFFER_RELATIONSHIP_TYPES[r.relationship_type]?.outgoing ?? r.relationship_type).join(", ")}.
              </p>
            )}
            {needsRelationship && (
              <div data-route-relationship="missing" className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground">
                  These offers aren't linked yet. Choose how customers move from the source offer to this one, then create the relationship to continue.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={relType} onValueChange={(v) => setRelType(v as OfferRelationshipType)}>
                    <SelectTrigger aria-label="Relationship type" className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{OFFER_RELATIONSHIP_TYPES[t].outgoing} · {OFFER_RELATIONSHIP_TYPES[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" className="h-8 text-xs" disabled={!onCreateRelationship || creatingRel} onClick={() => void createRelationship()}>
                    {creatingRel && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Create relationship
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Primary acquisition channel</Label>
            <Select value={primaryChannelId} onValueChange={setPrimaryChannelId}>
              <SelectTrigger><SelectValue placeholder="Pick the primary channel…" /></SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              You can add additional channels after the route is created.
            </p>
          </div>

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
