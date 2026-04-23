// =============================================================================
// useFunnelMappings — CRUD for growth_funnel_mappings table.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { FunnelMappingRow, FunnelType } from "./growthSystemTypes";

export function useFunnelMappings(blueprintId: string | null) {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [mappings, setMappings] = useState<FunnelMappingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!blueprintId) {
      setMappings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("growth_funnel_mappings" as any)
      .select("*")
      .eq("blueprint_id", blueprintId)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("Could not load funnel mappings");
      return;
    }
    setMappings((data ?? []) as unknown as FunnelMappingRow[]);
  }, [blueprintId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addMapping = useCallback(async () => {
    if (!blueprintId || !user || !activeSubAccountId) return null;
    const payload = {
      blueprint_id: blueprintId,
      sub_account_id: activeSubAccountId,
      user_id: user.id,
      funnel_type: "lead_magnet" as FunnelType,
      purpose: "",
      traffic_sources: [],
      sort_order: mappings.length,
    };
    const { data, error } = await supabase
      .from("growth_funnel_mappings" as any)
      .insert(payload as any)
      .select("*")
      .single();
    if (error) {
      toast.error("Could not add funnel mapping");
      return null;
    }
    setMappings((prev) => [...prev, data as unknown as FunnelMappingRow]);
    return (data as any)?.id as string;
  }, [blueprintId, user, activeSubAccountId, mappings.length]);

  const updateMapping = useCallback(
    async (id: string, patch: Partial<FunnelMappingRow>) => {
      setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
      const { error } = await supabase
        .from("growth_funnel_mappings" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) toast.error("Save failed");
    },
    [],
  );

  const deleteMapping = useCallback(
    async (id: string) => {
      setMappings((prev) => prev.filter((m) => m.id !== id));
      const { error } = await supabase
        .from("growth_funnel_mappings" as any)
        .delete()
        .eq("id", id);
      if (error) {
        toast.error("Could not delete mapping");
        await load();
      }
    },
    [load],
  );

  return { mappings, loading, addMapping, updateMapping, deleteMapping, reload: load };
}
