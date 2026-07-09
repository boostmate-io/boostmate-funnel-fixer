import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ReactFlow, Background, ReactFlowProvider, type Node, type Edge, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { format } from "date-fns";
import { getMetricsForNodeType } from "./metricDefinitions";
import { isTrackableNode, filterAndRewireEdges } from "./nodeFilters";
import AnalyticsFunnelNode from "./AnalyticsFunnelNode";
import AnalyticsTrafficNode from "./AnalyticsTrafficNode";

const nodeTypes = {
  funnelNode: AnalyticsFunnelNode,
  funnelPage: AnalyticsFunnelNode,
  trafficSource: AnalyticsTrafficNode,
};

interface AnalyticsSummaryProps {
  funnelId: string;
  nodes: any[];
  edges: any[];
  periodStart: Date;
  periodEnd: Date;
  refreshKey?: number;
}

interface StepAggregate {
  node_label: string;
  node_type: string;
  totals: Record<string, number>;
  days: number;
}

const AnalyticsSummaryInner = ({ funnelId, nodes, edges, periodStart, periodEnd, refreshKey }: AnalyticsSummaryProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [stepMetrics, setStepMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (!funnelId) return;
    const load = async () => {
      setLoading(true);
      const startStr = format(periodStart, "yyyy-MM-dd");
      const endStr = format(periodEnd, "yyyy-MM-dd");
      const { data: entryData } = await supabase
        .from("funnel_analytics_entries")
        .select("id, date")
        .eq("funnel_id", funnelId)
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: false });

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
  }, [funnelId, periodStart, periodEnd, refreshKey]);

  const { totalSpend, totalRevenue, totalDays, roas, stepAggregates, stepAggregateMap } = useMemo(() => {
    let totalSpend = 0;
    let totalRevenue = 0;
    const totalDays = entries.length;

    const trackableIds = new Set(nodes.filter(isTrackableNode).map((n: any) => n.id));
    const stepMap = new Map<string, StepAggregate>();

    stepMetrics.forEach((sm) => {
      if (!trackableIds.has(sm.node_id)) return;
      const m = (sm.metrics as Record<string, number>) || {};
      totalSpend += m.spend || 0;
      totalRevenue += m.revenue || 0;

      const key = sm.node_id;
      if (!stepMap.has(key)) {
        stepMap.set(key, {
          node_label: sm.node_label || sm.node_type,
          node_type: sm.node_type,
          totals: {},
          days: 0,
        });
      }
      const agg = stepMap.get(key)!;
      agg.days++;
      Object.entries(m).forEach(([k, v]) => {
        agg.totals[k] = (agg.totals[k] || 0) + (v as number);
      });
    });

    const roas = totalSpend > 0 ? +(totalRevenue / totalSpend).toFixed(2) : null;

    const nodeOrder = new Map<string, number>();
    nodes.forEach((n: any, i: number) => nodeOrder.set(n.id, i));
    const stepAggregates = Array.from(stepMap.entries())
      .sort(([a], [b]) => (nodeOrder.get(a) ?? 99) - (nodeOrder.get(b) ?? 99))
      .map(([, v]) => v);

    return { totalSpend, totalRevenue, totalDays, roas, stepAggregates, stepAggregateMap: stepMap };
  }, [entries, stepMetrics, nodes]);

  // Filter non-trackable nodes and rewire edges around them
  const filtered = useMemo(() => filterAndRewireEdges(nodes, edges), [nodes, edges]);

  const flowNodes: Node[] = useMemo(() => {
    return filtered.nodes.map((n: any) => {
      const agg = stepAggregateMap.get(n.id);
      const analyticsMetrics: { label: string; value: string }[] = [];

      if (agg) {
        const nodeType = n.type === "trafficSource" ? "trafficSource" : (n.data?.pageType || "opt-in");
        const fields = getMetricsForNodeType(nodeType);
        const computed: Record<string, number | null> = {};
        fields.forEach((f) => {
          if (f.computed) computed[f.key] = f.computed(agg.totals);
        });

        const displayFields = fields.slice(0, 4);
        displayFields.forEach((f) => {
          const val = f.computed ? computed[f.key] : agg.totals[f.key];
          if (val != null) {
            analyticsMetrics.push({
              label: f.label,
              value: f.type === "currency" ? `€${Number(val).toFixed(2)}` : f.type === "percentage" ? `${val}%` : String(val),
            });
          }
        });
      }

      return {
        ...n,
        data: { ...n.data, analyticsMetrics },
        draggable: false,
        connectable: false,
        selectable: false,
      };
    });
  }, [filtered.nodes, stepAggregateMap]);

  const flowEdges: Edge[] = useMemo(() => {
    return filtered.edges.map((e: any) => ({
      ...e,
      animated: true,
      style: { stroke: "hsl(252, 100%, 64%)", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(252, 100%, 64%)" },
    }));
  }, [filtered.edges]);

  if (loading) return <div className="text-muted-foreground text-sm py-4">{t("analytics.loading")}</div>;
  if (!entries.length) return <div className="text-muted-foreground text-sm py-4">{t("analytics.noHistory")}</div>;

  return (
    <div className="space-y-6">
      {/* Funnel visualization with metrics */}
      <div className="w-full h-[420px] rounded-lg border border-border bg-background overflow-hidden">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} />
        </ReactFlow>
      </div>

      {/* Per-step summary table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("analytics.step")}</TableHead>
              <TableHead>{t("analytics.type")}</TableHead>
              <TableHead>{t("analytics.summary.totalMetrics")}</TableHead>
              <TableHead className="text-right">{t("analytics.summary.avgPerDay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stepAggregates.map((step, i) => {
              const fields = getMetricsForNodeType(step.node_type);
              const computed: Record<string, number | null> = {};
              fields.forEach((f) => {
                if (f.computed) computed[f.key] = f.computed(step.totals);
              });

              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{step.node_label}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{step.node_type}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {fields.map((f) => {
                        const val = f.computed ? computed[f.key] : step.totals[f.key];
                        if (val == null && !step.totals[f.key]) return null;
                        return (
                          <span key={f.key} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{f.label}</span>:{" "}
                            {f.type === "currency" ? `€${(val ?? 0).toFixed(2)}` : f.type === "percentage" ? `${val ?? 0}%` : val ?? 0}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap gap-3 text-xs justify-end">
                      {fields.filter((f) => !f.computed).map((f) => {
                        const avg = step.days > 0 ? +((step.totals[f.key] || 0) / step.days).toFixed(1) : 0;
                        return (
                          <span key={f.key} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{f.label}</span>:{" "}
                            {f.type === "currency" ? `€${avg.toFixed(2)}` : avg}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};


const AnalyticsSummary = (props: AnalyticsSummaryProps) => (
  <ReactFlowProvider>
    <AnalyticsSummaryInner {...props} />
  </ReactFlowProvider>
);

export default AnalyticsSummary;
