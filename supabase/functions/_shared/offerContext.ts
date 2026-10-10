// =============================================================================
// Offer-aware Coach context — pure helpers shared by `coach-chat` and tests.
//
// Three layers, always rendered separately:
//   1. Active Offer   — the offer being edited (server-verified identity).
//   2. Related Offers — the rest of the workspace's offer ecosystem.
//   3. Blueprint      — broader business context (for an additional offer the
//                       Primary's `offer_stack` is moved out of this layer).
//
// No Deno / network imports: this file is imported by vitest as well.
// =============================================================================

export type OfferTier = "free" | "low_ticket" | "mid_ticket" | "core" | "premium" | "continuity";

/** What the client claims (untrusted). */
export interface ClaimedActiveOffer {
  id?: unknown;
  isPrimary?: unknown;
  name?: unknown;
  tier?: unknown;
  /** Local editor design, possibly including unsaved edits. */
  draftDesign?: unknown;
}

/** Minimal `public.offers` row shape the server loads. */
export interface OfferRowLite {
  id: string;
  name: string | null;
  tier: string | null;
  source: string | null;
  sub_account_id: string | null;
  blueprint_id?: string | null;
  sort_order?: number | null;
  data?: Record<string, any> | null;
}

/** Server-verified active offer. */
export interface VerifiedActiveOffer {
  id: string;
  name: string;
  tier: OfferTier | string;
  isPrimary: boolean;
  /** Design used as working context (draft when supplied, else stored). */
  design: Record<string, any>;
  /** True when the design came from unsaved editor state. */
  hasDraft: boolean;
}

export type ResolveResult =
  | { kind: "none" }
  | { kind: "primary" }
  | { kind: "additional"; offer: VerifiedActiveOffer }
  | { kind: "rejected"; reason: "offer_not_found" | "offer_wrong_workspace" | "invalid_offer_id" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TIER_LABELS: Record<string, string> = {
  free: "Free Offer / Lead Magnet",
  low_ticket: "Low-Ticket Offer",
  mid_ticket: "Mid-Ticket Offer",
  core: "Core Offer",
  premium: "Premium Offer",
  continuity: "Continuity Offer",
};
/** Value-ladder order — used to describe relationships between offers. */
export const TIER_ORDER: string[] = ["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"];

/** Did the client send any active-offer claim? */
export function hasActiveOfferClaim(claimed: ClaimedActiveOffer | null | undefined): boolean {
  return !!claimed && typeof claimed === "object" && claimed.id != null && claimed.id !== "";
}

/**
 * Verify a client claim against the loaded DB row. Identity (name, tier,
 * primary status, workspace) ALWAYS comes from the row; the client only
 * contributes the draft design.
 */
export function resolveActiveOffer(
  claimed: ClaimedActiveOffer | null | undefined,
  row: OfferRowLite | null,
  subAccountId: string,
): ResolveResult {
  if (!hasActiveOfferClaim(claimed)) return { kind: "none" };
  const id = String(claimed!.id);
  if (id === "primary") return { kind: "primary" };
  if (!UUID_RE.test(id)) return { kind: "rejected", reason: "invalid_offer_id" };
  if (!row || row.id !== id) return { kind: "rejected", reason: "offer_not_found" };
  if (row.sub_account_id !== subAccountId) return { kind: "rejected", reason: "offer_wrong_workspace" };
  if (row.source === "blueprint_core") return { kind: "primary" };
  const stored = (row.data?.design ?? null) as Record<string, any> | null;
  const draft = claimed!.draftDesign;
  const hasDraft = !!draft && typeof draft === "object" && !Array.isArray(draft);
  return {
    kind: "additional",
    offer: {
      id: row.id,
      name: (row.name ?? "").trim() || "Untitled offer",
      tier: row.tier ?? "core",
      isPrimary: false,
      design: (hasDraft ? draft : stored ?? {}) as Record<string, any>,
      hasDraft,
    },
  };
}

/** Blueprint row minus the Primary's offer design (for additional offers). */
export function blueprintWithoutOfferDesign<T extends Record<string, any>>(bp: T | null | undefined) {
  if (!bp) return bp ?? null;
  const { offer_stack: _omit, ...rest } = bp;
  return rest;
}

const isBlank = (v: unknown): boolean => {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.every(isBlank);
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).every(isBlank);
  return false;
};

/**
 * True when the offer's DEFINING fields are all empty: Short Offer
 * Description, Core Outcome, Core Transformation Promise and Signature
 * Framework. A name or isolated differentiation fields don't count.
 */
export function isOfferUndefined(design: Record<string, any> | null | undefined): boolean {
  const angle = design?.angle ?? {};
  return (
    isBlank(angle.short_description) &&
    isBlank(angle.core_outcome) &&
    isBlank(angle.core_promise) &&
    isBlank(angle.framework)
  );
}
/** @deprecated kept as alias — use isOfferUndefined. */
export const isDesignMostlyEmpty = isOfferUndefined;

