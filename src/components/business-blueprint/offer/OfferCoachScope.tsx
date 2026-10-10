// =============================================================================
// OfferCoachScope — tells Offer Design Coach entry points which offer they
// belong to.
//
//   • No provider (default) → "primary": today's behaviour, unchanged.
//   • <OfferCoachScopeProvider> → "scoped": an additional Core Offer. Coach
//     context comes from that offer's design and every write-back is applied
//     to that offer only (never to the Blueprint / Primary Core Offer).
// =============================================================================

import { createContext, useContext, type ReactNode } from "react";
import type { OfferDesignData } from "../offerDesignTypes";

export interface ScopedOfferCoach {
  mode: "scoped";
  offerId: string;
  offerName: string;
  /** Latest design of the scoped offer (read at call time). */
  getDesign: () => OfferDesignData;
  /** Persist a new design for the scoped offer. */
  applyDesign: (next: OfferDesignData) => void;
}

export type OfferCoachScopeValue = { mode: "primary" } | ScopedOfferCoach;

const PRIMARY: OfferCoachScopeValue = { mode: "primary" };
const Ctx = createContext<OfferCoachScopeValue>(PRIMARY);

export const OfferCoachScopeProvider = ({
  value,
  children,
}: {
  value: ScopedOfferCoach | null;
  children: ReactNode;
}) => <Ctx.Provider value={value ?? PRIMARY}>{children}</Ctx.Provider>;

export const useOfferCoachScope = () => useContext(Ctx);
