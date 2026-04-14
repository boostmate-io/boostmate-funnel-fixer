import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useOutreachLeads, type OutreachLead, type OutreachMessage, getNextFollowUp } from "./useOutreachData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCheck, Clock, Copy, Loader2, Send, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Props { onRefresh: () => void; }

const MESSAGE_LABELS: Record<string, string> = {
  opener: "Opener",
  opener_alt: "Opener (Alt)",
  followup_1: "FU1",
  followup_2: "FU2",
  followup_3: "FU3",
  followup_4: "FU4",
};

const MSG_TO_FIELD: Record<string, string> = {
  opener: "opener_sent_at",
  followup_1: "fu1_sent_at",
  followup_2: "fu2_sent_at",
  followup_3: "fu3_sent_at",
  followup_4: "fu4_sent_at",
};

const OutreachDraftQueue = ({ onRefresh }: Props) => {
  const { leads, loading } = useOutreachLeads();
  const [messagesMap, setMessagesMap] = useState<Record<string, OutreachMessage[]>>({});
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const draftLeads = leads.filter((l) => ["new", "drafted", "ready_to_send"].includes(l.status));

  useEffect(() => {
    if (draftLeads.length > 0) loadAllMessages();
  }, [leads]);

  const loadAllMessages = async () => {
    if (draftLeads.length === 0) return;
    setLoadingMessages(true);
    const leadIds = draftLeads.map((l) => l.id);
    const { data } = await supabase
      .from("outreach_messages")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: true });

    const map: Record<string, OutreachMessage[]> = {};
    (data || []).forEach((m: any) => {
      if (!map[m.lead_id]) map[m.lead_id] = [];
      map[m.lead_id].push(m as OutreachMessage);
    });
    setMessagesMap(map);
    setLoadingMessages(false);
  };

  const handleGenerate = async (leadId: string) => {
    setGenerating(leadId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach-messages", { body: { lead_id: leadId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Messages generated");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(null);
    }
  };

  const markSent = async (msgId: string, leadId: string, messageType: string) => {
    const now = new Date().toISOString();
    await supabase.from("outreach_messages").update({ sent: true, sent_at: now } as any).eq("id", msgId);

    const fieldName = MSG_TO_FIELD[messageType];
    const leadUpdate: any = { last_contact_at: now, status: "sent" };
    if (fieldName) leadUpdate[fieldName] = now;

    await supabase.from("outreach_leads").update(leadUpdate).eq("id", leadId);
    toast.success("Marked as sent");
    loadAllMessages();
  };

  const approveAll = async (leadId: string) => {
    await supabase.from("outreach_leads").update({ status: "ready_to_send" } as any).eq("id", leadId);
    toast.success("Approved — ready to send");
    onRefresh();
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  if (loading || loadingMessages) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (draftLeads.length === 0) return <div className="text-center py-16 text-muted-foreground">No drafts to review.</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{draftLeads.length} lead(s) with drafts</p>
      {draftLeads.map((lead) => {
        const msgs = messagesMap[lead.id] || [];
        const isExpanded = expandedLead === lead.id;
        const unsentCount = msgs.filter((m) => !m.sent).length;
        const fu = getNextFollowUp(lead);

        return (
          <div key={lead.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{lead.name}</span>
                {lead.company_name && <span className="text-sm text-muted-foreground">{lead.company_name}</span>}
                <Badge variant="outline" className="uppercase text-xs">{lead.outreach_channel}</Badge>
                {unsentCount > 0 && <Badge variant="secondary" className="text-xs">{unsentCount} unsent</Badge>}
                {fu.next && fu.isDue && (
                  <Badge className="text-xs bg-orange-500 hover:bg-orange-600">
                    <Clock className="w-3 h-3 mr-0.5" />{fu.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleGenerate(lead.id); }} disabled={generating === lead.id}>
                  {generating === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); approveAll(lead.id); }}>
                  <CheckCheck className="w-3.5 h-3.5" />
                </Button>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                {msgs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  msgs.map((msg) => (
                    <div key={msg.id} className="flex gap-3 items-start">
                      <div className="w-16 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">{MESSAGE_LABELS[msg.message_type]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {msg.sent ? (
                          <Badge className="bg-green-100 text-green-800 text-xs"><Check className="w-3 h-3" /></Badge>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => copyMessage(msg.content)}><Copy className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => markSent(msg.id, lead.id, msg.message_type)}><Send className="w-3 h-3" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OutreachDraftQueue;
