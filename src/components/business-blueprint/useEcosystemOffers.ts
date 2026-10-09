// =============================================================================
// useEcosystemOffers — manages offers scoped to a Business Blueprint.
// Edits to individual rows are applied optimistically and saved with a
// per-offer debounce (similar to the Blueprint's own autosave).
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { OfferDesignData, EcosystemTier } from "./offerDesignTypes";
import { isSummaryEmpty, summarizeOfferDesign, summaryToRowData } from "@/lib/offers/offerSummary";
import {
  deleteEcosystemOffer,
  fetchEcosystemOffers,
  insertEcosystemOffer,
  updateEcosystemOffer,
} from "@/lib/offers/offerRepository";
import { supabase } from "@/integrations/supabase/client";

export interface EcosystemOfferRow {
  id: string;
  name: string;
  tier: EcosystemTier;
  source: "manual" | "blueprint_core" | "blueprint_manual";
  blueprint_id: string | null;
  sort_order: number;
  data: {
    description?: string;
    core_outcome?: string;
    delivery_types?: string[];
    price?: number | "";
  };
  user_id: string;
  sub_account_id: string | null;
}

interface UseEcosystemOffersArgs {
  blueprintId: string | null;
  offerDesign: OfferDesignData;
}

type RowValues = { name: string; data: EcosystemOfferRow["data"] };

const SAVE_DEBOUNCE_MS = 800;

