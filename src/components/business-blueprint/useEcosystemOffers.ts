// =============================================================================
// useEcosystemOffers — manages offers scoped to a Business Blueprint.
// Edits to individual rows are applied optimistically and saved with a
// per-offer debounce (similar to the Blueprint's own autosave).
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { EcosystemTier } from "./offerDesignTypes";
import {
  deleteEcosystemOffer,
  fetchEcosystemOffers,
  insertEcosystemOffer,
  updateEcosystemOffer,
  designToRowValues,
} from "@/lib/offers/offerRepository";
import { applyScopedOfferWrites } from "@/lib/coach/scopedOfferWrites";
import type { CoachBlueprintWrite } from "@/lib/coach/types";
import { emptyOfferDesign, type OfferDesignData } from "./offerDesignTypes";
import type { ScopedPersistResult } from "./offer/OfferCoachScope";

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
    /** Full offer design (Angle/Stack/Pricing); present on additional Core rows. */
    design?: OfferDesignData;
  };
  user_id: string;
  sub_account_id: string | null;
}

interface UseEcosystemOffersArgs {
  blueprintId: string | null;
  /** @deprecated ignored — primary sync is owned by usePrimaryOfferSync. */
  offerDesign?: unknown;
}

type RowValues = { name: string; data: EcosystemOfferRow["data"] };

const SAVE_DEBOUNCE_MS = 800;

export function useEcosystemOffers({ blueprintId }: UseEcosystemOffersArgs) {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [offers, setOffersState] = useState<EcosystemOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, "pending" | "saving" | "saved" | "error">>({});
  const setSaveStatus = (id: string, status: "pending" | "saving" | "saved" | "error") => setSaveStatuses((prev) => ({ ...prev, [id]: status }));

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

  // Per-offer save chain: saves for one offer never overlap, so an older
  // in-flight save can never land after (and overwrite) a newer one.
  const chains = useRef(new Map<string, Promise<boolean>>());

  const flushOfferNow = useCallback(
    async (id: string): Promise<boolean> => {
      const t = timers.current.get(id);
      if (t) window.clearTimeout(t);
      timers.current.delete(id);
      const values = pending.current.get(id);
      if (!values) return true;
      pending.current.delete(id);
      syncPendingCount();
      inFlight.current.set(id, values);
      setSaveStatus(id, "saving");
      let error: unknown;
      try { ({ error } = await updateEcosystemOffer(id, values)); }
      catch (failure) { error = failure; }
      if (inFlight.current.get(id) === values) inFlight.current.delete(id);
      if (error) {
        // Keep the edit queued (unless newer edits arrived) so it is retried.
        if (!pending.current.has(id)) pending.current.set(id, values);
        syncPendingCount();
        setSaveStatus(id, "error");
        toast.error("Save failed — your changes are kept and will be retried.");
        const retry = window.setTimeout(() => void flushOfferRef.current(id), 5000);
        timers.current.set(id, retry);
        return false;
      }
      setSaveStatus(id, pending.current.has(id) ? "pending" : "saved");
      emitChange();
      return true;
    },
    [emitChange],
  );

  const flushOffer = useCallback(
    (id: string): Promise<boolean> => {
      const prev = chains.current.get(id) ?? Promise.resolve(true);
      const next = prev.catch(() => false).then(() => flushOfferNow(id));
      chains.current.set(id, next);
      void next.finally(() => {
        if (chains.current.get(id) === next) chains.current.delete(id);
      });
      return next;
    },
    [flushOfferNow],
  );
  const flushOfferRef = useRef(flushOffer);
  flushOfferRef.current = flushOffer;

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

  // Primary Core Offer sync lives in usePrimaryOfferSync (single owner).

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
      setSaveStatus(id, "pending");
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

  /**
   * Coach write-back for ONE additional Core Offer, keyed by ID.
   * Reads the latest local row (which already includes pending manual edits),
   * applies only validated offer-design paths, then goes through the same
   * debounced queue (updateOffer) and flushes it — no second save path.
   */
  const applyCoachWrites = useCallback(
    async (id: string, writes: CoachBlueprintWrite[], tabId: string | null = null, baseDesign?: OfferDesignData): Promise<ScopedPersistResult> => {
      const row = offersRef.current.find((o) => o.id === id);
      // Any non-Primary offer, any category; permissions follow the row's own tier.
      if (!row || row.source === "blueprint_core") {
        return {
          appliedPaths: [],
          rejected: writes.map((write) => ({ write, reason: "offer_not_found" as const })),
          saved: false,
        };
      }
      // Editor state (incl. unsaved edits) wins over the persisted row when supplied.
      const design = baseDesign ?? ((row.data as any)?.design as OfferDesignData | undefined) ?? emptyOfferDesign();
      const { next, applied, rejected } = applyScopedOfferWrites(design, writes, row.tier ?? "core", tabId);
      if (!applied.length) return { appliedPaths: [], rejected, saved: false };
      await updateOffer(id, designToRowValues(next, row as any) as any);
      const saved = await flushOffer(id);
      return { appliedPaths: applied.map((w) => w.path), rejected, saved, design: next };
    },
    [updateOffer, flushOffer],
  );

  const getOffer = useCallback((id: string) => offersRef.current.find((o) => o.id === id), []);

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
    applyCoachWrites,
    getOffer,
    hasPendingChanges: pendingCount > 0,
    saveStatuses,
  };
}
