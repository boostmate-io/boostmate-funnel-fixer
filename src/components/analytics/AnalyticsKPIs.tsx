import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { getPrimaryMetric } from "./metricDefinitions";
import { isTrackableNode } from "./nodeFilters";
import { sortNodesByFlow } from "./flowOrder";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Props {
  funnelId: string;
  nodes: any[];
  edges: any[];
  periodStart: Date;
  periodEnd: Date;
  refreshKey?: number;
  client: SupabaseClient<any>;
}

const AnalyticsKPIs = ({ funnelId, nodes, edges, periodStart, periodEnd, refreshKey, client }: Props) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [stepMetrics, setStepMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (!funnelId) return;
    const load = async () => {
      setLoading(true);
      const startStr = format(periodStart, "yyyy-MM-dd");
      const endStr = format(periodEnd, "yyyy-MM-dd");
      const { data: entryData } = await client
        .from("funnel_analytics_entries")
        .select("id, date")
        .eq("funnel_id", funnelId)
        .gte("date", startStr)
        .lte("date", endStr);

      if (!entryData?.length) {
        setStepMetrics([]);
        setLoading(false);
        return;
      }
      const { data: metrics } = await client
        .from("funnel_step_metrics")
        .select("entry_id, node_id, node_label, node_type, metrics")
        .in("entry_id", entryData.map((e: any) => e.id));
      setStepMetrics(metrics || []);
      setLoading(false);
    };
    load();
  }, [funnelId, periodStart, periodEnd, refreshKey, client]);

  const kpis = useMemo(() => {
    const orderedNodes = sortNodesByFlow(nodes, edges).filter(isTrackableNode);
    const totalsByNode = new Map<string, Record<string, number>>();
    stepMetrics.forEach((sm) => {
      const m = (sm.metrics as Record<string, number>) || {};
      const existing = totalsByNode.get(sm.node_id) || {};
      Object.entries(m).forEach(([k, v]) => {
        existing[k] = (existing[k] || 0) + (v as number);
      });
      totalsByNode.set(sm.node_id, existing);
    });

    return orderedNodes.map((n: any) => {
      const nodeType = n.type === "trafficSource" ? "trafficSource" : (n.data?.pageType || "opt-in");
      const primary = getPrimaryMetric(nodeType);
      const totals = totalsByNode.get(n.id) || {};
      const value = primary ? (totals[primary.key] || 0) : 0;
      const label = n.data?.customLabel || n.data?.label || nodeType;
      const formatted = primary?.type === "currency"
        ? `€${value.toFixed(2)}`
        : primary?.type === "percentage"
          ? `${value}%`
          : value.toLocaleString();
      return { id: n.id, label, metricLabel: primary?.label || "—", value: formatted };
    });
  }, [nodes, edges, stepMetrics]);

  if (loading) return <div className="text-muted-foreground text-sm py-4">{t("analytics.loading")}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <Card key={k.id}>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs mb-1 truncate" title={k.label}>{k.label}</div>
            <div className="text-2xl font-display font-bold text-foreground">{k.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.metricLabel}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnalyticsKPIs;
