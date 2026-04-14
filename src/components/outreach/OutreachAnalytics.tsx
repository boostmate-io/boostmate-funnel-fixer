import { useMemo } from "react";
import { useOutreachLeads } from "./useOutreachData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Props { key?: number; }

const OutreachAnalytics = (_props: Props) => {
  const { leads, loading } = useOutreachLeads();

  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus: Record<string, number> = {};
    const bySetupType: Record<string, { total: number; interested: number; closed: number }> = {};
    const bySource: Record<string, { total: number; interested: number; closed: number }> = {};
    const byChannel: Record<string, { total: number; sent: number; replied: number; interested: number; closed: number }> = {};

    leads.forEach((l) => {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;

      const st = l.setup_type || "Unknown";
      if (!bySetupType[st]) bySetupType[st] = { total: 0, interested: 0, closed: 0 };
      bySetupType[st].total++;
      if (l.status === "interested") bySetupType[st].interested++;
      if (l.status === "closed") bySetupType[st].closed++;

      const src = l.lead_source || "Unknown";
      if (!bySource[src]) bySource[src] = { total: 0, interested: 0, closed: 0 };
      bySource[src].total++;
      if (l.status === "interested") bySource[src].interested++;
      if (l.status === "closed") bySource[src].closed++;

      const ch = l.outreach_channel;
      if (!byChannel[ch]) byChannel[ch] = { total: 0, sent: 0, replied: 0, interested: 0, closed: 0 };
      byChannel[ch].total++;
      if (["sent", "replied", "interested", "closed"].includes(l.status)) byChannel[ch].sent++;
      if (["replied", "interested", "closed"].includes(l.status)) byChannel[ch].replied++;
      if (l.status === "interested") byChannel[ch].interested++;
      if (l.status === "closed") byChannel[ch].closed++;
    });

    return { total, byStatus, bySetupType, bySource, byChannel };
  }, [leads]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const statusCards = [
    { label: "New Leads", key: "new", color: "text-blue-600" },
    { label: "Sent", key: "sent", color: "text-purple-600" },
    { label: "Replied", key: "replied", color: "text-emerald-600" },
    { label: "Interested", key: "interested", color: "text-orange-600" },
    { label: "Closed", key: "closed", color: "text-gray-600" },
    { label: "No Response", key: "no_response", color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statusCards.map((sc) => (
          <Card key={sc.key}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${sc.color}`}>{stats.byStatus[sc.key] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{sc.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* By Setup Type */}
        <Card>
          <CardHeader><CardTitle className="text-sm">By Setup Type</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(stats.bySetupType).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.bySetupType).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="truncate">{type}</span>
                    <span className="text-muted-foreground">{data.total} ({data.interested} int / {data.closed} cls)</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Source */}
        <Card>
          <CardHeader><CardTitle className="text-sm">By Lead Source</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(stats.bySource).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.bySource).map(([source, data]) => (
                  <div key={source} className="flex items-center justify-between text-sm">
                    <span className="truncate">{source}</span>
                    <span className="text-muted-foreground">{data.total} ({data.interested} int / {data.closed} cls)</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Channel */}
        <Card>
          <CardHeader><CardTitle className="text-sm">By Channel</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(stats.byChannel).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.byChannel).map(([ch, data]) => (
                  <div key={ch} className="flex items-center justify-between text-sm">
                    <span className="uppercase font-medium">{ch}</span>
                    <span className="text-muted-foreground">{data.total} leads / {data.replied} replies</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OutreachAnalytics;
