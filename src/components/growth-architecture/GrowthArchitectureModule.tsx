// =============================================================================
// GrowthArchitectureModule — top-level module wrapper.
//
// Restores the previously-approved V5 Growth Architecture UI
// (Map + Funnels sub-tabs, Add Funnel wizard, RouteCard list) and mounts it
// as a top-level dashboard module. Loads workspace-scoped offers and passes
// them to the section unchanged.
// =============================================================================

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import GrowthArchitectureSection from "@/components/business-blueprint/growth-architecture/GrowthArchitectureSection";
import type { EcosystemOfferRow } from "@/components/business-blueprint/useEcosystemOffers";

const GrowthArchitectureModule = () => {
  const { activeSubAccountId } = useWorkspace();
  const [offers, setOffers] = useState<EcosystemOfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeSubAccountId) { setOffers([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("offers")
        .select("id,name,tier,source,blueprint_id,sort_order,data,user_id,sub_account_id")
        .eq("sub_account_id", activeSubAccountId)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setOffers((data ?? []) as unknown as EcosystemOfferRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeSubAccountId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <GrowthArchitectureSection offers={offers} />;
};

export default GrowthArchitectureModule;
