// =============================================================================
// Offer attribution for Coach messages.
//
// The server tags each persisted turn with an `offer_context` part naming the
// offer it was generated for. Before applying a proposal from a message, the
// panel checks it still matches the offer the Coach is currently scoped to,
// so a reply that arrives after switching offers can never be applied to the
// wrong one.
// =============================================================================

import type { CoachContext, CoachMessage } from "./types";
import type { CoachWritesHandler } from "./focus";

/** Offer id a message was generated for ("primary" or a row id), or null. */
export function messageOfferId(message: Pick<CoachMessage, "parts">): string | null {
  const part = (message.parts as unknown[] | undefined)?.find(
    (p): p is { type: "offer_context"; offerId: string } =>
      !!p && typeof p === "object" && (p as { type?: string }).type === "offer_context" &&
      typeof (p as { offerId?: unknown }).offerId === "string",
  );
  return part?.offerId ?? null;
}

/** Offer id the Coach is currently scoped to (null = Blueprint / Primary). */
export function currentOfferId(context: CoachContext | null): string | null {
  return context?.businessContext.activeOffer?.id ?? null;
}

/**
 * May a proposal generated for `fromOffer` be applied while the Coach is
 * scoped to `current`? Untagged (legacy) messages keep today's behaviour.
 */
export function canApplyAcrossOffers(fromOffer: string | null, current: string | null): boolean {
  if (!fromOffer) return true;
  if (fromOffer === "primary") return current === null || current === "primary";
  return fromOffer === current;
}

export class OfferMismatchError extends Error {
  constructor() {
    super("offer_mismatch");
  }
}

/** Wrap a writes handler so it refuses proposals made for another offer. */
export function guardWritesForMessage(
  handler: CoachWritesHandler | undefined,
  message: Pick<CoachMessage, "parts">,
  context: CoachContext | null,
  onBlocked: () => void,
): CoachWritesHandler | undefined {
  if (!handler) return handler;
  return async (writes) => {
    if (!canApplyAcrossOffers(messageOfferId(message), currentOfferId(context))) {
      onBlocked();
      throw new OfferMismatchError();
    }
    return handler(writes);
  };
}
