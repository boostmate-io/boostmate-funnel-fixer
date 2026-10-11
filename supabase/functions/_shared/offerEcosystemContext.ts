// =============================================================================
// Read-only ecosystem context for the active offer (all six categories,
// incl. the Primary Core Offer). Includes incoming/outgoing relationships, related offer names +
// categories and funnels linked to the active offer. Every row is filtered to
// the authorized workspace. Nothing here is AI-writable.
// =============================================================================

import { OFFER_RELATIONSHIP_TYPES, type OfferRelationshipType } from "./blueprintRegistry.ts";
import { TIER_LABELS } from "./offerContext.ts";

export interface EcoOfferRow { id: string; name: string | null; tier: string | null; sub_account_id: string | null }
export interface EcoRelationshipRow {
  source_offer_id: string; target_offer_id: string; relationship_type: string; sub_account_id: string | null;
}
export interface EcoFunnelRow { id: string; name: string | null; linked_offer_id: string | null; sub_account_id: string | null; status?: string | null }

export interface OfferEcosystemContext {
  readOnly: true;
  incoming: { offerId: string; name: string; tier: string; relationship: string }[];
  outgoing: { offerId: string; name: string; tier: string; relationship: string }[];
  funnels: { id: string; name: string; status: string | null }[];
}

export function buildOfferEcosystemContext(input: {
  activeOfferId: string;
  subAccountId: string;
  offers: EcoOfferRow[];
  relationships: EcoRelationshipRow[];
  funnels: EcoFunnelRow[];
}): OfferEcosystemContext {
  const ws = input.subAccountId;
  const offers = new Map(input.offers.filter((o) => o.sub_account_id === ws).map((o) => [o.id, o]));
  const describe = (id: string, type: string) => {
    const o = offers.get(id);
    if (!o) return null; // other-workspace or missing offers are never included
    return { offerId: o.id, name: (o.name ?? "").trim() || "Untitled offer", tier: o.tier ?? "", relationship: type };
  };
  const rels = input.relationships.filter(
    (r) => r.sub_account_id === ws && r.relationship_type in OFFER_RELATIONSHIP_TYPES,
  );
  const outgoing = rels.filter((r) => r.source_offer_id === input.activeOfferId)
    .map((r) => describe(r.target_offer_id, r.relationship_type)).filter(Boolean) as OfferEcosystemContext["outgoing"];
  const incoming = rels.filter((r) => r.target_offer_id === input.activeOfferId)
    .map((r) => describe(r.source_offer_id, r.relationship_type)).filter(Boolean) as OfferEcosystemContext["incoming"];
  const funnels = input.funnels
    .filter((f) => f.sub_account_id === ws && f.linked_offer_id === input.activeOfferId)
    .map((f) => ({ id: f.id, name: (f.name ?? "").trim() || "Untitled funnel", status: f.status ?? null }));
  return { readOnly: true, incoming, outgoing, funnels };
}

/** How to interpret the ecosystem layer (offer context only — not the global prompt). */
export const OFFER_ECOSYSTEM_RULES = [
  "How to use this:",
  "- Consider the active offer's role in the business, but offer links describe possible customer journeys, not mandatory steps.",
  "- An offer can be standalone; multiple entry points and journeys are valid. Missing links don't make an offer incomplete.",
  "- Funnels are acquisition/conversion mechanisms, not offer design fields.",
  "- You may suggest links or funnel improvements in conversation, but you cannot create or change them.",
].join("\n");

export type EcosystemLoadStatus = "loaded" | "unavailable";

export function renderOfferEcosystemContext(ctx: OfferEcosystemContext | null, status: EcosystemLoadStatus = "loaded"): string {
  const label = (t: string, dir: "incoming" | "outgoing") =>
    OFFER_RELATIONSHIP_TYPES[t as OfferRelationshipType]?.[dir] ?? t;
  const lines = ["## Offer ecosystem (READ-ONLY — never propose changes to relationships or funnels)"];
  if (status === "unavailable" || !ctx) {
    lines.push("Offer links and funnels couldn't be loaded for this turn. Do NOT assume this offer has none; if it matters, ask the user.");
    lines.push(OFFER_ECOSYSTEM_RULES);
    return lines.join("\n");
  }
  if (!ctx.incoming.length && !ctx.outgoing.length) lines.push("Offer links: none recorded (loaded successfully).");
  if (!ctx.funnels.length) lines.push("Funnels linked to this offer: none recorded (loaded successfully).");
  for (const r of ctx.incoming) lines.push(`- ${label(r.relationship, "incoming")}: "${r.name}" (${TIER_LABELS[r.tier] ?? r.tier})`);
  for (const r of ctx.outgoing) lines.push(`- ${label(r.relationship, "outgoing")}: "${r.name}" (${TIER_LABELS[r.tier] ?? r.tier})`);
  for (const f of ctx.funnels) lines.push(`- Funnel: "${f.name}"${f.status ? ` (${f.status})` : ""}`);
  lines.push(OFFER_ECOSYSTEM_RULES);
  return lines.join("\n");
}
