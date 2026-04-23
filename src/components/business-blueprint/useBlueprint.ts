import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { BlueprintRow, CustomerClarityData } from "./types";
import {
  type OfferDesignData,
  emptyOfferDesign,
  normalizeOfferDesign,
} from "./offerDesignTypes";
import type { GrowthSystemData } from "./growthSystemTypes";

export function useBlueprint() {
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [offerDesign, setOfferDesign] = useState<OfferDesignData>(emptyOfferDesign());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const claritySaveTimer = useRef<number | null>(null);
  const offerSaveTimer = useRef<number | null>(null);
  const growthSaveTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!activeSubAccountId || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("business_blueprints")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .maybeSingle();

    if (error) {
      toast.error("Could not load blueprint");
      setLoading(false);
      return;
    }

    let row: BlueprintRow | null = null;
    if (!data) {
      const { data: created, error: createErr } = await supabase
        .from("business_blueprints")
        .insert({ sub_account_id: activeSubAccountId, user_id: user.id })
        .select()
        .single();
      if (createErr) {
        toast.error("Could not create blueprint");
        setLoading(false);
        return;
      }
      row = created as unknown as BlueprintRow;
    } else {
      row = data as unknown as BlueprintRow;
    }

    // Normalize the offer_stack JSON into the v2 structured shape (clean slate
    // for legacy free-text values).
    const normalized = normalizeOfferDesign(row.offer_stack);
    setOfferDesign(normalized);
    setBlueprint(row);
    setLoading(false);
  }, [activeSubAccountId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateCustomerClarity = useCallback(
    (patch: Partial<CustomerClarityData>) => {
      setBlueprint((prev) => {
        if (!prev) return prev;
        const next = { ...prev, customer_clarity: { ...prev.customer_clarity, ...patch } };
        if (claritySaveTimer.current) window.clearTimeout(claritySaveTimer.current);
        claritySaveTimer.current = window.setTimeout(async () => {
          setSaving(true);
          const { error } = await supabase
            .from("business_blueprints")
            .update({ customer_clarity: next.customer_clarity as any })
            .eq("id", prev.id);
          setSaving(false);
          if (error) toast.error("Save failed");
        }, 800);
        return next;
      });
    },
    [],
  );

  const updateOfferDesign = useCallback(
    (patch: Partial<OfferDesignData>) => {
      setOfferDesign((prev) => {
        const next: OfferDesignData = {
          angle: { ...prev.angle, ...(patch.angle || {}) },
          stack: { ...prev.stack, ...(patch.stack || {}) },
          pricing: { ...prev.pricing, ...(patch.pricing || {}) },
        };
        const blueprintId = blueprint?.id;
        if (offerSaveTimer.current) window.clearTimeout(offerSaveTimer.current);
        offerSaveTimer.current = window.setTimeout(async () => {
          if (!blueprintId) return;
          setSaving(true);
          const { error } = await supabase
            .from("business_blueprints")
            .update({ offer_stack: next as any })
            .eq("id", blueprintId);
          setSaving(false);
          if (error) toast.error("Save failed");
        }, 800);
        return next;
      });
    },
    [blueprint?.id],
  );

  const updateGrowthSystem = useCallback(
    (patch: Partial<GrowthSystemData>) => {
      setBlueprint((prev) => {
        if (!prev) return prev;
        const nextGrowth = { ...(prev.growth_system as GrowthSystemData), ...patch };
        const next = { ...prev, growth_system: nextGrowth as Record<string, any> };
        if (growthSaveTimer.current) window.clearTimeout(growthSaveTimer.current);
        growthSaveTimer.current = window.setTimeout(async () => {
          setSaving(true);
          const { error } = await supabase
            .from("business_blueprints")
            .update({ growth_system: nextGrowth as any })
            .eq("id", prev.id);
          setSaving(false);
          if (error) toast.error("Save failed");
        }, 800);
        return next;
      });
    },
    [],
  );

  return {
    blueprint,
    offerDesign,
    loading,
    saving,
    updateCustomerClarity,
    updateOfferDesign,
    updateGrowthSystem,
    reload: load,
  };
}
