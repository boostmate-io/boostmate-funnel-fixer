// Read-only Customer Journey overview: saved offer relationships as
// "Source → Target", grouped by relationship type (registry labels).
import { useState } from "react";
import { ArrowRight, ChevronDown, Repeat, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OFFER_RELATIONSHIP_TYPES, type OfferRelationshipType, type OfferTier } from "@shared/blueprintRegistry";
import { ECOSYSTEM_TIERS } from "../offerDesignTypes";
import { edgesInCycles, type SummaryRel } from "@/lib/offers/relationshipSummary";

interface Props {
  offers: { id: string; name: string; tier: OfferTier }[];
  rows: SummaryRel[];
  loading?: boolean;
  loadFailed?: boolean;
  defaultOpen?: boolean;
}

const TYPES = Object.keys(OFFER_RELATIONSHIP_TYPES) as OfferRelationshipType[];
const tierLabel = (t?: OfferTier) => ECOSYSTEM_TIERS.find((x) => x.id === t)?.label ?? "";

export default function CustomerJourneyOverview({ offers, rows, loading, loadFailed, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const byId = new Map(offers.map((o) => [o.id, o]));
  const visible = rows.filter((r) => byId.has(r.source_offer_id) && byId.has(r.target_offer_id));
  const loops = edgesInCycles(visible);

  return (
    <Collapsible open={open} onOpenChange={setOpen} data-customer-journey="" className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left">
        <Route className="h-4 w-4 text-primary" />
        <span className="flex-1 text-sm font-semibold text-foreground">Customer Journey</span>
        <Badge variant="secondary" className="text-[10px]">{visible.length} {visible.length === 1 ? "link" : "links"}</Badge>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-border px-4 py-3">
        {loadFailed ? (
          <p className="text-xs text-muted-foreground">Couldn't load your offer relationships. Try again later.</p>
        ) : loading && !visible.length ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : !visible.length ? (
          <p data-journey-empty="" className="text-xs text-muted-foreground">
            No offers are linked yet. Open an offer and use its Ecosystem section to show where customers come from and go next.
          </p>
        ) : (
          <>
            {TYPES.map((t) => {
              const list = visible.filter((r) => r.relationship_type === t);
              if (!list.length) return null;
              return (
                <div key={t} data-journey-group={t} className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">{OFFER_RELATIONSHIP_TYPES[t].label}</p>
                  <ul className="space-y-1.5">
                    {list.map((r) => {
                      const s = byId.get(r.source_offer_id)!; const g = byId.get(r.target_offer_id)!;
                      return (
                        <li key={r.id} data-journey-edge={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-sm">
                          <span className="font-medium text-foreground">{s.name || "Untitled Offer"}</span>
                          <span className="text-[11px] text-muted-foreground">{tierLabel(s.tier)}</span>
                          <span className="flex items-center gap-1 text-xs text-primary"><ArrowRight className="h-3.5 w-3.5" />{OFFER_RELATIONSHIP_TYPES[t].outgoing}</span>
                          <span className="font-medium text-foreground">{g.name || "Untitled Offer"}</span>
                          <span className="text-[11px] text-muted-foreground">{tierLabel(g.tier)}</span>
                          {loops.has(r.id) && <Badge variant="outline" className="gap-1 text-[10px]"><Repeat className="h-3 w-3" />Loop</Badge>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {loops.size > 0 && <p className="text-[11px] text-muted-foreground">Links marked "Loop" bring customers back to an earlier offer.</p>}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
