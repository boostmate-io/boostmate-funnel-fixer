// =============================================================================
// Growth Architecture V3 — data hooks for the new Blueprint tables.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ---------- Types -----------------------------------------------------------

export type OfferRelationshipType = "ascends_to" | "leads_into" | "retention" | "downsell";

export interface OfferRelationshipRow {
  id: string;
  sub_account_id: string;
  source_offer_id: string;
  target_offer_id: string;
  relationship_type: OfferRelationshipType;
  notes: string | null;
}

export interface AcquisitionChannelRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface GrowthSystemCatalogRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  primary_objective: string | null;
  suitable_offer_tiers: string[];
  recommended_stages: string[];
  architecture: unknown | null;
  seed_template_id: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export type GrowthArchStatus = "planned" | "active" | "paused" | "retired";

export interface GrowthArchitectureRow {
  id: string;
  sub_account_id: string;
  system_catalog_id: string;
  source_offer_id: string | null;
  target_offer_id: string;
  status: GrowthArchStatus;
  notes: string | null;
  sort_order: number;
}

// ---------- useOfferRelationships ------------------------------------------

export function useOfferRelationships(subAccountId: string | null) {
  const [rows, setRows] = useState<OfferRelationshipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!subAccountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("offer_relationships")
      .select("id,sub_account_id,source_offer_id,target_offer_id,relationship_type,notes")
      .eq("sub_account_id", subAccountId);
    setLoading(false);
    if (error) {
      toast.error("Could not load offer relationships");
      return;
    }
    setRows((data ?? []) as OfferRelationshipRow[]);
  }, [subAccountId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(
    async (payload: Omit<OfferRelationshipRow, "id" | "sub_account_id" | "notes"> & { notes?: string | null }) => {
      if (!subAccountId) return null;
      const { data, error } = await supabase
        .from("offer_relationships")
        .insert({ ...payload, sub_account_id: subAccountId } as any)
        .select("id,sub_account_id,source_offer_id,target_offer_id,relationship_type,notes")
        .single();
      if (error) {
        if (!/duplicate/i.test(error.message)) toast.error("Could not add relationship");
        return null;
      }
      setRows((prev) => [...prev, data as OfferRelationshipRow]);
      return (data as any).id as string;
    },
    [subAccountId],
  );

  const remove = useCallback(async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("offer_relationships").delete().eq("id", id);
    if (error) { toast.error("Could not remove relationship"); await load(); }
  }, [load]);

  return { rows, loading, add, remove, reload: load };
}

// ---------- useAcquisitionChannels -----------------------------------------

export function useAcquisitionChannels() {
  const [rows, setRows] = useState<AcquisitionChannelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("acquisition_channels")
        .select("id,key,label,description,category_id,icon,color,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setLoading(false);
      if (error) { toast.error("Could not load channels"); return; }
      setRows((data ?? []) as AcquisitionChannelRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  return { rows, loading };
}

// ---------- useGrowthSystemsCatalog ----------------------------------------

export function useGrowthSystemsCatalog() {
  const [rows, setRows] = useState<GrowthSystemCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("growth_systems_catalog")
        .select("id,key,label,description,primary_objective,suitable_offer_tiers,recommended_stages,architecture,seed_template_id,icon,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setLoading(false);
      if (error) { toast.error("Could not load growth systems"); return; }
      setRows((data ?? []) as GrowthSystemCatalogRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  return { rows, loading };
}

// ---------- useGrowthArchitecture ------------------------------------------

export function useGrowthArchitecture(subAccountId: string | null) {
  const [rows, setRows] = useState<GrowthArchitectureRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!subAccountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("growth_architecture_systems")
      .select("id,sub_account_id,system_catalog_id,source_offer_id,target_offer_id,status,notes,sort_order")
      .eq("sub_account_id", subAccountId)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) { toast.error("Could not load growth architecture"); return; }
    setRows((data ?? []) as GrowthArchitectureRow[]);
  }, [subAccountId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(
    async (
      payload: Omit<GrowthArchitectureRow, "id" | "sub_account_id" | "sort_order"> & { sort_order?: number },
    ) => {
      if (!subAccountId) return null;
      const sortOrder = payload.sort_order ?? rows.length;
      const { data, error } = await supabase
        .from("growth_architecture_systems")
        .insert({ ...payload, sub_account_id: subAccountId, sort_order: sortOrder } as any)
        .select("id,sub_account_id,system_catalog_id,source_offer_id,target_offer_id,status,notes,sort_order")
        .single();
      if (error) {
        if (/offer_relationship/i.test(error.message)) {
          toast.error("Route requires an existing offer-to-offer relationship first.");
        } else {
          toast.error("Could not add route");
        }
        return null;
      }
      setRows((prev) => [...prev, data as GrowthArchitectureRow]);
      return (data as any).id as string;
    },
    [subAccountId, rows.length],
  );

  const update = useCallback(async (id: string, patch: Partial<GrowthArchitectureRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("growth_architecture_systems").update(patch as any).eq("id", id);
    if (error) { toast.error("Save failed"); await load(); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("growth_architecture_systems").delete().eq("id", id);
    if (error) { toast.error("Could not remove route"); await load(); }
  }, [load]);

  return { rows, loading, add, update, remove, reload: load };
}

// ---------- Convenience wrapper --------------------------------------------

export function useCurrentWorkspaceRelationships() {
  const { activeSubAccountId } = useWorkspace();
  return useOfferRelationships(activeSubAccountId ?? null);
}
