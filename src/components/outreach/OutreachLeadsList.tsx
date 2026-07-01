import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOutreachLeads, useOutreachConfig, normalizeFollowUps, PLATFORM_OPTIONS, ALL_STATUSES, getNextFollowUp } from "./useOutreachData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Sparkles, Loader2, ExternalLink, Clock, CheckSquare, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [showArchived, setShowArchived] = useState(false);
  const { leads, loading, refresh } = useOutreachLeads({ onlyArchived: showArchived });
  const { setupTypes, leadSources, settings } = useOutreachConfig();
  const configuredFollowUps = normalizeFollowUps((settings as any)?.follow_up_templates);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [updatingBulk, setUpdatingBulk] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    name: "", last_name: "", company_name: "", niche: "", offer: "", platform: "Instagram",
    profile_url: "", profile_url_2: "", notes: "", setup_type: "", lead_source: "",
    link: "", email: "",
    outreach_channel: "dm" as "dm" | "email",
  });

  const checkDuplicate = async () => {
    if (!activeSubAccountId) return null;
    const urls = [form.profile_url.trim(), form.profile_url_2.trim()].filter(Boolean);
    const email = form.email.trim();
    if (urls.length === 0 && !email) return null;

    const orParts: string[] = [];
    urls.forEach((u) => {
      const safe = u.replace(/,/g, "");
      orParts.push(`profile_url.eq.${safe}`);
      orParts.push(`profile_url_2.eq.${safe}`);
    });
    if (email) orParts.push(`email.eq.${email}`);

    const { data } = await supabase
      .from("outreach_leads")
      .select("id,name,archived_at,deleted_at")
      .eq("sub_account_id", activeSubAccountId)
      .or(orParts.join(","))
      .limit(1);
    return (data && data[0]) || null;
  };

  const handleCreate = async (generateMessages: boolean) => {
    if (!activeSubAccountId || !user?.id || !form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.platform) {
      toast.error("Platform is required");
      return;
    }
    setCreating(true);

    // Duplicate check on profile urls and email (includes archived + deleted)
    const dup = await checkDuplicate();
    if (dup) {
      const suffix = dup.archived_at ? " (archived)" : dup.deleted_at ? " (deleted)" : "";
      toast.error(`Lead already exists: ${dup.name}${suffix}`, {
        action: dup.archived_at || dup.deleted_at ? undefined : {
          label: "Open",
          onClick: () => { setShowCreate(false); setSelectedLeadId(dup.id); },
        },
      });
      setCreating(false);
      return;
    }

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
    setForm({ name: "", last_name: "", company_name: "", niche: "", offer: "", platform: "Instagram", profile_url: "", profile_url_2: "", notes: "", setup_type: "", lead_source: "", link: "", email: "", outreach_channel: "dm" });
    setCreating(false);
    refresh(true);
    if (generateMessages && data) {
      setSelectedLeadId((data as any).id);
      handleGenerate((data as any).id);
    }
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
      refresh(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate messages");
    } finally {
      setGenerating(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setUpdatingBulk(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("outreach_leads")
      .update({ status: bulkStatus } as any)
      .in("id", ids);
    if (error) {
      toast.error("Failed to update statuses");
    } else {
      toast.success(`${ids.length} lead(s) updated`);
      setSelectedIds(new Set());
      setBulkStatus("");
      refresh(true);
    }
    setUpdatingBulk(false);
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    setUpdatingBulk(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("outreach_leads")
      .update({ archived_at: new Date().toISOString() } as any)
      .in("id", ids);
    if (error) toast.error("Failed to archive");
    else {
      toast.success(`${ids.length} lead(s) archived`);
      setSelectedIds(new Set());
      refresh(true);
    }
    setUpdatingBulk(false);
  };

  const handleBulkUnarchive = async () => {
    if (selectedIds.size === 0) return;
    setUpdatingBulk(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("outreach_leads")
      .update({ archived_at: null } as any)
      .in("id", ids);
    if (error) toast.error("Failed to unarchive");
    else {
      toast.success(`${ids.length} lead(s) restored`);
      setSelectedIds(new Set());
      refresh(true);
    }
    setUpdatingBulk(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setUpdatingBulk(true);
    const ids = Array.from(selectedIds);
    // Soft-delete (deleted_at) so message history remains intact for analytics.
    const { error } = await supabase
      .from("outreach_leads")
      .update({ deleted_at: new Date().toISOString() } as any)
      .in("id", ids);
    if (error) {
      console.error("Bulk delete error", error);
      toast.error(`Failed to delete: ${error.message}`);
    } else {
      toast.success(`${ids.length} lead(s) deleted`);
      setSelectedIds(new Set());
      refresh(true);
    }
    setUpdatingBulk(false);
    setConfirmDelete(false);
  };


  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const fu = getNextFollowUp(l, configuredFollowUps);
    const matchFollowUp = !followUpFilter || (fu.next && fu.isDue);
    return matchSearch && matchStatus && matchFollowUp;
  });

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
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowArchived(!showArchived); setSelectedIds(new Set()); }}
          >
            <Archive className="w-3.5 h-3.5 mr-1" /> {showArchived ? "Showing archived" : "Show archived"}
          </Button>
        </div>
        {!showArchived && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Lead
          </Button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg flex-wrap">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Change status to..." /></SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkStatusUpdate} disabled={!bulkStatus || updatingBulk}>
            {updatingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckSquare className="w-3.5 h-3.5 mr-1" />}
            Apply status
          </Button>
          {showArchived ? (
            <Button size="sm" variant="outline" onClick={handleBulkUnarchive} disabled={updatingBulk}>
              <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Unarchive
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleBulkArchive} disabled={updatingBulk}>
              <Archive className="w-3.5 h-3.5 mr-1" /> Archive
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} disabled={updatingBulk} className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>{showArchived ? "No archived leads." : "No leads found."}</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
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
                const fu = getNextFollowUp(lead, configuredFollowUps);
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selectedIds.has(lead.id) ? "bg-muted/40" : ""}`}
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{lead.name}{lead.last_name ? ` ${lead.last_name}` : ""}</td>
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

      {/* Lead detail popup */}
      <Dialog open={!!selectedLeadId} onOpenChange={(open) => { if (!open) { setSelectedLeadId(null); refresh(true); } }}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          {selectedLeadId && (
            <OutreachLeadDetail
              leadId={selectedLeadId}
              onBack={() => { setSelectedLeadId(null); refresh(true); }}
              onGenerate={() => handleGenerate(selectedLeadId)}
              generating={generating === selectedLeadId}
              onDeleted={() => { setSelectedLeadId(null); refresh(true); }}
            />
          )}
        </DialogContent>
      </Dialog>


      {/* Confirm bulk delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              These leads will be removed from your workspace. Their message history stays intact so your analytics are not affected. Use Archive instead if you want to keep them recoverable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={updatingBulk} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {updatingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Lead Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John" />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Company</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Inc" />
              </div>
              <div>
                <Label>Niche</Label>
                <Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="Business coaching" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Offer</Label>
                <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="12-week program" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" type="email" />
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link</Label>
                <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Profile URL</Label>
                <Input value={form.profile_url} onChange={(e) => setForm({ ...form, profile_url: e.target.value })} placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label>Profile URL 2</Label>
                <Input value={form.profile_url_2} onChange={(e) => setForm({ ...form, profile_url_2: e.target.value })} placeholder="https://linkedin.com/..." />
              </div>
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
            <div className="flex gap-2 mt-2">
              <Button onClick={() => handleCreate(true)} disabled={creating} className="flex-1">
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Create & Generate Messages
              </Button>
              <Button onClick={() => handleCreate(false)} disabled={creating} variant="outline" className="flex-1">
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Create Only
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutreachLeadsList;