export function useEcosystemOffers({ blueprintId, offerDesign }: UseEcosystemOffersArgs) {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [offers, setOffersState] = useState<EcosystemOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const lastSyncedCoreSignature = useRef<string>("");
  const coreSyncInFlight = useRef<boolean>(false);

  // Source of truth for synchronous reads (several updates can land in one tick).
  const offersRef = useRef<EcosystemOfferRow[]>([]);
  const pending = useRef(new Map<string, RowValues>());
  const timers = useRef(new Map<string, number>());
  const inFlight = useRef(new Map<string, RowValues>());

  const setOffers = useCallback(
    (next: EcosystemOfferRow[] | ((prev: EcosystemOfferRow[]) => EcosystemOfferRow[])) => {
      const value = typeof next === "function" ? next(offersRef.current) : next;
      offersRef.current = value;
      setOffersState(value);
    },
    [],
  );

  const syncPendingCount = () => setPendingCount(pending.current.size);

  const emitChange = useCallback(() => {
    if (!blueprintId) return;
    window.dispatchEvent(
      new CustomEvent("boostmate:ecosystem-offers-changed", { detail: { blueprintId } }),
    );
  }, [blueprintId]);

  const load = useCallback(async () => {
    if (!blueprintId) return;
    setLoading(true);
    const { rows, error } = await fetchEcosystemOffers(blueprintId);
    setLoading(false);
    if (error) {
      toast.error("Could not load ecosystem offers");
      return;
    }
    // Re-apply unsaved local edits so a reload never clobbers in-flight typing.
    setOffers(
      rows.map((r) => {
        const p = pending.current.get(r.id) ?? inFlight.current.get(r.id);
        return p ? { ...r, name: p.name, data: p.data } : r;
      }),
    );
  }, [blueprintId, setOffers]);

  // ---- Debounced saving -------------------------------------------------------

  const flushOffer = useCallback(
    async (id: string) => {
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.delete(id);
      const values = pending.current.get(id);
      if (!values) return true;
      pending.current.delete(id);
      syncPendingCount();
      inFlight.current.set(id, values);
      const { error } = await updateEcosystemOffer(id, values);
      if (inFlight.current.get(id) === values) inFlight.current.delete(id);
      if (error) {
        // Keep the edit queued (unless newer edits arrived) so it is retried.
        if (!pending.current.has(id)) pending.current.set(id, values);
        syncPendingCount();
        toast.error("Save failed — your changes are kept and will be retried.");
        const retry = window.setTimeout(() => void flushOffer(id), 5000);
        timers.current.set(id, retry);
        return false;
      }
      emitChange();
      return true;
    },
    [emitChange],
  );

  const flushAll = useCallback(async () => {
    const ids = Array.from(pending.current.keys());
    const results = await Promise.all(ids.map((id) => flushOffer(id)));
    return results.every(Boolean);
  }, [flushOffer]);

  // Flush on unmount / blueprint switch; warn on tab close with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size === 0) return;
      void flushAll();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flushAll();
    };
  }, [blueprintId, flushAll]);

  useEffect(() => {
    void load();
  }, [load]);

  // Cross-instance sync: reload when another hook instance mutates offers.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { blueprintId?: string } | undefined;
      if (!detail?.blueprintId || detail.blueprintId !== blueprintId) return;
      void load();
    };
    window.addEventListener("boostmate:ecosystem-offers-changed", handler);
    return () => window.removeEventListener("boostmate:ecosystem-offers-changed", handler);
  }, [blueprintId, load]);

  // ---- Auto-sync the Core offer from blueprint Angle + Stack + Pricing ------
  useEffect(() => {
    if (!blueprintId || !user || !activeSubAccountId) return;

    const summary = summarizeOfferDesign(offerDesign);
    if (isSummaryEmpty(summary)) return;

    const signature = JSON.stringify({
      name: summary.name,
      description: summary.description,
      coreOutcome: summary.core_outcome,
      price: summary.price,
      deliveryTypes: summary.delivery_types,
      blueprintId,
    });
    if (signature === lastSyncedCoreSignature.current) return;

    const existingCore = offers.find((o) => o.source === "blueprint_core");
    const name = summary.name || "Untitled Core Offer";
    const data = summaryToRowData({}, summary) as EcosystemOfferRow["data"];

    const sync = async () => {
      if (coreSyncInFlight.current) return;
      coreSyncInFlight.current = true;
      try {
        // Re-check DB for an existing core to avoid duplicate inserts under
        // races (state may be stale).
        const { data: existingRows } = await supabase
          .from("offers")
          .select("id")
          .eq("blueprint_id", blueprintId)
          .eq("source", "blueprint_core")
          .limit(1);
        const existingId = existingRows?.[0]?.id ?? existingCore?.id;

        if (existingId) {
          const { error } = await updateEcosystemOffer(existingId, { name, data });
          if (!error) {
            lastSyncedCoreSignature.current = signature;
            setOffers((prev) =>
              prev.some((o) => o.id === existingId)
                ? prev.map((o) => (o.id === existingId ? { ...o, name, data } : o))
                : prev,
            );
            emitChange();
          }
        } else {
          const { row, error } = await insertEcosystemOffer({
            name,
            tier: "core",
            source: "blueprint_core",
            blueprint_id: blueprintId,
            sub_account_id: activeSubAccountId,
            user_id: user.id,
            sort_order: 100,
            data,
          });
          if (!error && row) {
            lastSyncedCoreSignature.current = signature;
            setOffers((prev) => (prev.some((o) => o.id === row.id) ? prev : [...prev, row]));
            emitChange();
          } else if (error) {
            await load();
          }
        }
      } finally {
        coreSyncInFlight.current = false;
      }
    };

    const timer = window.setTimeout(sync, 600);
    return () => window.clearTimeout(timer);
  }, [blueprintId, user, activeSubAccountId, offerDesign, offers, load, setOffers, emitChange]);

  // ---- CRUD for manual offers ---------------------------------------------

  const addOffer = useCallback(
    async (tier: EcosystemTier) => {
      if (!blueprintId || !user || !activeSubAccountId) return null;
      const sortOrder = offersRef.current.filter((o) => o.tier === tier).length;
      const { row, error } = await insertEcosystemOffer({
        name: "Untitled Offer",
        tier,
        source: "blueprint_manual",
        blueprint_id: blueprintId,
        sub_account_id: activeSubAccountId,
        user_id: user.id,
        sort_order: sortOrder,
        data: { description: "", core_outcome: "", delivery_types: [], price: "" },
      });
      if (error || !row) {
        toast.error("Could not add offer");
        return null;
      }
      setOffers((prev) => [...prev, row]);
      emitChange();
      return row.id;
    },
    [blueprintId, user, activeSubAccountId, setOffers, emitChange],
  );

  /** Optimistic local update + debounced save. Data patches are merged. */
  const updateOffer = useCallback(
    async (id: string, patch: Partial<Pick<EcosystemOfferRow, "name" | "data">>) => {
      const current = offersRef.current.find((o) => o.id === id);
      if (!current) return;
      const merged: RowValues = {
        name: patch.name ?? current.name,
        data: { ...current.data, ...(patch.data || {}) },
      };
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...merged } : o)));
      pending.current.set(id, merged);
      syncPendingCount();
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.set(id, window.setTimeout(() => void flushOffer(id), SAVE_DEBOUNCE_MS));
    },
    [setOffers, flushOffer],
  );

  const deleteOffer = useCallback(
    async (id: string) => {
      const target = offersRef.current.find((o) => o.id === id);
      if (!target) return;
      if (target.source === "blueprint_core") {
        toast.error("The core offer is auto-generated — edit it in tabs 1–3.");
        return;
      }
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.delete(id);
      pending.current.delete(id);
      syncPendingCount();
      setOffers((prev) => prev.filter((o) => o.id !== id));
      const { error } = await deleteEcosystemOffer(id);
      if (error) {
        toast.error("Could not delete offer");
        await load();
      } else {
        emitChange();
      }
    },
    [load, emitChange, setOffers],
  );

  const tierCounts = offers.reduce((acc, o) => {
    acc[o.tier] = (acc[o.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    offers,
    loading,
    addOffer,
    updateOffer,
    deleteOffer,
    tierCounts,
    reload: load,
    flushOffer,
    flushAll,
    hasPendingChanges: pendingCount > 0,
  };
}
