// Read-only relationship summaries for Offer Ecosystem cards / Customer Journey.
// Labels come from the registry; nothing is stored on offer rows.
import { OFFER_RELATIONSHIP_TYPES, type OfferRelationshipDirection, type OfferRelationshipType } from "@shared/blueprintRegistry";
import { wouldCreateCycle } from "./relationshipGraph";

export interface SummaryRel { id: string; source_offer_id: string; target_offer_id: string; relationship_type: OfferRelationshipType }
export interface SummaryLine { key: string; direction: OfferRelationshipDirection; type: OfferRelationshipType; label: string; names: string[]; text: string }

const DIR_ORDER: OfferRelationshipDirection[] = ["incoming", "outgoing"];

/** One line per (direction, type): "Ascends to: Core Coaching, +1". */
export function summarizeOfferRelationships(
  offerId: string, rows: SummaryRel[], nameOf: (id: string) => string | undefined, maxNames = 1,
): SummaryLine[] {
  const groups = new Map<string, SummaryLine>();
  for (const dir of DIR_ORDER) {
    for (const r of rows) {
      const mine = dir === "incoming" ? r.target_offer_id === offerId : r.source_offer_id === offerId;
      if (!mine) continue;
      const otherId = dir === "incoming" ? r.source_offer_id : r.target_offer_id;
      const key = `${dir}:${r.relationship_type}`;
      const g = groups.get(key) ?? { key, direction: dir, type: r.relationship_type, label: OFFER_RELATIONSHIP_TYPES[r.relationship_type]?.[dir] ?? r.relationship_type, names: [], text: "" };
      g.names.push(nameOf(otherId) || "Untitled Offer");
      groups.set(key, g);
    }
  }
  return [...groups.values()].map((g) => {
    const shown = g.names.slice(0, maxNames).join(", ");
    const more = g.names.length - maxNames;
    return { ...g, text: `${g.label}: ${shown}${more > 0 ? `, +${more}` : ""}` };
  });
}

/** Edges that sit on a loop (their target can reach back to their source). */
export function edgesInCycles(rows: SummaryRel[]): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    const others = rows.filter((x) => x.id !== r.id);
    if (wouldCreateCycle(others, r.source_offer_id, r.target_offer_id)) out.add(r.id);
  }
  return out;
}
