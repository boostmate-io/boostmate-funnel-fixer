import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import { format } from "date-fns";
import { getMetricsForNodeType, getPrimaryMetric, type MetricField } from "./metricDefinitions";
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
  selectedKPIs?: string[] | null;
  onSelectedKPIsChange?: (keys: string[]) => void;
  readOnly?: boolean;
  title?: string;
}

const getNodeType = (n: any): string =>
  n?.type === "trafficSource" ? "trafficSource" : (n?.data?.pageType || "opt-in");

const AnalyticsKPIs = ({
  funnelId, nodes, edges, periodStart, periodEnd, refreshKey, client,
  selectedKPIs, onSelectedKPIsChange, readOnly, title,
}: Props) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [stepMetrics, setStepMetrics] = useState<any[]>([]);
  const [internalSelected, setInternalSelected] = useState<Set<string> | null>(null);

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

  const orderedNodes = useMemo(
    () => sortNodesByFlow(nodes, edges).filter(isTrackableNode),
    [nodes, edges]
  );

  const nodeCatalogue = useMemo(() => {
    return orderedNodes.map((n: any) => {
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
  }, [orderedNodes]);

  const derivedDefault = useMemo(() => {
    const s = new Set<string>();
    nodeCatalogue.forEach((c) => { if (c.primaryKey) s.add(`${c.id}::${c.primaryKey}`); });
    return s;
  }, [nodeCatalogue]);

  useEffect(() => {
    if (!nodeCatalogue.length) return;
    if (selectedKPIs === null && onSelectedKPIsChange) {
      onSelectedKPIsChange(Array.from(derivedDefault));
      return;
    }
    if (selectedKPIs !== undefined) return;
    if (internalSelected !== null) return;
    setInternalSelected(new Set(derivedDefault));
  }, [nodeCatalogue, internalSelected, derivedDefault, selectedKPIs, onSelectedKPIsChange]);

  const activeSelected: Set<string> = useMemo(() => {
    if (selectedKPIs !== undefined && selectedKPIs !== null) return new Set(selectedKPIs);
    if (selectedKPIs === null) return derivedDefault;
    return internalSelected ?? derivedDefault;
  }, [selectedKPIs, internalSelected, derivedDefault]);

  const toggle = (key: string) => {
    const next = new Set(activeSelected);
    next.has(key) ? next.delete(key) : next.add(key);
    if (onSelectedKPIsChange) onSelectedKPIsChange(Array.from(next));
    else setInternalSelected(next);
  };

  const totalsByNode = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    stepMetrics.forEach((sm) => {
      const metrics = (sm.metrics as Record<string, number>) || {};
      const existing = m.get(sm.node_id) || {};
      Object.entries(metrics).forEach(([k, v]) => {
        existing[k] = (existing[k] || 0) + (v as number);
      });
      m.set(sm.node_id, existing);
    });
    return m;
  }, [stepMetrics]);

  const kpis = useMemo(() => {
    const items: { id: string; label: string; metricLabel: string; value: string }[] = [];
    nodeCatalogue.forEach((c) => {
      const totals = totalsByNode.get(c.id) || {};
      c.fields.forEach((f: MetricField) => {
        const key = `${c.id}::${f.key}`;
        if (!activeSelected.has(key)) return;
        const value = totals[f.key] || 0;
        const formatted = f.type === "currency"
          ? `€${value.toFixed(2)}`
          : f.type === "percentage"
            ? `${value}%`
            : value.toLocaleString();
        items.push({ id: key, label: c.label, metricLabel: f.label, value: formatted });
      });
    });
    return items;
  }, [nodeCatalogue, totalsByNode, activeSelected]);

  if (loading) return <div className="text-muted-foreground text-sm py-4">{t("analytics.loading")}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="w-4 h-4" />
              {t("analytics.kpisTitle") || "Overview metrics"}
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
                          <Checkbox checked={checked} onCheckedChange={() => toggle(key)} />
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
    </div>
  );
};

export default AnalyticsKPIs;
