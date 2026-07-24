import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FunnelList from "./FunnelList";
import FunnelDesigner from "./FunnelDesigner";

interface FunnelModuleProps {
  onNavigateToOffer?: (offerId: string) => void;
}

const FunnelModule = ({ onNavigateToOffer }: FunnelModuleProps) => {
  const [editingFunnel, setEditingFunnel] = useState<any | null>(null);
  const [showDesigner, setShowDesigner] = useState(false);

  // Allow other modules (e.g. Blueprint → Start Building) to deep-open a funnel.
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { funnelId?: string } | undefined;
      const funnelId = detail?.funnelId;
      if (!funnelId) return;
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("id", funnelId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Could not open funnel");
        return;
      }
      setShowDesigner(false);
      setEditingFunnel(data);
    };
    window.addEventListener("boostmate:open-funnel", handler);
    return () => window.removeEventListener("boostmate:open-funnel", handler);
  }, []);

  if (showDesigner || editingFunnel) {
    return (
      <FunnelDesigner
        onNavigateToOffer={onNavigateToOffer}
        initialFunnel={editingFunnel}
        onBackToList={() => { setEditingFunnel(null); setShowDesigner(false); }}
      />
    );
  }

  return (
    <FunnelList
      onOpenFunnel={(funnel) => setEditingFunnel(funnel)}
      onCreateNew={() => setShowDesigner(true)}
    />
  );
};

export default FunnelModule;
