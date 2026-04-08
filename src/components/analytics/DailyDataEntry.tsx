import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getMetricsForNodeType, type MetricField } from "./metricDefinitions";

interface FunnelNode {
  id: string;
  type: string;
  data: { label: string; customLabel?: string; pageType?: string; trafficType?: string };
}

interface DailyDataEntryProps {
  funnelId: string;
  nodes: FunnelNode[];
  edges: any[];
}

// Sort nodes in flow order using edges
function sortNodesByFlow(nodes: FunnelNode[], edges: any[]): FunnelNode[] {
  if (!edges.length) return nodes;
  const targetSet = new Set(edges.map((e: any) => e.target));
  const roots = nodes.filter((n) => !targetSet.has(n.id));
  const childMap = new Map<string, string[]>();
  edges.forEach((e: any) => {
    const arr = childMap.get(e.source) || [];
    arr.push(e.target);
    childMap.set(e.source, arr);
  });
  const ordered: FunnelNode[] = [];
  const visited = new Set<string>();
  const queue = [...roots];
  while (queue.length) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    ordered.push(node);
    (childMap.get(node.id) || []).forEach((childId) => {
      const child = nodes.find((n) => n.id === childId);
      if (child && !visited.has(child.id)) queue.push(child);
    });
  }
  // Add any unvisited nodes
  nodes.forEach((n) => { if (!visited.has(n.id)) ordered.push(n); });
  return ordered;
}

function getNodeType(node: FunnelNode): string {
  if (node.type === "trafficSource") return "trafficSource";
  return node.data?.pageType || "opt-in";
}

const DailyDataEntry = ({ funnelId, nodes, edges }: DailyDataEntryProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [metricsData, setMetricsData] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const orderedNodes = useMemo(() => sortNodesByFlow(nodes, edges), [nodes, edges]);

  const nodeMetricFields = useMemo(() => {
    const map: Record<string, MetricField[]> = {};
    orderedNodes.forEach((n) => {
      map[n.id] = getMetricsForNodeType(getNodeType(n));
    });
    return map;
  }, [orderedNodes]);

  // Load existing data for selected date
  useEffect(() => {
    if (!funnelId) return;
    const load = async () => {
      setLoading(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const { data: entry } = await supabase
        .from("funnel_analytics_entries")
        .select("id")
        .eq("funnel_id", funnelId)
        .eq("date", dateStr)
        .maybeSingle();

      if (entry) {
        const { data: stepMetrics } = await supabase
          .from("funnel_step_metrics")
          .select("node_id, metrics")
          .eq("entry_id", entry.id);

        const loaded: Record<string, Record<string, number>> = {};
        stepMetrics?.forEach((sm) => {
          loaded[sm.node_id] = (sm.metrics as Record<string, number>) || {};
        });
        setMetricsData(loaded);
      } else {
        setMetricsData({});
      }
      setLoading(false);
    };
    load();
  }, [funnelId, date]);

  const updateMetric = (nodeId: string, key: string, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    setMetricsData((prev) => {
      const nodeMetrics = { ...prev[nodeId], [key]: isNaN(num) ? 0 : num };
      // Compute calculated fields
      const fields = nodeMetricFields[nodeId] || [];
      fields.forEach((f) => {
        if (f.computed) {
          const result = f.computed(nodeMetrics);
          if (result !== null) nodeMetrics[f.key] = result;
        }
      });
      return { ...prev, [nodeId]: nodeMetrics };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user) throw new Error("Not authenticated");

      const dateStr = format(date, "yyyy-MM-dd");

      // Upsert entry
      const { data: entry, error: entryErr } = await supabase
        .from("funnel_analytics_entries")
        .upsert({ funnel_id: funnelId, user_id: user.id, date: dateStr, updated_at: new Date().toISOString() }, { onConflict: "funnel_id,date" })
        .select("id")
        .single();

      if (entryErr) throw entryErr;

      // Upsert step metrics
      const rows = orderedNodes.map((node) => ({
        entry_id: entry.id,
        node_id: node.id,
        node_label: node.data?.customLabel || node.data?.label || "",
        node_type: getNodeType(node),
        metrics: metricsData[node.id] || {},
      }));

      const { error: metricsErr } = await supabase
        .from("funnel_step_metrics")
        .upsert(rows, { onConflict: "entry_id,node_id" });

      if (metricsErr) throw metricsErr;

      toast.success(t("analytics.saved"));
    } catch (err: any) {
      toast.error(t("analytics.saveError"));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(date, "dd MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">{t("analytics.loading")}</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">{t("analytics.step")}</TableHead>
                <TableHead className="w-32">{t("analytics.type")}</TableHead>
                {/* Dynamic metric headers per row - we'll use inline headers */}
                <TableHead>{t("analytics.metrics")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedNodes.map((node) => {
                const fields = nodeMetricFields[node.id] || [];
                const nodeData = metricsData[node.id] || {};
                return (
                  <TableRow key={node.id}>
                    <TableCell className="font-medium">{node.data?.customLabel || t(node.data?.label) || node.id}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{getNodeType(node)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-3">
                        {fields.map((field) => (
                          <div key={field.key} className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground">{field.label}</label>
                            {field.computed ? (
                              <div className="h-10 flex items-center text-sm font-medium text-foreground px-2 bg-muted rounded-md min-w-[80px]">
                                {nodeData[field.key] != null ? (field.type === "percentage" ? `${nodeData[field.key]}%` : field.type === "currency" ? `€${nodeData[field.key]}` : nodeData[field.key]) : "—"}
                              </div>
                            ) : (
                              <Input
                                type="number"
                                step={field.type === "currency" ? "0.01" : "1"}
                                className="w-24"
                                value={nodeData[field.key] || ""}
                                onChange={(e) => updateMetric(node.id, field.key, e.target.value)}
                                placeholder="0"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? t("analytics.saving") : t("analytics.saveDay")}
        </Button>
      </div>
    </div>
  );
};

export default DailyDataEntry;
