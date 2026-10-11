// =============================================================================
// OfferRelationshipsSection — shared Ecosystem section for every offer editor.
// Presentation + interaction only; relationships persist immediately through
// the `relationships` controller (useOfferRelationships), never via the offer
// design autosave. Labels, types and category suggestions come from the registry.
// =============================================================================

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  OFFER_ECOSYSTEM_SECTION_COPY as COPY,
  OFFER_RELATIONSHIP_TYPES,
  OFFER_TIERS,
  suggestedTiersFor,
  type OfferRelationshipDirection,
  type OfferRelationshipType,
  type OfferTier,
} from "@shared/blueprintRegistry";
import { ECOSYSTEM_TIERS } from "../offerDesignTypes";
import { RELATIONSHIP_ERROR_TEXT, type OfferRelationshipRow, type RelationshipError } from "@/lib/growth-architecture/hooks";
import { relationshipEndpoints, wouldCreateCycle } from "@/lib/offers/relationshipGraph";

export interface RelationshipOffer { id: string; name: string; tier: OfferTier; sub_account_id: string | null }

export interface RelationshipsController {
  rows: OfferRelationshipRow[];
  loading: boolean;
  add: (p: { source_offer_id: string; target_offer_id: string; relationship_type: OfferRelationshipType }) => Promise<string | null>;
  remove: (id: string) => Promise<boolean | void>;
  lastError?: RelationshipError | null;
}

interface Props {
  offerId: string;
  tier: OfferTier;
  workspaceId: string | null;
  offers: RelationshipOffer[];
  relationships: RelationshipsController;
}

const TYPES = Object.keys(OFFER_RELATIONSHIP_TYPES) as OfferRelationshipType[];
const tierLabel = (t: OfferTier) => ECOSYSTEM_TIERS.find((x) => x.id === t)?.label ?? t;

