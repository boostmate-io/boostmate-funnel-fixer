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
import {
  type ProofAuthorityData,
  emptyProofAuthority,
  normalizeProofAuthority,
} from "./proofAuthorityTypes";

export function useBlueprint() {
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
  const [offerDesign, setOfferDesign] = useState<OfferDesignData>(emptyOfferDesign());
  const [proofAuthority, setProofAuthority] = useState<ProofAuthorityData>(emptyProofAuthority());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const claritySaveTimer = useRef<number | null>(null);
  const offerSaveTimer = useRef<number | null>(null);
  const growthSaveTimer = useRef<number | null>(null);
  const proofSaveTimer = useRef<number | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!activeSubAccountId || !user) return;
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("business_blueprints")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .maybeSingle();

    if (error) {
      toast.error("Could not load blueprint");
      if (!silent) setLoading(false);
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
        if (!silent) setLoading(false);
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
    setProofAuthority(normalizeProofAuthority(row.proof_authority));
    setBlueprint(row);
    if (!silent) setLoading(false);
  }, [activeSubAccountId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reload when Coach (or any other flow) writes to the blueprint so fields
  // update live without a manual refresh.
  useEffect(() => {
    if (!activeSubAccountId) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.subAccountId === activeSubAccountId) void load();
    };
    window.addEventListener("blueprint:updated", handler);
    return () => window.removeEventListener("blueprint:updated", handler);
  }, [activeSubAccountId, load]);


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

  const updateProofAuthority = useCallback(
    (patch: Partial<ProofAuthorityData>) => {
      const blueprintId = blueprint?.id;
      setProofAuthority((prev) => {
        const next: ProofAuthorityData = { ...prev, ...patch };
        if (proofSaveTimer.current) window.clearTimeout(proofSaveTimer.current);
        proofSaveTimer.current = window.setTimeout(async () => {
          if (!blueprintId) return;
          setSaving(true);
          const { error } = await supabase
            .from("business_blueprints")
            .update({ proof_authority: next as any })
            .eq("id", blueprintId);
          setSaving(false);
          if (error) toast.error("Save failed");
        }, 800);
        return next;
      });
    },
    [blueprint?.id],
  );

  const setShareToken = useCallback((token: string | null) => {
    setBlueprint((prev) => (prev ? { ...prev, share_token: token } : prev));
  }, []);

  return {
    blueprint,
    offerDesign,
    proofAuthority,
    loading,
    saving,
    updateCustomerClarity,
    updateOfferDesign,
    updateGrowthSystem,
    updateProofAuthority,
    setShareToken,
    reload: load,
  };
}
