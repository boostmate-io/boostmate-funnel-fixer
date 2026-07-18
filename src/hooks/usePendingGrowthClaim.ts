import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { claimAssessment } from "@/lib/growth/api";
import { toast } from "sonner";

const PENDING_CLAIM_KEY = "boostmate:pending_growth_claim";

/**
 * Runs once on dashboard mount. If a public assessment claim_token is queued in
 * storage (set by /assessment before signup), attach it to the active workspace
 * and clear the token.
 */
export function usePendingGrowthClaim(onClaimed?: () => void) {
  const { user, isReady } = useAuth();
  const { activeSubAccountId, loading } = useWorkspace();

  useEffect(() => {
    if (!isReady || loading || !user || !activeSubAccountId) return;

    let token: string | null = null;
    try {
      token = sessionStorage.getItem(PENDING_CLAIM_KEY)
        || localStorage.getItem(PENDING_CLAIM_KEY);
    } catch { /* ignore */ }
    if (!token) return;

    (async () => {
      try {
        await claimAssessment(token!, activeSubAccountId);
        onClaimed?.();
      } catch (e) {
        console.warn("Growth assessment claim failed", e);
      } finally {
        try {
          sessionStorage.removeItem(PENDING_CLAIM_KEY);
          localStorage.removeItem(PENDING_CLAIM_KEY);
        } catch { /* ignore */ }
      }
    })();
  }, [isReady, loading, user, activeSubAccountId, onClaimed]);
}