export default function OfferRelationshipsSection({ offerId, tier, workspaceId, offers, relationships }: Props) {
  const { rows, loading, add, remove } = relationships;
  const [adding, setAdding] = useState(false);
  const [direction, setDirection] = useState<OfferRelationshipDirection>("outgoing");
  const [type, setType] = useState<OfferRelationshipType>("ascends_to");
  const [otherId, setOtherId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  const byId = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers]);
  const current = byId.get(offerId);
  const canLink = !!workspaceId && current?.sub_account_id === workspaceId;
  const incoming = rows.filter((r) => r.target_offer_id === offerId);
  const outgoing = rows.filter((r) => r.source_offer_id === offerId);

  const endpoints = otherId ? relationshipEndpoints(direction, offerId, otherId) : null;
  const isDuplicate = (id: string) => {
    const e = relationshipEndpoints(direction, offerId, id);
    return rows.some((r) => r.source_offer_id === e.source_offer_id && r.target_offer_id === e.target_offer_id && r.relationship_type === type);
  };
  const cycle = !!endpoints && wouldCreateCycle(rows, endpoints.source_offer_id, endpoints.target_offer_id);

  const suggested = suggestedTiersFor(tier, type, direction);
  const tierOrder = [...suggested, ...OFFER_TIERS.filter((t) => !suggested.includes(t))];
  const candidates = offers.filter((o) => o.id !== offerId);

  const resetForm = () => { setAdding(false); setOtherId(""); };

  const submit = async () => {
    if (!endpoints || saving || isDuplicate(otherId)) return;
    setSaving(true);
    try {
      const id = await add({ ...endpoints, relationship_type: type });
      if (id) { toast.success("Relationship saved"); resetForm(); }
    } finally { setSaving(false); }
  };

  const doRemove = async (id: string) => {
    if (removing.has(id)) return;
    setRemoving((s) => new Set(s).add(id));
    try {
      const ok = await remove(id);
      if (ok !== false) toast.success("Relationship removed");
    } finally {
      setRemoving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const renderRow = (r: OfferRelationshipRow, dir: OfferRelationshipDirection) => {
    const other = byId.get(dir === "incoming" ? r.source_offer_id : r.target_offer_id);
    const busy = removing.has(r.id);
    return (
      <li key={r.id} data-relationship-row={r.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
        <Badge variant="secondary" className="shrink-0 text-[10px]">{OFFER_RELATIONSHIP_TYPES[r.relationship_type]?.[dir] ?? r.relationship_type}</Badge>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{other?.name || "Unknown offer"}</p>
          <p className="text-xs text-muted-foreground">{other ? tierLabel(other.tier) : "Not in this workspace"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={busy}
          aria-label={`Remove relationship with ${other?.name ?? "offer"}`} onClick={() => void doRemove(r.id)}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </Button>
      </li>
    );
  };

  const group = (dir: OfferRelationshipDirection, list: OfferRelationshipRow[]) => (
    <div data-relationship-group={dir} className="space-y-2">
      <div className="flex items-center gap-1.5">
        {dir === "incoming" ? <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <Label className="text-xs font-semibold text-foreground">{dir === "incoming" ? COPY.incoming : COPY.outgoing}</Label>
      </div>
      {list.length ? <ul className="space-y-1.5">{list.map((r) => renderRow(r, dir))}</ul>
        : <p className="text-xs text-muted-foreground">{dir === "incoming" ? COPY.incomingHelper : COPY.outgoingHelper} None yet.</p>}
    </div>
  );

  return (
    <section data-offer-section="ecosystem" aria-label={COPY.title} className="space-y-3">
      <div>
        <h3 className="text-base font-display font-bold text-foreground">{COPY.title}</h3>
        <p className="text-xs text-muted-foreground">{COPY.helper}</p>
      </div>
      {loading && rows.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading relationships…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{group("incoming", incoming)}{group("outgoing", outgoing)}</div>
      )}

      {!canLink ? (
        <p className="text-xs text-muted-foreground">This offer isn't assigned to a workspace yet, so it can't be linked.</p>
      ) : !adding ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Add relationship</Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Direction</Label>
              <Select value={direction} onValueChange={(v) => { setDirection(v as OfferRelationshipDirection); setOtherId(""); }}>
                <SelectTrigger aria-label="Direction" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">{COPY.incoming}</SelectItem>
                  <SelectItem value="outgoing">{COPY.outgoing}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Relationship</Label>
              <Select value={type} onValueChange={(v) => { setType(v as OfferRelationshipType); setOtherId(""); }}>
                <SelectTrigger aria-label="Relationship type" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{OFFER_RELATIONSHIP_TYPES[t][direction]} · {OFFER_RELATIONSHIP_TYPES[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Offer</Label>
              <Select value={otherId} onValueChange={setOtherId}>
                <SelectTrigger aria-label="Related offer" className="h-9 text-sm"><SelectValue placeholder="Choose an offer" /></SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No other offers yet.</div>}
                  {tierOrder.map((t) => {
                    const list = candidates.filter((o) => o.tier === t);
                    if (!list.length) return null;
                    return (
                      <SelectGroup key={t}>
                        <SelectLabel className="text-xs">{tierLabel(t)}{suggested.includes(t) ? " · Suggested" : ""}</SelectLabel>
                        {list.map((o) => {
                          const foreign = o.sub_account_id !== workspaceId;
                          const dup = isDuplicate(o.id);
                          return (
                            <SelectItem key={o.id} value={o.id} disabled={foreign || dup}>
                              {o.name || "Untitled Offer"}{foreign ? " (no workspace)" : dup ? " (already linked)" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          {cycle && (
            <p role="status" data-cycle-warning="" className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {COPY.cycleWarning}
            </p>
          )}
          {relationships.lastError && relationships.lastError !== "duplicate" && !saving && (
            <p className="text-xs text-destructive">{RELATIONSHIP_ERROR_TEXT[relationships.lastError]}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={saving}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => void submit()} disabled={!otherId || saving}>
              {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Save relationship
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
