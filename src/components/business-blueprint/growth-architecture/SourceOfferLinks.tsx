// =============================================================================
// SourceOfferLinks — optional offer linking in the Add Route wizard's Traffic
// Sources step. For each selected source funnel's offer (deduplicated), shows
// whether an offer relationship source offer → target offer exists, and offers
// an explicit "Link these offers" action when it doesn't. Never required for
// the route; never creates funnel connections; failures never block the wizard.
// =============================================================================

import { useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OFFER_RELATIONSHIP_TYPES, type OfferRelationshipType } from "@shared/blueprintRegistry";
import type { OfferRelationshipRow } from "@/lib/growth-architecture/hooks";

const TYPES = Object.keys(OFFER_RELATIONSHIP_TYPES) as OfferRelationshipType[];

export interface SourceLinkOffer { id: string; name: string; sub_account_id: string | null }
export interface SourceLinkFunnel { id: string; name: string; linked_offer_id: string | null }

interface Props {
  targetOfferId: string | null;
  workspaceId: string | null;
  offers: SourceLinkOffer[];
  selectedFunnels: SourceLinkFunnel[];
  relationships: OfferRelationshipRow[];
  onCreateRelationship: (p: { source_offer_id: string; target_offer_id: string; relationship_type: OfferRelationshipType }) => Promise<string | null>;
}

/** Unique, linkable source offers for the selected funnels (same workspace, not the target). */
export function linkableSourceOffers(p: Pick<Props, "targetOfferId" | "workspaceId" | "offers" | "selectedFunnels">) {
  const byId = new Map(p.offers.map((o) => [o.id, o]));
  const target = p.targetOfferId ? byId.get(p.targetOfferId) : undefined;
  if (!target || !p.workspaceId || target.sub_account_id !== p.workspaceId) return [];
  const out = new Map<string, { offer: SourceLinkOffer; funnels: string[] }>();
  for (const f of p.selectedFunnels) {
    const o = f.linked_offer_id ? byId.get(f.linked_offer_id) : undefined;
    if (!o || o.id === target.id || o.sub_account_id !== p.workspaceId) continue;
    const entry = out.get(o.id) ?? { offer: o, funnels: [] };
    entry.funnels.push(f.name);
    out.set(o.id, entry);
  }
  return [...out.values()];
}

export default function SourceOfferLinks(props: Props) {
  const { targetOfferId, relationships, onCreateRelationship } = props;
  const items = linkableSourceOffers(props);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [type, setType] = useState<OfferRelationshipType>("ascends_to");
  const [busy, setBusy] = useState<string | null>(null);
  if (!items.length || !targetOfferId) return null;
  const targetName = props.offers.find((o) => o.id === targetOfferId)?.name || "this offer";

  const create = async (sourceId: string) => {
    if (busy) return;
    setBusy(sourceId);
    try {
      const id = await onCreateRelationship({ source_offer_id: sourceId, target_offer_id: targetOfferId, relationship_type: type });
      if (id) { toast.success("Offers linked"); setOpenFor(null); }
    } catch {
      toast.error("Could not link these offers. You can still continue.");
    } finally { setBusy(null); }
  };

  return (
    <div data-source-offer-links="" className="space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Link2 className="w-3 h-3" /> Offer links (optional)
      </div>
      <ul className="space-y-1.5">
        {items.map(({ offer, funnels }) => {
          const existing = relationships.filter((r) => r.source_offer_id === offer.id && r.target_offer_id === targetOfferId);
          return (
            <li key={offer.id} data-source-offer={offer.id} className="rounded-md border border-border px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-foreground">
                  <span className="font-medium">{offer.name || "Untitled Offer"}</span>
                  <span className="text-muted-foreground"> → {targetName}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">via {funnels.join(", ")}</span>
                </span>
                {existing.length > 0 ? (
                  <span data-link-status="connected" className="flex items-center gap-1 text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    Connected: {existing.map((r) => OFFER_RELATIONSHIP_TYPES[r.relationship_type]?.outgoing ?? r.relationship_type).join(", ")}
                  </span>
                ) : openFor !== offer.id ? (
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpenFor(offer.id)}>Link these offers</Button>
                ) : null}
              </div>
              {existing.length === 0 && openFor === offer.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Select value={type} onValueChange={(v) => setType(v as OfferRelationshipType)}>
                    <SelectTrigger aria-label="Relationship type" className="h-8 w-60 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{OFFER_RELATIONSHIP_TYPES[t].outgoing} · {OFFER_RELATIONSHIP_TYPES[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" className="h-8 text-xs" disabled={busy === offer.id} onClick={() => void create(offer.id)}>
                    {busy === offer.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Create link
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setOpenFor(null)}>Cancel</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">Linking offers is optional and doesn't change this route.</p>
    </div>
  );
}
