import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { claimOfferGeneration, PENDING_OFFER_CLAIM_KEY } from "@/lib/offers/publicOfferGenerator";
import { toast } from "sonner";

/**
 * After signup/login: attach a queued public Offer Generator result to the
 * active workspace as a NEW additional Core Offer, then open it in Offer Design.
 */
export function usePendingOfferClaim() {
  const { user, isReady } = useAuth();
  const { activeSubAccountId, loading } = useWorkspace();
  const running = useRef(false);

  useEffect(() => {
    if (!isReady || loading || !user || !activeSubAccountId || running.current) return;
    let token: string | null = null;
    try { token = localStorage.getItem(PENDING_OFFER_CLAIM_KEY) || sessionStorage.getItem(PENDING_OFFER_CLAIM_KEY); } catch { /* ignore */ }
    if (!token) return;
    running.current = true;
    (async () => {
      try {
        const { offer_id } = await claimOfferGeneration(token!, activeSubAccountId);
        toast.success("Your generated offer was added to Offer Design.");
        window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "business-blueprint" }));
        // Let the Blueprint module mount before asking it to open the offer.
        setTimeout(() => window.dispatchEvent(new CustomEvent("boostmate:open-offer-design", { detail: { offerId: offer_id } })), 600);
      } catch (e) {
        console.warn("Offer generator claim failed", e);
        toast.error("We couldn't add your generated offer to this workspace.");
      } finally {
        try { localStorage.removeItem(PENDING_OFFER_CLAIM_KEY); sessionStorage.removeItem(PENDING_OFFER_CLAIM_KEY); } catch { /* ignore */ }
      }
    })();
  }, [isReady, loading, user, activeSubAccountId]);
}
