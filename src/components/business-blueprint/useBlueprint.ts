import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { BlueprintRow, CustomerClarityData } from "./types";
import type { OfferDesignData } from "./offerDesignTypes";

export function useBlueprint() {
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const claritySaveTimer = useRef<number | null>(null);
  const offerSaveTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!activeSubAccountId || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("business_blueprints")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .maybeSingle();

    if (error) {
      toast.error("Kon blueprint niet laden");
      setLoading(false);
      return;
    }

    if (!data) {
      const { data: created, error: createErr } = await supabase
        .from("business_blueprints")
        .insert({ sub_account_id: activeSubAccountId, user_id: user.id })
        .select()
        .single();
      if (createErr) {
        toast.error("Kon blueprint niet aanmaken");
        setLoading(false);
        return;
      }
      setBlueprint(created as unknown as BlueprintRow);
    } else {
      setBlueprint(data as unknown as BlueprintRow);
    }
    setLoading(false);
  }, [activeSubAccountId, user]);

  useEffect(() => {
    load();
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
          if (error) toast.error("Opslaan mislukt");
        }, 800);
        return next;
      });
    },
    []
  );

  const updateOfferDesign = useCallback(
    (patch: Partial<OfferDesignData>) => {
      setBlueprint((prev) => {
        if (!prev) return prev;
        const nextOffer = { ...(prev.offer_stack as OfferDesignData), ...patch };
        const next = { ...prev, offer_stack: nextOffer as Record<string, any> };
        if (offerSaveTimer.current) window.clearTimeout(offerSaveTimer.current);
        offerSaveTimer.current = window.setTimeout(async () => {
          setSaving(true);
          const { error } = await supabase
            .from("business_blueprints")
            .update({ offer_stack: nextOffer as any })
            .eq("id", prev.id);
          setSaving(false);
          if (error) toast.error("Opslaan mislukt");
        }, 800);
        return next;
      });
    },
    []
  );

  return { blueprint, loading, saving, updateCustomerClarity, updateOfferDesign, reload: load };
}
