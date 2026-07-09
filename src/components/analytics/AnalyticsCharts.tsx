import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { Settings2 } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfQuarter } from "date-fns";
import { getMetricsForNodeType, getPrimaryMetric, type MetricField } from "./metricDefinitions";
import { isTrackableNode } from "./nodeFilters";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Granularity = "day" | "week" | "month" | "quarter";

interface AnalyticsChartsProps {
  funnelId: string;
  nodes: any[];
  periodStart: Date;
  periodEnd: Date;
  refreshKey?: number;
  client: SupabaseClient<any>;
  granularity?: Granularity;
  onGranularityChange?: (g: Granularity) => void;
  selectedMetrics?: string[] | null;
  onSelectedMetricsChange?: (keys: string[]) => void;
}

const COLORS = [
  "hsl(252, 100%, 64%)", "hsl(340, 82%, 52%)", "hsl(200, 90%, 50%)", "hsl(142, 71%, 45%)",
  "hsl(32, 95%, 55%)", "hsl(280, 70%, 55%)", "hsl(16, 85%, 55%)", "hsl(180, 70%, 40%)",
  "hsl(50, 90%, 50%)", "hsl(300, 70%, 55%)",
];

const getNodeType = (n: any): string =>
  n?.type === "trafficSource" ? "trafficSource" : (n?.data?.pageType || "opt-in");

