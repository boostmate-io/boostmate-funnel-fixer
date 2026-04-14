import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOutreachLeads, useOutreachConfig, PLATFORM_OPTIONS, ALL_STATUSES, getNextFollowUp } from "./useOutreachData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Sparkles, Loader2, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import OutreachLeadDetail from "./OutreachLeadDetail";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  drafted: "bg-yellow-100 text-yellow-800",
  ready_to_send: "bg-green-100 text-green-800",
  sent: "bg-purple-100 text-purple-800",
  replied: "bg-emerald-100 text-emerald-800",
  interested: "bg-orange-100 text-orange-800",
  closed: "bg-gray-100 text-gray-800",
  no_response: "bg-red-100 text-red-800",
  not_interested: "bg-gray-200 text-gray-600",
};

interface Props { onRefresh: () => void; }

const OutreachLeadsList = ({ onRefresh }: Props) => {
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const { leads, loading, refresh } = useOutreachLeads();
  const { setupTypes, leadSources } = useOutreachConfig();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", company_name: "", niche: "", offer: "", platform: "Instagram",
    profile_url: "", notes: "", setup_type: "", lead_source: "",
    link: "", email: "",
    outreach_channel: "dm" as "dm" | "email",
  });

  const handleCreate = async () => {
    if (!activeSubAccountId || !user?.id || !form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.platform) {
      toast.error("Platform is required");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("outreach_leads")
      .insert({
        ...form,
        sub_account_id: activeSubAccountId,
        user_id: user.id,
      } as any)
      .select()
      .single();
    if (error) { toast.error("Failed to create lead"); setCreating(false); return; }
    toast.success("Lead created");
    setShowCreate(false);
    setForm({ name: "", company_name: "", niche: "", offer: "", platform: "Instagram", profile_url: "", notes: "", setup_type: "", lead_source: "", link: "", email: "", outreach_channel: "dm" });
    setCreating(false);
    refresh();
    if (data) handleGenerate((data as any).id);
  };

  const handleGenerate = async (leadId: string) => {
    setGenerating(leadId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach-messages", {
        body: { lead_id: leadId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Messages generated");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate messages");
    } finally {
      setGenerating(null);
    }
  };

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const fu = getNextFollowUp(l);
    const matchFollowUp = !followUpFilter || (fu.next && fu.isDue);
    return matchSearch && matchStatus && matchFollowUp;
  });

  if (selectedLeadId) {
    return (
      <OutreachLeadDetail
        leadId={selectedLeadId}
        onBack={() => { setSelectedLeadId(null); refresh(); }}
        onGenerate={() => handleGenerate(selectedLeadId)}
        generating={generating === selectedLeadId}
        onDeleted={() => { setSelectedLeadId(null); refresh(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={followUpFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setFollowUpFilter(!followUpFilter)}
          >
            <Clock className="w-3.5 h-3.5 mr-1" /> Follow-up due
          </Button>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Lead
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No leads found.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Channel</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Follow-up</th>
                <th className="text-left px-4 py-3 font-medium">Setup Type</th>
                <th className="text-left px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const fu = getNextFollowUp(lead);
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.company_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs uppercase">{lead.outreach_channel}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || ""}`}>
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {fu.next ? (
                        <Badge variant={fu.isDue ? "default" : "secondary"} className={`text-xs ${fu.isDue ? "bg-orange-500 hover:bg-orange-600" : ""}`}>
                          {fu.isDue && <Clock className="w-3 h-3 mr-0.5" />}
                          {fu.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{fu.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.setup_type || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.lead_source || "—"}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {lead.profile_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={lead.profile_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGenerate(lead.id)}
                          disabled={generating === lead.id}
                        >
                          {generating === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Lead Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Inc" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Niche</Label>
                <Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="Business coaching" />
              </div>
              <div>
                <Label>Offer</Label>
                <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="12-week program" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Platform *</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.outreach_channel} onValueChange={(v) => setForm({ ...form, outreach_channel: v as "dm" | "email" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dm">DM</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Profile URL</Label>
              <Input value={form.profile_url} onChange={(e) => setForm({ ...form, profile_url: e.target.value })} placeholder="https://instagram.com/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Setup Type</Label>
                <Select value={form.setup_type} onValueChange={(v) => setForm({ ...form, setup_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Auto-detect by AI" /></SelectTrigger>
                  <SelectContent>
                    {setupTypes.map((st) => <SelectItem key={st.id} value={st.name}>{st.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lead Source</Label>
                <Select value={form.lead_source} onValueChange={(v) => setForm({ ...form, lead_source: v })}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {leadSources.map((ls) => <SelectItem key={ls.id} value={ls.name}>{ls.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes about this lead..." rows={3} />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="mt-2">
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Create & Generate Messages
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutreachLeadsList;
