import { useMemo, useState } from "react";
import { useOutreachLeads } from "./useOutreachData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props { key?: number; }

const OutreachAnalytics = (_props: Props) => {
  const { leads, loading } = useOutreachLeads();
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const periodOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      opts.push({ value: val, label });
    }
    return opts;
  }, []);

  const stats = useMemo(() => {
    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const periodLeads = leads.filter((l) => {
      const d = new Date(l.created_at);
      return d >= startDate && d <= endDate;
    });

    const total = periodLeads.length;
    // Cumulative status counts: a lead that reached "replied" also counts as "sent" and "new"
    const cumulativeStatus: Record<string, number> = { new: 0, drafted: 0, ready_to_send: 0, sent: 0, replied: 0, interested: 0, closed: 0, no_response: 0, not_interested: 0 };
    const SENT_STATUSES = ["sent", "replied", "interested", "closed", "no_response", "not_interested"];
    const REPLIED_STATUSES = ["replied", "interested", "closed"];
    const INTERESTED_STATUSES = ["interested", "closed"];

    const bySetupType: Record<string, { total: number; interested: number; closed: number }> = {};
    const bySource: Record<string, { total: number; interested: number; closed: number }> = {};
    const byChannel: Record<string, { total: number; sent: number; replied: number; interested: number; closed: number }> = {};

    // Daily breakdown
    const dailyMap: Record<string, { new: number; sent: number; replied: number; interested: number; closed: number; no_response: number }> = {};

    periodLeads.forEach((l) => {
      // Every lead is always "new"
      cumulativeStatus.new++;
      if (SENT_STATUSES.includes(l.status)) cumulativeStatus.sent++;
      if (REPLIED_STATUSES.includes(l.status)) cumulativeStatus.replied++;
      if (INTERESTED_STATUSES.includes(l.status)) cumulativeStatus.interested++;
      if (l.status === "closed") cumulativeStatus.closed++;
      if (l.status === "no_response") cumulativeStatus.no_response++;
      if (l.status === "not_interested") cumulativeStatus.not_interested++;

      const dayKey = new Date(l.created_at).toISOString().split("T")[0];
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { new: 0, sent: 0, replied: 0, interested: 0, closed: 0, no_response: 0 };
      dailyMap[dayKey].new++;
      if (["sent", "replied", "interested", "closed", "no_response", "not_interested"].includes(l.status)) dailyMap[dayKey].sent++;
      if (["replied", "interested", "closed"].includes(l.status)) dailyMap[dayKey].replied++;
      if (["interested", "closed"].includes(l.status)) dailyMap[dayKey].interested++;
      if (l.status === "closed") dailyMap[dayKey].closed++;
      if (l.status === "no_response") dailyMap[dayKey].no_response++;

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
      if (["sent", "replied", "interested", "closed", "no_response", "not_interested"].includes(l.status)) byChannel[ch].sent++;
      if (["replied", "interested", "closed"].includes(l.status)) byChannel[ch].replied++;
      if (["interested", "closed"].includes(l.status)) byChannel[ch].interested++;
      if (l.status === "closed") byChannel[ch].closed++;
    });

    // Conversion rates (use cumulative counts)
    const totalSent = cumulativeStatus.sent;
    const totalReplied = cumulativeStatus.replied;
    const totalInterested = cumulativeStatus.interested;
    const totalClosed = cumulativeStatus.closed;

    const sentToReply = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0";
    const replyToInterested = totalReplied > 0 ? ((totalInterested / totalReplied) * 100).toFixed(1) : "0";
    const interestedToClosed = totalInterested > 0 ? ((totalClosed / totalInterested) * 100).toFixed(1) : "0";

    const daily = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));

    return { total, cumulativeStatus, bySetupType, bySource, byChannel, sentToReply, replyToInterested, interestedToClosed, daily };
  }, [leads, period]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const statusCards = [
    { label: "New Leads", key: "new", color: "text-blue-600" },
    { label: "Sent", key: "sent", color: "text-purple-600" },
    { label: "Replied", key: "replied", color: "text-emerald-600" },
    { label: "Interested", key: "interested", color: "text-orange-600" },
    { label: "Closed", key: "closed", color: "text-gray-600" },
    { label: "No Response", key: "no_response", color: "text-red-600" },
    { label: "Not Interested", key: "not_interested", color: "text-gray-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{stats.total} leads</span>
      </div>

      {/* Conversion rates */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.sentToReply}%</p>
            <p className="text-xs text-muted-foreground mt-1">Sent → Reply</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.replyToInterested}%</p>
            <p className="text-xs text-muted-foreground mt-1">Reply → Interested</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.interestedToClosed}%</p>
            <p className="text-xs text-muted-foreground mt-1">Interested → Closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statusCards.map((sc) => (
          <Card key={sc.key}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${sc.color}`}>{stats.cumulativeStatus[sc.key] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{sc.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily breakdown */}
      {stats.daily.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Daily Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-center py-2 px-2 font-medium">New</th>
                    <th className="text-center py-2 px-2 font-medium">Sent</th>
                    <th className="text-center py-2 px-2 font-medium">Replied</th>
                    <th className="text-center py-2 px-2 font-medium">Interested</th>
                    <th className="text-center py-2 px-2 font-medium">Closed</th>
                    <th className="text-center py-2 px-2 font-medium">No Response</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.daily.map(([day, d]) => (
                    <tr key={day} className="border-b border-border last:border-0">
                      <td className="py-1.5 px-2 font-medium">{new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="text-center py-1.5 px-2">{d.new}</td>
                      <td className="text-center py-1.5 px-2">{d.sent}</td>
                      <td className="text-center py-1.5 px-2">{d.replied}</td>
                      <td className="text-center py-1.5 px-2">{d.interested}</td>
                      <td className="text-center py-1.5 px-2">{d.closed}</td>
                      <td className="text-center py-1.5 px-2">{d.no_response}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
