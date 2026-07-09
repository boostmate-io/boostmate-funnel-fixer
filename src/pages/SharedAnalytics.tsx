import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import AnalyticsModule, { type AnalyticsViewConfig } from "@/components/analytics/AnalyticsModule";
import logo from "@/assets/logo-boostmate.svg";

const SharedAnalytics = () => {
  const { token } = useParams<{ token: string }>();
  const [funnel, setFunnel] = useState<any>(null);
  const [initialConfig, setInitialConfig] = useState<Partial<AnalyticsViewConfig> | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await publicSupabase
        .from("funnels")
        .select("id, name, nodes, edges, share_token, shared_view_id")
        .eq("share_token", token)
        .maybeSingle();
      if (err || !data) {
        setError(true);
        setLoading(false);
        return;
      }
      setFunnel(data);

      const sharedViewId = (data as any).shared_view_id;
      if (sharedViewId) {
        const { data: view } = await publicSupabase
          .from("analytics_saved_views")
          .select("config")
          .eq("id", sharedViewId)
          .maybeSingle();
        const cfg: any = (view as any)?.config;
        if (cfg?.period) {
          setInitialConfig({
            period: {
              start: new Date(cfg.period.start),
              end: new Date(cfg.period.end),
              label: cfg.period.label,
            },
            granularity: cfg.granularity || "day",
            selectedMetrics: cfg.selectedMetrics ?? null,
            selectedKPIs: cfg.selectedKPIs ?? null,
            labelOverrides: cfg.labelOverrides ?? null,
          });
        }
      }
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <img src={logo} alt="Boostmate" className="h-5" />
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
          titleOverride={`Analytics: ${funnel.name}`}
        />
      </div>
    </div>
  );
};

export default SharedAnalytics;
