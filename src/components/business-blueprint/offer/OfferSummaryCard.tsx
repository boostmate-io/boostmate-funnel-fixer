// =============================================================================
// OfferSummaryCard — read-only summary of one ecosystem offer.
// Shows the summary already stored on the offer row (for Core offers this is
// produced by summarizeOfferDesign during sync/save). No inputs.
// =============================================================================

import { Sparkles } from "lucide-react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EcosystemOfferRow } from "../useEcosystemOffers";

interface Props {
  offer: EcosystemOfferRow;
  cur: string;
  onEdit: () => void;
  onDelete: () => void;
  /** Opens the Irresistible Offer Builder for this offer. */
  onStrengthen?: () => void;
  /** Read-only relationship lines (registry labels); omitted when none. */
  relationships?: { key: string; text: string }[];
}

const MAX_CHIPS = 3;

function priceLabel(offer: EcosystemOfferRow, cur: string): string | null {
  const p = offer.data?.price;
  const per: Record<string, string> = { monthly: "/month", quarterly: "/quarter", yearly: "/year" };
  const iv = offer.tier === "continuity" ? per[String((offer.data as any)?.billing_interval ?? "")] ?? "" : "";
  if (typeof p === "number" && p > 0) return `${cur}${p.toLocaleString()}${iv}`;
  if (offer.tier === "free" || p === 0) return "Free";
  return null;
}

const MAX_REL_LINES = 2;

const OfferSummaryCard = ({ offer, cur, onEdit, onDelete, onStrengthen, relationships = [] }: Props) => {
  const isPrimary = offer.source === "blueprint_core";
  const canDelete = !isPrimary;
  const name = (offer.name || "").trim();
  const description = (offer.data?.description || "").trim();
  const outcome = (offer.data?.core_outcome || "").trim();
  const types = offer.data?.delivery_types ?? [];
  const price = priceLabel(offer, cur);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className="group flex flex-col rounded-lg border border-border bg-background p-3 text-left cursor-pointer transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-2">
        <span
          className={`flex-1 min-w-0 text-sm font-medium line-clamp-2 ${
            name ? "text-foreground" : "text-muted-foreground italic"
          }`}
        >
          {name || "Untitled Offer"}
        </span>
        {price && (
          <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
            {price}
          </Badge>
        )}
      </div>

      {isPrimary && (
        <Badge variant="outline" className="mt-1.5 w-fit gap-1 text-[10px]">
          <Lock className="w-3 h-3" />
          Primary
        </Badge>
      )}

      {description && (
        <p className="mt-2 text-xs text-foreground/80 line-clamp-2">{description}</p>
      )}
      {outcome && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">→ {outcome}</p>
      )}

      {types.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {types.slice(0, MAX_CHIPS).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {t}
            </span>
          ))}
          {types.length > MAX_CHIPS && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              +{types.length - MAX_CHIPS}
            </span>
          )}
        </div>
      )}

      {relationships.length > 0 && (
        <ul data-card-relationships="" className="mt-2 space-y-0.5">
          {relationships.slice(0, MAX_REL_LINES).map((r) => (
            <li key={r.key} className="truncate text-[11px] text-muted-foreground">{r.text}</li>
          ))}
          {relationships.length > MAX_REL_LINES && (
            <li className="text-[11px] text-muted-foreground">+{relationships.length - MAX_REL_LINES} more</li>
          )}
        </ul>
      )}

      <div className="mt-auto pt-3 flex items-center justify-end gap-1">
        {onStrengthen && (
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-primary hover:bg-primary/5"
            onClick={(e) => { e.stopPropagation(); onStrengthen(); }}>
            <Sparkles className="w-3 h-3" />
            Strengthen with AI
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="w-3 h-3" />
          Edit
        </Button>
        {canDelete && (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete offer"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default OfferSummaryCard;
