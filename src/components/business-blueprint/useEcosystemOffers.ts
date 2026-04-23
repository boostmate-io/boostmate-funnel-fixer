// =============================================================================
// useEcosystemOffers — manages offers scoped to a Business Blueprint.
// =============================================================================
// Each ecosystem card (Free, Low Ticket, Mid Ticket, Core, Premium, Continuity)
// is a row in public.offers tagged with `tier`, `source` and `blueprint_id`.
//
// - The Core offer is auto-managed: created/upserted from the blueprint
//   Angle + Pricing data. Source = 'blueprint_core'.
// - All other offers are manually added by the user. Source = 'blueprint_manual'.
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { OfferDesignData, EcosystemTier } from "./offerDesignTypes";
import { buildPromisePreview } from "./offerDesignTypes";

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
    primary_purpose?: string;
    delivery_methods?: string[];
    price?: number | "";
  };
  user_id: string;
  sub_account_id: string | null;
}

interface UseEcosystemOffersArgs {
  blueprintId: string | null;
  offerDesign: OfferDesignData;
}

export function useEcosystemOffers({ blueprintId, offerDesign }: UseEcosystemOffersArgs) {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [offers, setOffers] = useState<EcosystemOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSyncedCoreSignature = useRef<string>("");

  const load = useCallback(async () => {
    if (!blueprintId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("offers")
      .select("id,name,tier,source,blueprint_id,sort_order,data,user_id,sub_account_id")
      .eq("blueprint_id", blueprintId)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("Could not load ecosystem offers");
      return;
    }
    setOffers((data ?? []) as unknown as EcosystemOfferRow[]);
  }, [blueprintId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ---- Auto-sync the Core offer from blueprint Angle + Pricing data --------
  useEffect(() => {
    if (!blueprintId || !user || !activeSubAccountId) return;

    const promise = buildPromisePreview(offerDesign.angle.core_promise);
    const name = offerDesign.angle.main_offer_name?.trim();
    const price = offerDesign.pricing.core_price;

    // Skip auto-sync if there's nothing meaningful to represent yet.
    if (!name && !promise && (price === "" || price === undefined)) return;

    const signature = JSON.stringify({ name, promise, price, blueprintId });
    if (signature === lastSyncedCoreSignature.current) return;

    const existingCore = offers.find((o) => o.source === "blueprint_core");

    const payload = {
      name: name || "Untitled Core Offer",
      tier: "core" as EcosystemTier,
      source: "blueprint_core" as const,
      blueprint_id: blueprintId,
      sub_account_id: activeSubAccountId,
      user_id: user.id,
      sort_order: 100,
      data: {
        description: promise,
        core_outcome: offerDesign.angle.core_promise?.desired_outcome,
        primary_purpose: "Ascension",
        price: typeof price === "number" ? price : "",
        delivery_methods: offerDesign.stack.support_system ?? [],
      },
    };

    const sync = async () => {
      if (existingCore) {
        const { error } = await supabase
          .from("offers")
          .update({
            name: payload.name,
            data: payload.data,
          })
          .eq("id", existingCore.id);
        if (!error) {
          lastSyncedCoreSignature.current = signature;
          setOffers((prev) =>
            prev.map((o) => (o.id === existingCore.id ? { ...o, name: payload.name, data: payload.data } : o)),
          );
        }
      } else {
        const { data, error } = await supabase
          .from("offers")
          .insert(payload as any)
          .select("id,name,tier,source,blueprint_id,sort_order,data,user_id,sub_account_id")
          .single();
        if (!error && data) {
          lastSyncedCoreSignature.current = signature;
          setOffers((prev) => [...prev, data as unknown as EcosystemOfferRow]);
        }
      }
    };

    const timer = window.setTimeout(sync, 600);
    return () => window.clearTimeout(timer);
  }, [blueprintId, user, activeSubAccountId, offerDesign, offers]);

  // ---- CRUD for manual offers ---------------------------------------------

  const addOffer = useCallback(
    async (tier: EcosystemTier) => {
      if (!blueprintId || !user || !activeSubAccountId) return null;
      const sortOrder = offers.filter((o) => o.tier === tier).length;
      const payload = {
        name: "Untitled Offer",
        tier,
        source: "blueprint_manual" as const,
        blueprint_id: blueprintId,
        sub_account_id: activeSubAccountId,
        user_id: user.id,
        sort_order: sortOrder,
        data: {
          description: "",
          core_outcome: "",
          primary_purpose: "",
          delivery_methods: [],
          price: "",
        },
      };
      const { data, error } = await supabase
        .from("offers")
        .insert(payload as any)
        .select("id,name,tier,source,blueprint_id,sort_order,data,user_id,sub_account_id")
        .single();
      if (error) {
        toast.error("Could not add offer");
        return null;
      }
      setOffers((prev) => [...prev, data as unknown as EcosystemOfferRow]);
      return data?.id as string;
    },
    [blueprintId, user, activeSubAccountId, offers],
  );

  const updateOffer = useCallback(
    async (id: string, patch: Partial<Pick<EcosystemOfferRow, "name" | "data">>) => {
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch, data: { ...o.data, ...(patch.data || {}) } } : o)));
      const { error } = await supabase.from("offers").update(patch as any).eq("id", id);
      if (error) toast.error("Save failed");
    },
    [],
  );

  const deleteOffer = useCallback(
    async (id: string) => {
      const target = offers.find((o) => o.id === id);
      if (!target) return;
      if (target.source === "blueprint_core") {
        toast.error("The core offer is auto-generated — edit it in tabs 1–3.");
        return;
      }
      setOffers((prev) => prev.filter((o) => o.id !== id));
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) {
        toast.error("Could not delete offer");
        await load();
      }
    },
    [offers, load],
  );

  const tierCounts = offers.reduce((acc, o) => {
    acc[o.tier] = (acc[o.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { offers, loading, addOffer, updateOffer, deleteOffer, tierCounts, reload: load };
}
