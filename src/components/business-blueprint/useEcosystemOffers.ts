// =============================================================================
// useEcosystemOffers — manages offers scoped to a Business Blueprint.
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

  // ---- Auto-sync the Core offer from blueprint Angle + Stack + Pricing ------
  useEffect(() => {
    if (!blueprintId || !user || !activeSubAccountId) return;

    const angle = offerDesign.angle;
    const promise = buildPromisePreview(angle.core_promise);
    const name = angle.main_offer_name?.trim();
    const description = angle.short_description?.trim() || promise;
    const coreOutcome = angle.core_outcome?.trim() || angle.core_promise?.desired_outcome?.trim() || "";
    const price = offerDesign.pricing.core_price;

    // Aggregate delivery types from stack: deliverables + support channels names
    const deliveryFromDeliverables = (offerDesign.stack.deliverables ?? [])
      .flatMap((d) => d.delivery_types ?? []);
    const deliveryFromSupport = (offerDesign.stack.support_channels ?? [])
      .map((s) => s.name)
      .filter(Boolean);
    const deliveryTypes = Array.from(new Set([...deliveryFromDeliverables, ...deliveryFromSupport]));

    if (!name && !promise && !description && (price === "" || price === undefined)) return;

    const signature = JSON.stringify({ name, description, coreOutcome, price, deliveryTypes, blueprintId });
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
        description,
        core_outcome: coreOutcome,
        price: typeof price === "number" ? price : "",
        delivery_types: deliveryTypes,
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
            prev.map((o) =>
              o.id === existingCore.id
                ? { ...o, name: payload.name, data: payload.data as EcosystemOfferRow["data"] }
                : o,
            ),
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
          delivery_types: [],
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
