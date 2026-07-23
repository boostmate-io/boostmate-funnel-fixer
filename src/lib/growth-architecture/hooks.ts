// =============================================================================
// Growth Architecture V3 — data hooks for the new Blueprint tables.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
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
  funnel_id: string | null;
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

// ---------- useRouteChannels (workspace-wide) ------------------------------
// Fetches every growth_architecture_channels row for the given workspace's
// routes. Consumers build their own per-route views by grouping on
// architecture_system_id.

export interface RouteChannelRow {
  id: string;
  architecture_system_id: string;
  channel_id: string;
  is_primary: boolean;
  sort_order: number;
}

export function useRouteChannels(routeIds: string[]) {
  const [rows, setRows] = useState<RouteChannelRow[]>([]);
  const [loading, setLoading] = useState(false);

  const key = useMemo(() => routeIds.slice().sort().join(","), [routeIds]);

  const load = useCallback(async () => {
    if (routeIds.length === 0) { setRows([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("growth_architecture_channels")
      .select("id,architecture_system_id,channel_id,is_primary,sort_order")
      .in("architecture_system_id", routeIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) { toast.error("Could not load route channels"); return; }
    setRows((data ?? []) as RouteChannelRow[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { void load(); }, [load]);

  const byRoute = useMemo(() => {
    const map = new Map<string, { primary: RouteChannelRow | null; additional: RouteChannelRow[] }>();
    for (const id of routeIds) map.set(id, { primary: null, additional: [] });
    for (const r of rows) {
      const bucket = map.get(r.architecture_system_id);
      if (!bucket) continue;
      if (r.is_primary) bucket.primary = r;
      else bucket.additional.push(r);
    }
    return map;
  }, [rows, routeIds]);

  const addChannel = useCallback(async (routeId: string, channelId: string, isPrimary: boolean) => {
    const nextOrder = rows.filter((r) => r.architecture_system_id === routeId).length;
    const { data, error } = await supabase
      .from("growth_architecture_channels")
      .insert({ architecture_system_id: routeId, channel_id: channelId, is_primary: isPrimary, sort_order: nextOrder })
      .select("id,architecture_system_id,channel_id,is_primary,sort_order")
      .single();
    if (error) {
      if (/duplicate/i.test(error.message)) toast.error("Channel already linked to this route");
      else if (/growth_arch_channels_one_primary/i.test(error.message)) toast.error("This route already has a primary channel");
      else toast.error("Could not add channel");
      return null;
    }
    setRows((prev) => [...prev, data as RouteChannelRow]);
    return data as RouteChannelRow;
  }, [rows]);

  const removeChannel = useCallback(async (id: string) => {
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    if (target.is_primary) {
      toast.error("Promote another channel before removing the primary");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("growth_architecture_channels").delete().eq("id", id);
    if (error) { toast.error("Could not remove channel"); await load(); }
  }, [rows, load]);

  const setPrimary = useCallback(async (routeId: string, channelId: string) => {
    // Ensure the channel is linked; if not, add it first as non-primary.
    let link = rows.find((r) => r.architecture_system_id === routeId && r.channel_id === channelId);
    if (!link) {
      const inserted = await addChannel(routeId, channelId, false);
      if (!inserted) return;
      link = inserted;
    }
    // Atomic-ish swap: demote the current primary, promote the target.
    // The partial unique index requires the demote to land first.
    const currentPrimary = rows.find((r) => r.architecture_system_id === routeId && r.is_primary && r.channel_id !== channelId);
    if (currentPrimary) {
      const { error } = await supabase
        .from("growth_architecture_channels")
        .update({ is_primary: false })
        .eq("id", currentPrimary.id);
      if (error) { toast.error("Could not switch primary"); await load(); return; }
    }
    const { error } = await supabase
      .from("growth_architecture_channels")
      .update({ is_primary: true })
      .eq("id", link.id);
    if (error) { toast.error("Could not promote channel"); await load(); return; }
    await load();
  }, [rows, addChannel, load]);

  return { rows, byRoute, loading, addChannel, removeChannel, setPrimary, reload: load };
}


// ---------- Convenience wrapper --------------------------------------------

export function useCurrentWorkspaceRelationships() {
  const { activeSubAccountId } = useWorkspace();
  return useOfferRelationships(activeSubAccountId ?? null);
}
