import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface AnalyticsHistoryProps {
  funnelId: string;
}

interface EntryRow {
  id: string;
  date: string;
  stepMetrics: { node_label: string; node_type: string; metrics: Record<string, number> }[];
}

const AnalyticsHistory = ({ funnelId }: AnalyticsHistoryProps) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!funnelId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("funnel_analytics_entries")
        .select("id, date")
        .eq("funnel_id", funnelId)
        .order("date", { ascending: false })
        .limit(30);

      if (!data?.length) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const entryIds = data.map((e) => e.id);
      const { data: metrics } = await supabase
        .from("funnel_step_metrics")
        .select("entry_id, node_label, node_type, metrics")
        .in("entry_id", entryIds);

      const rows: EntryRow[] = data.map((e) => ({
        id: e.id,
        date: e.date,
        stepMetrics: (metrics || [])
          .filter((m) => m.entry_id === e.id)
          .map((m) => ({ node_label: m.node_label, node_type: m.node_type, metrics: (m.metrics as Record<string, number>) || {} })),
      }));

      setEntries(rows);
      setLoading(false);
    };
    load();
  }, [funnelId]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Compute total spend and revenue for a row
  const getSummary = (row: EntryRow) => {
    let spend = 0, revenue = 0;
    row.stepMetrics.forEach((s) => {
      spend += s.metrics.spend || 0;
      revenue += s.metrics.revenue || 0;
    });
    return { spend, revenue };
  };

  if (loading) return <div className="text-muted-foreground text-sm py-4">{t("analytics.loading")}</div>;
  if (!entries.length) return <div className="text-muted-foreground text-sm py-4">{t("analytics.noHistory")}</div>;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>{t("analytics.date")}</TableHead>
            <TableHead>{t("analytics.totalSpend")}</TableHead>
            <TableHead>{t("analytics.totalRevenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((row) => {
            const isOpen = expanded.has(row.id);
            const summary = getSummary(row);
            return (
              <>
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggle(row.id)}>
                  <TableCell>{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                  <TableCell className="font-medium">{format(new Date(row.date), "dd MMM yyyy")}</TableCell>
                  <TableCell>€{summary.spend.toFixed(2)}</TableCell>
                  <TableCell>€{summary.revenue.toFixed(2)}</TableCell>
                </TableRow>
                {isOpen && row.stepMetrics.map((sm, i) => (
                  <TableRow key={`${row.id}-${i}`} className="bg-muted/20">
                    <TableCell></TableCell>
                    <TableCell className="text-sm pl-8">{sm.node_label || sm.node_type}</TableCell>
                    <TableCell colSpan={2}>
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
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default AnalyticsHistory;