const bucketDate = (date: Date, g: Granularity): Date => {
  if (g === "week") return startOfWeek(date, { weekStartsOn: 1 });
  if (g === "month") return startOfMonth(date);
  if (g === "quarter") return startOfQuarter(date);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
const formatBucket = (date: Date, g: Granularity): string => {
  if (g === "week") return `W${format(date, "II '·' dd MMM")}`;
  if (g === "month") return format(date, "MMM yyyy");
  if (g === "quarter") return `Q${Math.floor(date.getMonth() / 3) + 1} ${format(date, "yyyy")}`;
  return format(date, "dd MMM");
};

const AnalyticsCharts = ({
  funnelId, nodes, periodStart, periodEnd, refreshKey, client,
  granularity: granularityProp, onGranularityChange,
  selectedMetrics, onSelectedMetricsChange,
}: AnalyticsChartsProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [stepMetrics, setStepMetrics] = useState<any[]>([]);
  const [internalGranularity, setInternalGranularity] = useState<Granularity>("day");
  const [internalSelected, setInternalSelected] = useState<Set<string> | null>(null);

  const granularity: Granularity = granularityProp ?? internalGranularity;
  const setGranularity = (g: Granularity) => {
    if (onGranularityChange) onGranularityChange(g);
    else setInternalGranularity(g);
  };

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
        .lte("date", endStr)
        .order("date", { ascending: true });

      if (!entryData?.length) {
        setEntries([]); setStepMetrics([]); setLoading(false); return;
      }
      setEntries(entryData);
      const { data: metrics } = await client
        .from("funnel_step_metrics")
        .select("entry_id, node_id, node_label, node_type, metrics")
        .in("entry_id", entryData.map((e: any) => e.id));
      setStepMetrics(metrics || []);
      setLoading(false);
    };
    load();
  }, [funnelId, periodStart, periodEnd, refreshKey, client]);

  const trackableNodes = useMemo(() => nodes.filter(isTrackableNode), [nodes]);

  const nodeCatalogue = useMemo(() => {
    return trackableNodes.map((n: any) => {
      const nodeType = getNodeType(n);
      const fields = getMetricsForNodeType(nodeType).filter((f) => !f.computed);
      const primary = getPrimaryMetric(nodeType);
      return {
        id: n.id,
        label: n.data?.customLabel || n.data?.label || n.id,
        nodeType,
        fields,
        primaryKey: primary?.key || fields[0]?.key || null,
      };
    });
  }, [trackableNodes]);

  // Determine which selection to use: controlled prop, internal state, or auto-derive from primary metrics.
  const derivedDefault = useMemo(() => {
    const s = new Set<string>();
    nodeCatalogue.forEach((c) => { if (c.primaryKey) s.add(`${c.id}::${c.primaryKey}`); });
    return s;
  }, [nodeCatalogue]);

  useEffect(() => {
    if (selectedMetrics !== undefined) return; // controlled
    if (internalSelected !== null) return;
    if (!nodeCatalogue.length) return;
    setInternalSelected(new Set(derivedDefault));
  }, [nodeCatalogue, internalSelected, derivedDefault, selectedMetrics]);

  const activeSelected: Set<string> = useMemo(() => {
    if (selectedMetrics !== undefined && selectedMetrics !== null) return new Set(selectedMetrics);
    return internalSelected ?? new Set<string>();
  }, [selectedMetrics, internalSelected]);

  const toggleMetric = (key: string) => {
    const next = new Set(activeSelected);
    next.has(key) ? next.delete(key) : next.add(key);
    if (onSelectedMetricsChange) onSelectedMetricsChange(Array.from(next));
    else setInternalSelected(next);
  };

  const { chartData, seriesConfig } = useMemo(() => {
    const buckets = new Map<string, { label: string; date: Date; values: Record<string, number> }>();
    const entryById = new Map(entries.map((e) => [e.id, e]));

    entries.forEach((e) => {
      const d = bucketDate(new Date(e.date), granularity);
      const key = d.toISOString();
      if (!buckets.has(key)) buckets.set(key, { label: formatBucket(d, granularity), date: d, values: {} });
    });

    stepMetrics.forEach((sm) => {
      const entry = entryById.get(sm.entry_id);
      if (!entry) return;
      const d = bucketDate(new Date(entry.date), granularity);
      const bucket = buckets.get(d.toISOString());
      if (!bucket) return;
      const m = (sm.metrics as Record<string, number>) || {};
      Object.entries(m).forEach(([k, v]) => {
        const seriesKey = `${sm.node_id}::${k}`;
        if (!activeSelected.has(seriesKey)) return;
        bucket.values[seriesKey] = (bucket.values[seriesKey] || 0) + (v as number);
      });
    });

    const sorted = Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    const seriesKeys = Array.from(activeSelected);

    const seriesConfig: Record<string, { label: string; color: string }> = {};
    seriesKeys.forEach((sk, i) => {
      const [nodeId, metricKey] = sk.split("::");
      const cat = nodeCatalogue.find((c) => c.id === nodeId);
      const field = cat?.fields.find((f) => f.key === metricKey);
      seriesConfig[sk] = {
        label: `${cat?.label || nodeId} · ${field?.label || metricKey}`,
        color: COLORS[i % COLORS.length],
      };
    });

    const chartData = sorted.map((b) => {
      const row: Record<string, any> = { date: b.label };
      seriesKeys.forEach((sk) => { row[sk] = b.values[sk] || 0; });
      return row;
    });

    return { chartData, seriesConfig };
  }, [entries, stepMetrics, granularity, activeSelected, nodeCatalogue]);

  if (loading) return <div className="text-muted-foreground text-sm py-4">{t("analytics.loading")}</div>;
  if (!entries.length) return <div className="text-muted-foreground text-sm py-4">{t("analytics.noHistory")}</div>;

  const seriesKeys = Object.keys(seriesConfig);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t("analytics.granularity.day") || "Daily"}</SelectItem>
            <SelectItem value="week">{t("analytics.granularity.week") || "Weekly"}</SelectItem>
            <SelectItem value="month">{t("analytics.granularity.month") || "Monthly"}</SelectItem>
            <SelectItem value="quarter">{t("analytics.granularity.quarter") || "Quarterly"}</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="w-4 h-4" />
              {t("analytics.charts.customize") || "Metrics"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="end">
            <div className="space-y-4">
              {nodeCatalogue.map((c) => (
                <div key={c.id} className="space-y-1.5">
                  <div className="text-xs font-semibold text-foreground truncate">{c.label}</div>
                  <div className="space-y-1 pl-1">
                    {c.fields.map((f: MetricField) => {
                      const key = `${c.id}::${f.key}`;
                      const checked = activeSelected.has(key);
                      return (
                        <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox checked={checked} onCheckedChange={() => toggleMetric(key)} />
                          <span className={checked ? "text-foreground" : "text-muted-foreground"}>{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!nodeCatalogue.length && (
                <div className="text-xs text-muted-foreground">No trackable steps.</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {seriesKeys.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
              {seriesKeys.map((sk) => (
                <div key={sk} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seriesConfig[sk].color }} />
                  <span className="text-muted-foreground">{seriesConfig[sk].label}</span>
                </div>
              ))}
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  {seriesKeys.map((sk) => (
                    <Line key={sk} type="monotone" dataKey={sk} name={seriesConfig[sk].label}
                      stroke={seriesConfig[sk].color} strokeWidth={2}
                      dot={{ r: 3, fill: seriesConfig[sk].color }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-muted-foreground text-sm py-4">{t("analytics.charts.noMetricsSelected") || "Select at least one metric to display."}</div>
      )}
    </div>
  );
};

export default AnalyticsCharts;
