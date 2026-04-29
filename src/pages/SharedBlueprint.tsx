// =============================================================================
// SharedBlueprint — public read-only page for a Business Blueprint shared
// via /blueprint/:token. Loads everything via the anon-permitted RLS policies
// added in the migration.
// =============================================================================

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BlueprintViewMode from "@/components/business-blueprint/BlueprintViewMode";
import {
  normalizeOfferDesign, type OfferDesignData,
} from "@/components/business-blueprint/offerDesignTypes";
import {
  normalizeGrowthSystem, type GrowthSystemData, type FunnelMappingRow,
} from "@/components/business-blueprint/growthSystemTypes";
import type { CustomerClarityData } from "@/components/business-blueprint/types";
import type { EcosystemOfferRow } from "@/components/business-blueprint/useEcosystemOffers";

const SharedBlueprint = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clarity, setClarity] = useState<CustomerClarityData>({});
  const [offer, setOffer] = useState<OfferDesignData>(normalizeOfferDesign(null));
  const [growth, setGrowth] = useState<GrowthSystemData>(normalizeGrowthSystem(null));
  const [mappings, setMappings] = useState<FunnelMappingRow[]>([]);
  const [offers, setOffers] = useState<EcosystemOfferRow[]>([]);
  const [workspace, setWorkspace] = useState<{
    business_type?: string; currency?: string;
    help_achieve?: string; who_help?: string;
    main_goal?: string; biggest_challenge?: string;
  }>({});
  const [workspaceName, setWorkspaceName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);

      const { data: bp, error: bpErr } = await supabase
        .from("business_blueprints")
        .select("*")
        .eq("share_token", token)
        .maybeSingle();

      if (cancelled) return;
      if (bpErr || !bp) {
        setError("This share link is invalid or has been revoked.");
        setLoading(false);
        return;
      }

      setClarity((bp.customer_clarity as any) || {});
      setOffer(normalizeOfferDesign(bp.offer_stack));
      setGrowth(normalizeGrowthSystem(bp.growth_system));

      const [{ data: mappingRows }, { data: offerRows }, { data: ws }, { data: sub }] =
        await Promise.all([
          supabase
            .from("growth_funnel_mappings")
            .select("*")
            .eq("blueprint_id", bp.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("offers")
            .select("id, name, tier, data, source, sort_order")
            .eq("blueprint_id", bp.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("workspace_settings")
            .select("business_type, currency, help_achieve, who_help, main_goal, biggest_challenge")
            .eq("sub_account_id", bp.sub_account_id)
            .maybeSingle(),
          supabase
            .from("sub_accounts")
            .select("name")
            .eq("id", bp.sub_account_id)
            .maybeSingle(),
        ]);

      if (cancelled) return;
      setMappings((mappingRows as any) || []);
      setOffers((offerRows as any) || []);
      setWorkspace((ws as any) || {});
      setWorkspaceName((sub as any)?.name);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dashboard">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dashboard p-8 text-center">
        <Sparkles className="w-8 h-8 text-primary mb-3" />
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Blueprint not available
        </h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <BlueprintViewMode
        workspaceName={workspaceName}
        workspace={workspace}
        clarity={clarity}
        offer={offer}
        growth={growth}
        mappings={mappings}
        offers={offers}
        isPublic
      />
    </div>
  );
};

export default SharedBlueprint;
