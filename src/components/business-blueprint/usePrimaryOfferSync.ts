// =============================================================================
// usePrimaryOfferSync — the ONLY owner of the one-way sync from the
// blueprint's primary Core Offer (offer_stack) to its Ecosystem summary row.
// Mounted once, by BusinessBlueprintModule.
//
// - Debounced (600ms) on design changes.
// - Serialized: one write at a time; a change arriving mid-write is queued and
//   written afterwards (latest value wins, intermediate values are skipped).
// =============================================================================

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { OfferDesignData } from "./offerDesignTypes";
import { isSummaryEmpty, summarizeOfferDesign, summaryToRowData } from "@/lib/offers/offerSummary";
import { upsertPrimaryOffer } from "@/lib/offers/offerRepository";

const SYNC_DEBOUNCE_MS = 600;

interface Job {
  signature: string;
  blueprintId: string;
  subAccountId: string;
  userId: string;
  name: string;
  data: Record<string, unknown>;
}

export function buildPrimarySyncJob(
  design: OfferDesignData,
  ctx: { blueprintId: string; subAccountId: string; userId: string },
): Job | null {
  const summary = summarizeOfferDesign(design);
  if (isSummaryEmpty(summary)) return null;
  const name = summary.name || "Untitled Core Offer";
  const data = summaryToRowData({}, summary);
  return { ...ctx, name, data, signature: JSON.stringify({ b: ctx.blueprintId, name, data }) };
}

export function usePrimaryOfferSync(blueprintId: string | null, offerDesign: OfferDesignData) {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const queued = useRef<Job | null>(null);
  const lastSynced = useRef<string>("");
  const running = useRef(false);

  const drain = async () => {
    if (running.current) return; // the running loop will pick up the queued job
    running.current = true;
    try {
      while (queued.current && queued.current.signature !== lastSynced.current) {
        const job = queued.current;
        const { changed, error } = await upsertPrimaryOffer(job);
        if (error) {
          console.error("[primary-offer-sync] failed", error);
          break; // retried on the next design change
        }
        lastSynced.current = job.signature;
        if (changed) {
          window.dispatchEvent(
            new CustomEvent("boostmate:ecosystem-offers-changed", {
              detail: { blueprintId: job.blueprintId },
            }),
          );
        }
      }
    } finally {
      running.current = false;
    }
  };

  useEffect(() => {
    if (!blueprintId || !user?.id || !activeSubAccountId) return;
    const job = buildPrimarySyncJob(offerDesign, {
      blueprintId,
      subAccountId: activeSubAccountId,
      userId: user.id,
    });
    if (!job || job.signature === lastSynced.current) return;
    const timer = window.setTimeout(() => {
      queued.current = job;
      void drain();
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintId, user?.id, activeSubAccountId, offerDesign]);
}
