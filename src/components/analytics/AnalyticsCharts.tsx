import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { getMetricsForNodeType } from "./metricDefinitions";

interface AnalyticsChartsProps {
  funnelId: string;
  nodes: any[];
}

interface DayData {
  date: string;
  [key: string]: string | number;
}

const COLORS = [
  "hsl(252, 100%, 64%)",
  "hsl(340, 82%, 52%)",
  "hsl(200, 90%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(32, 95%, 55%)",
  "hsl(280, 70%, 55%)",
];

const AnalyticsCharts = ({ funnelId, nodes }: AnalyticsChartsProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [stepMetrics, setStepMetrics] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("__all__");

  useEffect(() => {
    if (!funnelId) return;
    const load = async () => {
      setLoading(true);
      const { data: entryData } = await supabase
        .from("funnel_analytics_entries")
        .select("id, date")
        .eq("funnel_id", funnelId)
        .order("date", { ascending: true })
        .limit(30);

      if (!entryData?.length) {
        setEntries([]);
        setStepMetrics([]);
        setLoading(false);
        return;
      }

      setEntries(entryData);
      const entryIds = entryData.map((e) => e.id);
      const { data: metrics } = await supabase
        .from("funnel_step_metrics")
        .select("entry_id, node_id, node_label, node_type, metrics")
        .in("entry_id", entryIds);

      setStepMetrics(metrics || []);
      setLoading(false);
    };
    load();
  }, [funnelId]);

  // Build node options for the filter
  const nodeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    stepMetrics.forEach((sm) => {
      if (!seen.has(sm.node_id)) {
        seen.set(sm.node_id, sm.node_label || sm.node_type);
      }
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [stepMetrics]);

  // Build available metric keys for selected node(s)
  const { chartData, metricKeys, chartConfig } = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();

    // Initialize dates
    entries.forEach((e) => {
      dateMap.set(e.id, {});
    });

    const dateById = new Map<string, string>();
    entries.forEach((e) => dateById.set(e.id, e.date));

    // Collect relevant metrics
    const relevantMetrics = selectedNode === "__all__"
      ? stepMetrics
      : stepMetrics.filter((sm) => sm.node_id === selectedNode);

    // For "__all__", aggregate totals per date; for single node, show that node's metrics
    const allMetricKeys = new Set<string>();

    if (selectedNode === "__all__") {
      // Show total spend, total revenue, total visitors, total conversions
      relevantMetrics.forEach((sm) => {
        const m = (sm.metrics as Record<string, number>) || {};
        const existing = dateMap.get(sm.entry_id) || {};
        Object.entries(m).forEach(([k, v]) => {
          allMetricKeys.add(k);
          existing[k] = (existing[k] || 0) + (v as number);
        });
        dateMap.set(sm.entry_id, existing);
      });
    } else {
      // Single node: get the node type's defined metrics
      const nodeInfo = nodes.find((n: any) => n.id === selectedNode);
      const nodeType = nodeInfo?.type === "trafficSource" ? "trafficSource" : (nodeInfo?.data?.pageType || "opt-in");
      const fields = getMetricsForNodeType(nodeType);
      fields.forEach((f) => allMetricKeys.add(f.key));

      relevantMetrics.forEach((sm) => {
        const m = (sm.metrics as Record<string, number>) || {};
        dateMap.set(sm.entry_id, { ...m });
      });
    }

    // Remove computed percentage fields from "all" view to avoid nonsense aggregations
    if (selectedNode === "__all__") {
      ["conversion_rate", "completion_rate", "acceptance_rate", "open_rate", "click_rate", "cpc"].forEach((k) => allMetricKeys.delete(k));
    }

    const metricKeys = Array.from(allMetricKeys);

    // Build chart data sorted by date
    const chartData: DayData[] = entries.map((e) => {
      const row: DayData = { date: format(new Date(e.date), "dd MMM") };
      const vals = dateMap.get(e.id) || {};
      metricKeys.forEach((k) => {
        row[k] = vals[k] || 0;
      });
      return row;
    });

    // Build recharts config
    const chartConfig: Record<string, { label: string; color: string }> = {};
    metricKeys.forEach((k, i) => {
      chartConfig[k] = { label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), color: COLORS[i % COLORS.length] };
    });

    return { chartData, metricKeys, chartConfig };
  }, [entries, stepMetrics, selectedNode, nodes]);

  if (loading) return <div className="text-muted-foreground text-sm py-4">{t("analytics.loading")}</div>;
  if (!entries.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedNode} onValueChange={setSelectedNode}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("analytics.charts.allSteps")}</SelectItem>
            {nodeOptions.map((n) => (
              <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {metricKeys.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4">
              {metricKeys.map((k) => (
                <div key={k} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartConfig[k]?.color }} />
                  <span className="text-muted-foreground">{chartConfig[k]?.label}</span>
                </div>
              ))}
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  {metricKeys.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={chartConfig[k]?.label}
                      stroke={chartConfig[k]?.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: chartConfig[k]?.color }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-muted-foreground text-sm py-4">{t("analytics.noHistory")}</div>
      )}
    </div>
  );
};

export default AnalyticsCharts;
