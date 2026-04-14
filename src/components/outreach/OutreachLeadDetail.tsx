import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOutreachMessages, type OutreachLead, type OutreachMessage } from "./useOutreachData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, CheckCheck, Copy, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

const MESSAGE_LABELS: Record<string, string> = {
  opener: "Opener",
  opener_alt: "Opener (Alt)",
  followup_1: "Follow-up 1",
  followup_2: "Follow-up 2",
  followup_3: "Follow-up 3",
  followup_4: "Follow-up 4",
};

const STATUSES = ["new", "drafted", "ready_to_send", "sent", "replied", "interested", "closed", "no_response"];

interface Props {
  leadId: string;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
}

const OutreachLeadDetail = ({ leadId, onBack, onGenerate, generating }: Props) => {
  const [lead, setLead] = useState<OutreachLead | null>(null);
  const [loading, setLoading] = useState(true);
  const { messages, loading: messagesLoading, refresh: refreshMessages } = useOutreachMessages(leadId);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLead();
  }, [leadId]);

  useEffect(() => {
    // Sync edited messages when messages load
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

  const markSent = async (msgId: string) => {
    const now = new Date().toISOString();
    await supabase.from("outreach_messages").update({ sent: true, sent_at: now } as any).eq("id", msgId);
    await supabase.from("outreach_leads").update({ last_contact_at: now, status: "sent" } as any).eq("id", leadId);
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

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!lead) return <div className="text-center py-16 text-muted-foreground">Lead not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <h2 className="text-xl font-display font-bold">{lead.name}</h2>
        {lead.company_name && <span className="text-muted-foreground">— {lead.company_name}</span>}
        <Badge variant="outline" className="uppercase text-xs">{lead.outreach_channel}</Badge>
      </div>

      {/* Lead info */}
      <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={lead.status} onValueChange={(v) => updateLead({ status: v as any })}>
            <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Setup Type</Label>
          <Input value={lead.setup_type} onChange={(e) => updateLead({ setup_type: e.target.value })} className="h-8 mt-1" />
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
          <Input value={lead.platform} onChange={(e) => updateLead({ platform: e.target.value })} className="h-8 mt-1" />
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
                    <Button size="sm" variant="ghost" onClick={() => markSent(msg.id)}>
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
