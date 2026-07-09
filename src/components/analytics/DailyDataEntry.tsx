import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Save } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
import { toast } from "sonner";
import { getMetricsForNodeType, type MetricField } from "./metricDefinitions";
import { filterTrackableNodes } from "./nodeFilters";
import { cn } from "@/lib/utils";

interface FunnelNode {
  id: string;
  type: string;
  data: { label: string; customLabel?: string; pageType?: string; trafficType?: string; renderStyle?: string };
}

interface DailyDataEntryProps {
  funnelId: string;
  nodes: FunnelNode[];
  edges: any[];
  editingEntry?: { id: string; date: string; period_end: string; period_type: string } | null;
  onSaved?: () => void;
  onCancelEdit?: () => void;
}

type PeriodType = "day" | "week" | "month" | "custom";

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
  nodes.forEach((n) => { if (!visited.has(n.id)) ordered.push(n); });
  return ordered;
}

function getNodeType(node: FunnelNode): string {
  if (node.type === "trafficSource") return "trafficSource";
  return node.data?.pageType || "opt-in";
}

function computeRange(type: PeriodType, start: Date, customEnd?: Date): { start: Date; end: Date } {
  if (type === "day") return { start, end: start };
  if (type === "week") return { start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(start, { weekStartsOn: 1 }) };
  if (type === "month") return { start: startOfMonth(start), end: endOfMonth(start) };
  return { start, end: customEnd && customEnd >= start ? customEnd : start };
}

function formatRange(type: PeriodType, start: Date, end: Date): string {
  if (type === "day") return format(start, "dd MMM yyyy");
  if (type === "month") return format(start, "MMMM yyyy");
  return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
}

const DailyDataEntry = ({ funnelId, nodes, edges, editingEntry, onSaved, onCancelEdit }: DailyDataEntryProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [metricsData, setMetricsData] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // When an entry is chosen for editing, sync selectors to that period
  useEffect(() => {
    if (!editingEntry) return;
    const pt = (editingEntry.period_type as PeriodType) || "day";
    setPeriodType(pt);
    setStartDate(new Date(editingEntry.date));
    setEndDate(new Date(editingEntry.period_end || editingEntry.date));
  }, [editingEntry]);

  const range = useMemo(() => computeRange(periodType, startDate, endDate), [periodType, startDate, endDate]);

  const orderedNodes = useMemo(
    () => filterTrackableNodes(sortNodesByFlow(nodes, edges)),
    [nodes, edges]
  );

  const nodeMetricFields = useMemo(() => {
    const map: Record<string, MetricField[]> = {};
    orderedNodes.forEach((n) => {
      map[n.id] = getMetricsForNodeType(getNodeType(n));
    });
    return map;
  }, [orderedNodes]);

  // Load existing data for selected period
  useEffect(() => {
    if (!funnelId) return;
    const load = async () => {
      setLoading(true);
      const startStr = format(range.start, "yyyy-MM-dd");
      const endStr = format(range.end, "yyyy-MM-dd");
      const { data: entry } = await supabase
        .from("funnel_analytics_entries")
        .select("id")
        .eq("funnel_id", funnelId)
        .eq("date", startStr)
        .eq("period_end", endStr)
        .eq("period_type", periodType)
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
  }, [funnelId, range.start, range.end, periodType]);

  const updateMetric = (nodeId: string, key: string, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    setMetricsData((prev) => {
      const nodeMetrics = { ...prev[nodeId], [key]: isNaN(num) ? 0 : num };
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

      const startStr = format(range.start, "yyyy-MM-dd");
      const endStr = format(range.end, "yyyy-MM-dd");

      const { data: entry, error: entryErr } = await supabase
        .from("funnel_analytics_entries")
        .upsert(
          {
            funnel_id: funnelId,
            user_id: user.id,
            date: startStr,
            period_end: endStr,
            period_type: periodType,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "funnel_id,date,period_type" }
        )
        .select("id")
        .single();

      if (entryErr) throw entryErr;

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
      // Reset form and trigger parent refresh
      setMetricsData({});
      setStartDate(new Date());
      setEndDate(new Date());
      setPeriodType("day");
      onSaved?.();
    } catch (err: any) {
      toast.error(t("analytics.saveError"));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {editingEntry && (
        <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-foreground">
            {t("analytics.editingEntry") || "Editing historical entry"} — {format(new Date(editingEntry.date), "dd MMM yyyy")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onCancelEdit?.()}>{t("common.cancel") || "Cancel"}</Button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t("analytics.period") || "Period"}</label>
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("analytics.periodDay") || "Day"}</SelectItem>
              <SelectItem value="week">{t("analytics.periodWeek") || "Week"}</SelectItem>
              <SelectItem value="month">{t("analytics.periodMonth") || "Month"}</SelectItem>
              <SelectItem value="custom">{t("analytics.periodCustom") || "Custom"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            {periodType === "custom" ? (t("analytics.startDate") || "Start") : (t("analytics.date") || "Date")}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {formatRange(periodType, range.start, range.end)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => {
                  if (!d) return;
                  setStartDate(d);
                  if (periodType === "custom" && endDate < d) setEndDate(d);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {periodType === "custom" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t("analytics.endDate") || "End"}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(endDate, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d < startDate ? startDate : d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
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
          {saving ? t("analytics.saving") : (t("analytics.savePeriod") || t("analytics.saveDay"))}
        </Button>
      </div>
    </div>
  );
};

export default DailyDataEntry;
