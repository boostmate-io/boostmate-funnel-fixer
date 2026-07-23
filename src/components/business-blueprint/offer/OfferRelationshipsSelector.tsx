// =============================================================================
// OfferRelationshipsSelector — inline chip picker for offer-to-offer relationships.
// Used inside each ecosystem offer card. Writes to public.offer_relationships.
// =============================================================================

import { useMemo } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { EcosystemOfferRow } from "../useEcosystemOffers";
import {
  useCurrentWorkspaceRelationships,
  type OfferRelationshipType,
} from "@/lib/growth-architecture/hooks";

const REL_LABEL: Record<OfferRelationshipType, string> = {
  ascends_to: "Ascends to",
  leads_into: "Leads into",
  retention: "Retention",
  downsell: "Downsell",
};

interface Props {
  offer: EcosystemOfferRow;
  offers: EcosystemOfferRow[];
}

const OfferRelationshipsSelector = ({ offer, offers }: Props) => {
  const { rows, add, remove } = useCurrentWorkspaceRelationships();

  const outgoing = useMemo(
    () => rows.filter((r) => r.source_offer_id === offer.id),
    [rows, offer.id],
  );

  const candidates = useMemo(
    () => offers.filter((o) => o.id !== offer.id),
    [offers, offer.id],
  );

  const handleAdd = async (target: EcosystemOfferRow, type: OfferRelationshipType) => {
    await add({
      source_offer_id: offer.id,
      target_offer_id: target.id,
      relationship_type: type,
    });
  };

  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        Next offer(s)
      </Label>
      <div className="flex flex-wrap gap-1.5 items-center">
        {outgoing.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            No connections yet
          </span>
        )}
        {outgoing.map((rel) => {
          const target = offers.find((o) => o.id === rel.target_offer_id);
          return (
            <Badge
              key={rel.id}
              variant="secondary"
              className="gap-1.5 pl-2 pr-1 py-1 text-xs"
            >
              <span className="text-muted-foreground">
                {REL_LABEL[rel.relationship_type]}
              </span>
              <span className="font-medium">
                {target?.name ?? "Unknown"}
              </span>
              <button
                onClick={() => remove(rel.id)}
                className="ml-0.5 rounded hover:bg-background/60 p-0.5"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}

        {candidates.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs px-2"
              >
                <Plus className="w-3 h-3" />
                Add
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
              {(Object.keys(REL_LABEL) as OfferRelationshipType[]).map((type) => (
                <div key={type}>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {REL_LABEL[type]}
                  </DropdownMenuLabel>
                  {candidates.map((c) => {
                    const exists = outgoing.some(
                      (r) => r.target_offer_id === c.id && r.relationship_type === type,
                    );
                    return (
                      <DropdownMenuItem
                        key={`${type}-${c.id}`}
                        disabled={exists}
                        onSelect={() => handleAdd(c, type)}
                        className="text-xs"
                      >
                        <span className="truncate">{c.name}</span>
                        {exists && (
                          <span className="ml-auto text-[10px] text-muted-foreground">added</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default OfferRelationshipsSelector;