export function renderActiveOfferSection(offer: VerifiedActiveOffer): string {
  const tier = TIER_LABELS[offer.tier] ?? offer.tier;
  const empty = isOfferUndefined(offer.design);
  return [
    "# ACTIVE OFFER — authoritative working context",
    `You are working on ONE specific offer: "${offer.name}" (id ${offer.id}, ${tier}, additional offer — NOT the Primary Core Offer).`,
    "Every field and section you discuss, every proposal and every Blueprint write in this turn belongs to THIS offer only.",
    "Write paths keep the `offer_stack.*` form; they are applied to this offer, never to the Primary Core Offer.",
    offer.hasDraft
      ? "The design below is the editor's current state and may include unsaved draft edits; treat it as the latest truth for this offer."
      : "",
    empty
      ? [
          "## UNDEFINED OFFER — discovery first",
          "This offer's defining fields (Short Offer Description, Core Outcome, Core Transformation Promise, Signature Framework) are all empty. The offer has NOT been defined yet.",
          "- Do NOT assume an audience, method, framework, transformation or outcome for it, and do NOT borrow them from another offer or from earlier conversation.",
          "- Start with 1–3 focused discovery questions (who exactly is this offer for, what concrete result it delivers, how it differs from the user's other offers).",
          "- Do not propose field values until the user has answered; never invent details to fill gaps.",
        ].join("\n")
      : "",
    "## Active offer design JSON",
    JSON.stringify(offer.design ?? {}, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
}

export interface RelatedOfferSummary {
  id: string;
  name: string;
  tier: string;
  isPrimary: boolean;
  promise: string;
  price: string;
}

export function summarizeRelatedOffers(
  rows: OfferRowLite[],
  activeId: string | null,
  primaryDesign?: Record<string, any> | null,
): RelatedOfferSummary[] {
  return rows
    .filter((r) => r.id !== activeId)
    .map((r) => {
      const isPrimary = r.source === "blueprint_core";
      const design = isPrimary ? primaryDesign ?? r.data?.design : r.data?.design;
      const d = r.data ?? {};
      const promise =
        String(design?.angle?.core_outcome ?? d.core_outcome ?? design?.angle?.short_description ?? d.description ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 200);
      const rawPrice = design?.pricing?.core_price ?? d.price;
      const price = typeof rawPrice === "number" ? (rawPrice === 0 ? "free" : String(rawPrice)) : rawPrice ? String(rawPrice) : "";
      return {
        id: r.id,
        name: (isPrimary ? design?.angle?.main_offer_name : null)?.trim?.() || (r.name ?? "").trim() || "Untitled offer",
        tier: r.tier ?? "core",
        isPrimary,
        promise,
        price,
      };
    })
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
}

export function renderRelatedOffersSection(related: RelatedOfferSummary[], activeTier?: string | null): string | null {
  if (related.length === 0) return null;
  const lines = related.map((o) => {
    const tier = TIER_LABELS[o.tier] ?? o.tier;
    const bits = [`${tier}${o.isPrimary ? " · PRIMARY Core Offer" : ""}`, o.promise ? `outcome: ${o.promise}` : "", o.price ? `price: ${o.price}` : ""]
      .filter(Boolean)
      .join(" · ");
    return `- "${o.name}" (id ${o.id}) — ${bits}`;
  });
  const ladder = "Value ladder order: Free → Low-Ticket → Mid-Ticket → Core → Premium → Continuity.";
  return [
    "# RELATED OFFERS — ecosystem context (NOT the active offer)",
    "Other offers in this business. Use them for ecosystem strategy (lead magnets that feed a Core Offer, upsells, cross-sells, continuity, customer journey).",
    "NEVER copy another offer's framework, positioning, promise, name or deliverables into the active offer unless the user explicitly asks for that reuse. When you reference one, name it explicitly as a different offer.",
    activeTier ? `${ladder} The active offer is a ${TIER_LABELS[activeTier] ?? activeTier}.` : ladder,
    ...lines,
  ].join("\n");
}

/** Heading for the Blueprint layer when an additional offer is active. */
export const BUSINESS_LAYER_HEADING =
  "# Business Blueprint — BUSINESS-LEVEL context (not facts about the active offer)\n" +
  "These are facts about the business as a whole. The Primary Core Offer's Angle/Stack/Pricing are excluded. " +
  "Whether the active offer serves the same audience, solves the same problem or uses the same approach is UNCONFIRMED: " +
  "use these facts to ask sharper questions or to label suggestions as assumptions (\"based on your business audience…\"), never as established facts about this offer.";

// ---- Conversation attribution ----------------------------------------------

export interface OfferContextPart {
  type: "offer_context";
  offerId: string;
  offerName: string;
  tier: string;
  isPrimary: boolean;
}

export function offerContextPart(offer: VerifiedActiveOffer | null, primary: boolean): OfferContextPart | null {
  if (offer) return { type: "offer_context", offerId: offer.id, offerName: offer.name, tier: String(offer.tier), isPrimary: false };
  if (primary) return { type: "offer_context", offerId: "primary", offerName: "Primary Core Offer", tier: "core", isPrimary: true };
  return null;
}

export function messageOfferContext(m: any): OfferContextPart | null {
  const parts = Array.isArray(m?.parts) ? m.parts : [];
  const p = parts.find((x: any) => x?.type === "offer_context" && typeof x.offerId === "string");
  return p ?? null;
}

/** Prefix used when replaying a message to the model so attribution survives. */
export function attributionPrefix(m: any): string {
  const oc = messageOfferContext(m);
  if (!oc) return "";
  return oc.isPrimary
    ? `[About: Primary Core Offer] `
    : `[About offer "${oc.offerName}" (id ${oc.offerId})] `;
}

/**
 * When the previous offer-attributed message concerns a different offer than
 * the active one, return a system note marking the switch.
 */
export function renderOfferSwitchNote(messages: any[], active: OfferContextPart | null): string | null {
  if (!active) return null;
  // The final message is the current turn — inspect what came before it.
  for (let i = messages.length - 2; i >= 0; i--) {
    const oc = messageOfferContext(messages[i]);
    if (!oc) {
      if (active.isPrimary) continue;
      return [
        "# OFFER SWITCH",
        `You are now working on "${active.offerName}" (id ${active.offerId}).`,
        "Earlier messages in this conversation are unattributed and may concern a different offer. Their names, frameworks, audiences and promises are NOT facts about this offer.",
        "Briefly acknowledge which offer you're working on and continue from its own data.",
      ].join("\n");
    }
    if (oc.offerId === active.offerId) return null;
    const prev = oc.isPrimary ? "the Primary Core Offer" : `"${oc.offerName}" (id ${oc.offerId})`;
    const now = active.isPrimary ? "the Primary Core Offer" : `"${active.offerName}" (id ${active.offerId})`;
    return [
      "# OFFER SWITCH",
      `The user switched from ${prev} to ${now}.`,
      `Earlier messages tagged [About offer …] belong to ${prev}. Their names, frameworks, promises and drafts are NOT facts about ${now}.`,
      `Briefly acknowledge you're now working on ${now} and continue from its own data.`,
    ].join("\n");
  }
  return null;
}

// ---- History isolation for offer-targeted turns -----------------------------

const ECOSYSTEM_RE =
  /\b(ecosystem|ecosysteem|other offers?|andere offers?|andere aanbod(en)?|all (my )?offers|alle offers|value ladder|waardeladder|lead ?magnet|upsell|cross-?sell|downsell|continuity|work together|samenwerken|customer journey|klantreis)\b/i;

/** Does the latest user message ask about the ecosystem / cross-offer strategy? */
export function isEcosystemQuestion(text: string): boolean {
  return ECOSYSTEM_RE.test(String(text ?? ""));
}

/**
 * Should the model's history be isolated to the active offer? Only for
 * field/section assistance on a verified additional offer, and not when the
 * user explicitly asks a cross-offer / ecosystem question.
 */
export function shouldIsolateOfferHistory(args: {
  scope: string | null | undefined;
  hasVerifiedAdditionalOffer: boolean;
  latestUserText: string;
}): boolean {
  if (!args.hasVerifiedAdditionalOffer) return false;
  if (args.scope !== "blueprint.field" && args.scope !== "blueprint.section") return false;
  return !isEcosystemQuestion(args.latestUserText);
}

/**
 * Model-only history filter. Keeps messages attributed to the active offer
 * plus the final (current) message; drops other offers and unlabelled legacy
 * messages. Storage and the visible transcript are untouched.
 */
export function filterHistoryForOffer(messages: any[], activeOfferId: string): { kept: any[]; excluded: number } {
  if (!Array.isArray(messages) || messages.length === 0) return { kept: [], excluded: 0 };
  const last = messages[messages.length - 1];
  const kept = messages.slice(0, -1).filter((m) => messageOfferContext(m)?.offerId === activeOfferId);
  kept.push(last);
  return { kept, excluded: messages.length - kept.length };
}

/** Prefix for unlabelled messages when history is NOT isolated. */
export function replayPrefix(m: any, markUnattributed: boolean): string {
  const p = attributionPrefix(m);
  if (p || !markUnattributed) return p;
  return "[Unattributed earlier message — may concern a different offer] ";
}

export function renderHistoryIsolationNote(excluded: number, offer: { id: string; name: string }): string | null {
  if (excluded <= 0) return null;
  return [
    "# CONVERSATION HISTORY — isolated to the active offer",
    `${excluded} earlier message(s) about other offers or unattributed topics were omitted from your context for this turn.`,
    `Only messages about "${offer.name}" (id ${offer.id}) are shown. Do NOT assume names, frameworks, audiences, methods or promises discussed elsewhere apply to this offer; if you need them, ask.`,
  ].join("\n");
}
