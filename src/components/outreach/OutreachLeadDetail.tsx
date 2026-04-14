import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOutreachMessages, useOutreachConfig, type OutreachLead, PLATFORM_OPTIONS, ALL_STATUSES, getNextFollowUp } from "./useOutreachData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Check, CheckCheck, Clock, Copy, Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MESSAGE_LABELS: Record<string, string> = {
  opener: "Opener",
  opener_alt: "Opener (Alt)",
  followup_1: "Follow-up 1",
  followup_2: "Follow-up 2",
  followup_3: "Follow-up 3",
  followup_4: "Follow-up 4",
};

const MSG_TO_FIELD: Record<string, string> = {
  opener: "opener_sent_at",
  followup_1: "fu1_sent_at",
  followup_2: "fu2_sent_at",
  followup_3: "fu3_sent_at",
  followup_4: "fu4_sent_at",
};

interface Props {
  leadId: string;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
  onDeleted: () => void;
}

const OutreachLeadDetail = ({ leadId, onBack, onGenerate, generating, onDeleted }: Props) => {
  const [lead, setLead] = useState<OutreachLead | null>(null);
  const [loading, setLoading] = useState(true);
  const { messages, loading: messagesLoading, refresh: refreshMessages } = useOutreachMessages(leadId);
  const { setupTypes, leadSources } = useOutreachConfig();
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadLead(); }, [leadId]);

  useEffect(() => {
    const map: Record<string, string> = {};
    messages.forEach((m) => { map[m.id] = m.content; });
    setEditedMessages(map);
  }, [messages]);

  const loadLead = async () => {
    setLoading(true);
    const { data } = await supabase.from("outreach_leads").select("*").eq("id", leadId).single();
    setLead(data as unknown as OutreachLead | null);
    setLoading(false);
  };

  const updateLead = async (updates: Partial<OutreachLead>) => {
    if (!lead) return;
    await supabase.from("outreach_leads").update(updates as any).eq("id", leadId);
    setLead({ ...lead, ...updates });
    toast.success("Lead updated");
  };

  const updateMessage = async (msgId: string, content: string) => {
    await supabase.from("outreach_messages").update({ content } as any).eq("id", msgId);
    toast.success("Message updated");
  };

  const markSent = async (msgId: string, messageType: string) => {
    const now = new Date().toISOString();
    await supabase.from("outreach_messages").update({ sent: true, sent_at: now } as any).eq("id", msgId);

    // Update the corresponding sent_at field on the lead
    const fieldName = MSG_TO_FIELD[messageType];
    const leadUpdate: any = { last_contact_at: now, status: "sent" };
    if (fieldName) leadUpdate[fieldName] = now;

    await supabase.from("outreach_leads").update(leadUpdate).eq("id", leadId);
    refreshMessages();
    loadLead();
    toast.success("Marked as sent");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const acceptAll = async () => {
    setSaving(true);
    await supabase.from("outreach_leads").update({ status: "ready_to_send" } as any).eq("id", leadId);
    setLead((prev) => prev ? { ...prev, status: "ready_to_send" } : prev);
    setSaving(false);
    toast.success("All messages accepted — ready to send");
  };

  const deleteLead = async () => {
    setDeleting(true);
    const now = new Date().toISOString();
    await supabase.from("outreach_leads").update({ deleted_at: now } as any).eq("id", leadId);
    toast.success("Lead deleted");
    setDeleting(false);
    onDeleted();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!lead) return <div className="text-center py-16 text-muted-foreground">Lead not found</div>;

  const fu = getNextFollowUp(lead);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <h2 className="text-xl font-display font-bold">{lead.name}</h2>
          {lead.company_name && <span className="text-muted-foreground">— {lead.company_name}</span>}
          <Badge variant="outline" className="uppercase text-xs">{lead.outreach_channel}</Badge>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove {lead.name} from your leads. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteLead} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Follow-up indicator */}
      {fu.next && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${fu.isDue ? "bg-orange-50 border border-orange-200 text-orange-800" : "bg-muted/50 text-muted-foreground"}`}>
          <Clock className="w-4 h-4" />
          {fu.isDue ? `Follow-up due: ${fu.label}` : `Next follow-up: ${fu.label}`}
          <div className="flex gap-1 ml-auto">
            {lead.opener_sent_at && <Badge variant="secondary" className="text-xs">Opener ✓</Badge>}
            {lead.fu1_sent_at && <Badge variant="secondary" className="text-xs">FU1 ✓</Badge>}
            {lead.fu2_sent_at && <Badge variant="secondary" className="text-xs">FU2 ✓</Badge>}
            {lead.fu3_sent_at && <Badge variant="secondary" className="text-xs">FU3 ✓</Badge>}
            {lead.fu4_sent_at && <Badge variant="secondary" className="text-xs">FU4 ✓</Badge>}
          </div>
        </div>
      )}

      {/* Lead info */}
      <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">First Name</Label>
          <Input value={lead.name} onChange={(e) => updateLead({ name: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Last Name</Label>
          <Input value={lead.last_name} onChange={(e) => updateLead({ last_name: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={lead.status} onValueChange={(v) => updateLead({ status: v as any })}>
            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Setup Type</Label>
          <Select value={lead.setup_type || ""} onValueChange={(v) => updateLead({ setup_type: v })}>
            <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {setupTypes.map((st) => <SelectItem key={st.id} value={st.name}>{st.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Main Problem</Label>
          <Input value={lead.main_problem} onChange={(e) => updateLead({ main_problem: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Main Angle</Label>
          <Input value={lead.main_angle} onChange={(e) => updateLead({ main_angle: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Niche</Label>
          <Input value={lead.niche} onChange={(e) => updateLead({ niche: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Platform</Label>
          <Select value={lead.platform || ""} onValueChange={(v) => updateLead({ platform: v })}>
            <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Lead Source</Label>
          <Select value={lead.lead_source || ""} onValueChange={(v) => updateLead({ lead_source: v })}>
            <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {leadSources.map((ls) => <SelectItem key={ls.id} value={ls.name}>{ls.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Offer</Label>
          <Input value={lead.offer} onChange={(e) => updateLead({ offer: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Profile URL</Label>
          <Input value={lead.profile_url} onChange={(e) => updateLead({ profile_url: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Profile URL 2</Label>
          <Input value={lead.profile_url_2} onChange={(e) => updateLead({ profile_url_2: e.target.value })} className="h-8 mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Link</Label>
          <Input value={lead.link} onChange={(e) => updateLead({ link: e.target.value })} className="h-8 mt-1" placeholder="https://..." />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input value={lead.email} onChange={(e) => updateLead({ email: e.target.value })} className="h-8 mt-1" placeholder="john@example.com" type="email" />
        </div>
        <div className="col-span-2 md:col-span-3">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea value={lead.notes} onChange={(e) => updateLead({ notes: e.target.value })} className="mt-1" rows={2} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button onClick={onGenerate} disabled={generating} variant="outline">
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Regenerate All
        </Button>
        <Button onClick={acceptAll} disabled={saving}>
          <CheckCheck className="w-4 h-4 mr-1" /> Accept All
        </Button>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-foreground">Messages</h3>
        {messagesLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages generated yet. Click "Regenerate All" to generate.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{MESSAGE_LABELS[msg.message_type] || msg.message_type}</span>
                  {msg.sent && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <Check className="w-3 h-3 mr-0.5" /> Sent {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(editedMessages[msg.id] || msg.content)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  {!msg.sent && (
                    <Button size="sm" variant="ghost" onClick={() => markSent(msg.id, msg.message_type)}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={editedMessages[msg.id] ?? msg.content}
                onChange={(e) => setEditedMessages({ ...editedMessages, [msg.id]: e.target.value })}
                onBlur={() => {
                  if (editedMessages[msg.id] !== msg.content) {
                    updateMessage(msg.id, editedMessages[msg.id]);
                  }
                }}
                rows={4}
                className="text-sm"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OutreachLeadDetail;
