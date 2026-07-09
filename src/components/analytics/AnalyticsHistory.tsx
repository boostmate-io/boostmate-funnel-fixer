import { useEffect, useState, useMemo, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { getPrimaryMetric } from "./metricDefinitions";
import { filterTrackableNodes } from "./nodeFilters";
import type { EditingEntry } from "./AnalyticsModule";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AnalyticsHistoryProps {
  funnelId: string;
  nodes: any[];
  refreshKey?: number;
  onEdit?: (entry: EditingEntry) => void;
  client: SupabaseClient<any>;
  readOnly?: boolean;
}

interface EntryRow {
  id: string;
  date: string;
  period_end: string;
  period_type: string;
  stepMetrics: { node_id: string; node_label: string; node_type: string; metrics: Record<string, number> }[];
}

function getNodeType(node: any): string {
  if (node?.type === "trafficSource") return "trafficSource";
  return node?.data?.pageType || "opt-in";
}

const AnalyticsHistory = ({ funnelId, nodes, refreshKey, onEdit, client, readOnly }: AnalyticsHistoryProps) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!funnelId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await client
        .from("funnel_analytics_entries")
        .select("id, date, period_end, period_type")
        .eq("funnel_id", funnelId)
        .order("date", { ascending: false })
        .limit(50);

      if (!data?.length) { setEntries([]); setLoading(false); return; }

      const entryIds = data.map((e: any) => e.id);
      const { data: metrics } = await client
        .from("funnel_step_metrics")
        .select("entry_id, node_id, node_label, node_type, metrics")
        .in("entry_id", entryIds);

      const rows: EntryRow[] = data.map((e: any) => ({
        id: e.id,
        date: e.date,
        period_end: e.period_end || e.date,
        period_type: e.period_type || "day",
        stepMetrics: (metrics || [])
          .filter((m: any) => m.entry_id === e.id)
          .map((m: any) => ({ node_id: m.node_id, node_label: m.node_label, node_type: m.node_type, metrics: (m.metrics as Record<string, number>) || {} })),
      }));

      setEntries(rows);
      setLoading(false);
    };
    load();
  }, [funnelId, refreshKey, client]);

  const trackableNodes = useMemo(() => filterTrackableNodes(nodes || []), [nodes]);
  const stepColumns = useMemo(() => {
    return trackableNodes.map((n: any) => {
      const nodeType = getNodeType(n);
      const primary = getPrimaryMetric(nodeType);
      return {
        nodeId: n.id,
        label: n.data?.customLabel || n.data?.label || n.id,
        metricKey: primary?.key || null,
        metricType: primary?.type || "number",
        metricLabel: primary?.label || "",
      };
    });
  }, [trackableNodes]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatValue = (val: number | undefined, type: string) => {
    if (val == null) return "—";
    if (type === "currency") return `€${val.toFixed(2)}`;
    if (type === "percentage") return `${val}%`;
    return val.toString();
  };

  if (loading) return <div className="text-muted-foreground text-sm py-4">{t("analytics.loading")}</div>;
  if (!entries.length) return <div className="text-muted-foreground text-sm py-4">{t("analytics.noHistory")}</div>;

  return (
    <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead className="min-w-[200px]">{t("analytics.period") || "Period"}</TableHead>
            {stepColumns.map((col) => (
              <TableHead key={col.nodeId} className="whitespace-nowrap">
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{col.label}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">{col.metricLabel}</span>
                </div>
              </TableHead>
            ))}
            {!readOnly && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((row) => {
            const isOpen = expanded.has(row.id);
            const isRange = row.date !== row.period_end;
            const label = row.period_type === "month"
              ? format(new Date(row.date), "MMMM yyyy")
              : isRange
                ? `${format(new Date(row.date), "dd MMM")} – ${format(new Date(row.period_end), "dd MMM yyyy")}`
                : format(new Date(row.date), "dd MMM yyyy");

            const stepById = new Map(row.stepMetrics.map((s) => [s.node_id, s]));

            return (
              <Fragment key={row.id}>
                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggle(row.id)}>
                  <TableCell>{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                  <TableCell className="font-medium">
                    {label}
                    <span className="ml-2 text-xs text-muted-foreground capitalize">({row.period_type})</span>
                  </TableCell>
                  {stepColumns.map((col) => {
                    const sm = stepById.get(col.nodeId);
                    const val = col.metricKey && sm ? sm.metrics[col.metricKey] : undefined;
                    return <TableCell key={col.nodeId} className="whitespace-nowrap">{formatValue(val, col.metricType)}</TableCell>;
                  })}
                  {!readOnly && (
                    <TableCell>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); onEdit?.({ id: row.id, date: row.date, period_end: row.period_end, period_type: row.period_type }); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
                {isOpen && row.stepMetrics.map((sm, i) => (
                  <TableRow key={`${row.id}-${i}`} className="bg-muted/20">
                    <TableCell></TableCell>
                    <TableCell className="text-sm pl-8">{sm.node_label || sm.node_type}</TableCell>
                    <TableCell colSpan={stepColumns.length + (readOnly ? 0 : 1)}>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {Object.entries(sm.metrics).map(([k, v]) => (
                          <span key={k} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{k}</span>: {v}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default AnalyticsHistory;
