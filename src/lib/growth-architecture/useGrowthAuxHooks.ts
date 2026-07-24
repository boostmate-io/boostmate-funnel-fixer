// =============================================================================
// Auxiliary hooks used by the V5 wizard/UX:
//   - useGrowthSystemChannelCompat  (system_id -> Set<channel_id>)
//   - useCurrentGrowthStage         (active cycle -> assessment -> null)
//   - useIsAppAdmin                 (user_roles admin check)
// =============================================================================
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Stage } from "./recommendations";

export function useGrowthSystemChannelCompat() {
  const [bySystem, setBySystem] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("growth_system_channel_compat")
        .select("growth_system_id, acquisition_channel_id");
      if (cancelled) return;
      const map = new Map<string, Set<string>>();
      for (const row of (data ?? []) as any[]) {
        const set = map.get(row.growth_system_id) ?? new Set<string>();
        set.add(row.acquisition_channel_id);
        map.set(row.growth_system_id, set);
      }
      setBySystem(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { bySystem, loading };
}

/**
 * Resolves the current growth stage for a workspace.
 * Precedence: active growth_stage_cycles row → latest assessment.computed_stage → null.
 * Never falls back to "validate".
 */
export function useCurrentGrowthStage(subAccountId: string | null) {
  const [stage, setStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!subAccountId) { setStage(null); setLoading(false); return; }
      setLoading(true);

      const { data: cycle } = await supabase
        .from("growth_stage_cycles")
        .select("stage")
        .eq("sub_account_id", subAccountId)
        .is("ended_at", null)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (cycle?.stage) {
        setStage(cycle.stage as Stage);
        setLoading(false);
        return;
      }

      const { data: assess } = await supabase
        .from("growth_assessments")
        .select("computed_stage")
        .eq("sub_account_id", subAccountId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setStage((assess?.computed_stage as Stage | undefined) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [subAccountId]);

  return { stage, loading };
}

export function useIsAppAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setIsAdmin(false); setLoading(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any });
      if (cancelled) return;
      setIsAdmin(!!data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return { isAdmin, loading };
}
