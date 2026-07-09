import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import AnalyticsModule from "@/components/analytics/AnalyticsModule";
import { decodeAnalyticsConfig } from "@/components/analytics/AnalyticsShareDialog";
import logo from "@/assets/logo-boostmate.svg";

const SharedAnalytics = () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await publicSupabase
        .from("funnels")
        .select("id, name, nodes, edges, share_token")
        .eq("share_token", token)
        .maybeSingle();
      if (err || !data) setError(true);
      else setFunnel(data);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (error || !funnel) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={logo} alt="Boostmate" className="h-8" />
        <p className="text-muted-foreground">This analytics link is invalid or has been removed.</p>
      </div>
    );
  }

  const initialConfig = decodeAnalyticsConfig(location.search);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Boostmate" className="h-5" />
          <span className="text-sm font-display font-bold text-foreground">{funnel.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">Read-only analytics view</span>
      </div>
      <div className="flex-1 min-h-0">
        <AnalyticsModule
          sharedFunnel={{
            id: funnel.id,
            name: funnel.name,
            nodes: (funnel.nodes as any[]) || [],
            edges: (funnel.edges as any[]) || [],
            shareToken: funnel.share_token,
          }}
          client={publicSupabase}
          readOnly
          hideFunnelSelector
          initialConfig={initialConfig}
        />
      </div>
    </div>
  );
};

export default SharedAnalytics;
