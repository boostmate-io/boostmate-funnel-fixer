// Admin review of Free Client Acquisition Video Audit requests (admin-only RLS).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ExternalLink } from "lucide-react";
import { DIMENSION_LABELS, VALUE_DIMENSIONS } from "@shared/offerIntelligence/valueEquation";
import { toast } from "sonner";

const STATUSES = [
  { v: "new", l: "New" }, { v: "in_review", l: "In review" }, { v: "audit_sent", l: "Audit sent" }, { v: "closed", l: "Closed" },
];
const CHANNELS: Record<string, string> = {
  instagram_organic: "Instagram / organic content", paid_ads: "Paid advertising", referrals: "Referrals / networking",
  combination: "A combination of channels", no_system: "No consistent system yet", other: "Other",
};

type Row = {
  id: string; email: string; instagram: string; acquisition_channel: string; website: string | null; marketing_consent: boolean;
  status: string; admin_notes: string | null; offer_snapshot: any; created_at: string; generation_id: string | null;
};

export default function AdminVideoAudits() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data, error } = await supabase.from("video_audit_requests").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error("Couldn't load audit requests.");
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("video_audit_requests").update(patch).eq("id", id);
    if (error) return toast.error("Couldn't save.");
    setRows((r) => r?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? null);
    toast.success("Saved");
  };

  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (filter === "all" || r.status === filter) &&
    (!q || `${r.email} ${r.instagram} ${r.website ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, filter]);

  if (!rows) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search email, Instagram or website" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">{shown.length} request(s)</span>
      </div>
      {shown.length === 0 && <p className="text-sm text-muted-foreground">No audit requests yet.</p>}
      <div className="space-y-2">
        {shown.map((r) => {
          const s = r.offer_snapshot;
          return (
            <div key={r.id} className="rounded-lg border border-border bg-card">
              <button className="w-full flex flex-wrap items-center gap-3 p-4 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <span className="font-medium text-foreground">@{r.instagram}</span>
                <span className="text-sm text-muted-foreground">{r.email}</span>
                <Badge variant={r.status === "new" ? "default" : "secondary"}>{STATUSES.find((x) => x.v === r.status)?.l}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </button>
              {open === r.id && (
                <div className="border-t border-border p-4 space-y-4 text-sm">
                  <div className="grid md:grid-cols-2 gap-3">
                    <p><span className="text-muted-foreground">Instagram: </span><a className="text-primary inline-flex items-center gap-1" href={`https://instagram.com/${r.instagram}`} target="_blank" rel="noreferrer">@{r.instagram}<ExternalLink className="w-3 h-3" /></a></p>
                    <p><span className="text-muted-foreground">Email: </span>{r.email}</p>
                    <p><span className="text-muted-foreground">Attracting clients via: </span>{CHANNELS[r.acquisition_channel] ?? r.acquisition_channel}</p>
                    <p><span className="text-muted-foreground">Website: </span>{r.website ? <a className="text-primary" href={r.website} target="_blank" rel="noreferrer">{r.website}</a> : "—"}</p>
                    <p><span className="text-muted-foreground">Marketing follow-up consent: </span>{r.marketing_consent ? "Yes" : "No"}</p>
                  </div>
                  {s?.offer ? (
                    <div className="rounded-md bg-muted/40 p-3 space-y-2">
                      <p className="font-medium text-foreground">{s.offer.name}</p>
                      <p className="text-foreground">{s.offer.promise}</p>
                      {s.answers && <p className="text-muted-foreground">Audience: {s.answers.audience} · Challenge: {s.answers.obstacle}{s.answers.currentPrice ? ` · Price: ${s.answers.currentPrice} ${s.answers.currency ?? ""}` : ""}</p>}
                      <p className="text-muted-foreground">Scores (before → after): {VALUE_DIMENSIONS.map((d) => `${DIMENSION_LABELS[d]} ${s.beforeScores?.[d] ?? "–"} → ${s.afterScores?.[d] ?? "–"}`).join(" · ")}</p>
                      {s.decisions?.length > 0 && <ul className="list-disc pl-5 text-muted-foreground">{s.decisions.map((d: any, i: number) => <li key={i}>{d.area}: {d.choice}{d.custom ? ` (${d.custom})` : ""}</li>)}</ul>}
                    </div>
                  ) : <p className="text-muted-foreground">No completed offer linked to this request.</p>}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Select value={r.status} onValueChange={(v) => update(r.id, { status: v })}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[240px] space-y-1">
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <Textarea rows={2} value={notes[r.id] ?? r.admin_notes ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => update(r.id, { admin_notes: notes[r.id] ?? r.admin_notes })}>Save notes</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
