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
import type { CoachBlueprintWrite } from "@/lib/coach/types";
import type { ScopedRejectReason } from "@/lib/coach/scopedOfferWrites";

/** Result of persisting Coach writes to one offer (by ID). */
export interface ScopedPersistResult {
  appliedPaths: string[];
  rejected: { write: CoachBlueprintWrite; reason: ScopedRejectReason | "offer_not_found" }[];
  /** True only when the accepted writes were saved to the database. */
  saved: boolean;
}

export interface ScopedOfferCoach {
  mode: "scoped";
  offerId: string;
  offerName: string;
  /** Actual offer category (server re-verifies; never used for authorization). */
  tier?: string;
  /** Active editor tab id, read at send time (server re-validates it). */
  getTabId?: () => string | null;
  /** Latest design of the scoped offer (read at call time) — Coach context. */
  getDesign: () => OfferDesignData;
  /**
   * Validate + apply Coach writes to this offer ID and persist them.
   * Must not depend on the editor being open.
   */
  persistWrites: (writes: CoachBlueprintWrite[]) => Promise<ScopedPersistResult>;
}

/** "disabled": category editors without approved Coach support (no Coach entry points). */
export type OfferCoachScopeValue = { mode: "primary" } | { mode: "disabled" } | ScopedOfferCoach;

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

const DISABLED: OfferCoachScopeValue = { mode: "disabled" };
/** Hides every Offer Design Coach entry point inside (no prompts, no write-backs). */
export const OfferCoachDisabled = ({ children }: { children: ReactNode }) => (
  <Ctx.Provider value={DISABLED}>{children}</Ctx.Provider>
);
export const useOfferCoachEnabled = () => useContext(Ctx).mode !== "disabled";
