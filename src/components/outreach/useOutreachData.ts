import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface OutreachLead {
  id: string;
  sub_account_id: string;
  user_id: string;
  name: string;
  company_name: string;
  niche: string;
  offer: string;
  platform: string;
  profile_url: string;
  notes: string;
  setup_type: string;
  main_problem: string;
  main_angle: string;
  lead_source: string;
  link: string;
  email: string;
  outreach_channel: "dm" | "email";
  status: "new" | "drafted" | "ready_to_send" | "sent" | "replied" | "interested" | "closed" | "no_response" | "not_interested";
  last_contact_at: string | null;
  next_followup_at: string | null;
  deleted_at: string | null;
  opener_sent_at: string | null;
  fu1_sent_at: string | null;
  fu2_sent_at: string | null;
  fu3_sent_at: string | null;
  fu4_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachMessage {
  id: string;
  lead_id: string;
  message_type: "opener" | "opener_alt" | "followup_1" | "followup_2" | "followup_3" | "followup_4";
  channel: "dm" | "email";
  content: string;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface OutreachSetupType {
  id: string;
  sub_account_id: string;
  name: string;
  description: string;
  default_action: string;
  default_problem: string;
  default_angle: string;
  sort_order: number;
}

export interface OutreachLeadSource {
  id: string;
  sub_account_id: string;
  name: string;
  sort_order: number;
}

export interface OutreachSettingsData {
  id: string;
  sub_account_id: string;
  opener_template: string;
  follow_up_templates: any[];
  messaging_rules: Record<string, any>;
  ai_prompt_context: string;
}

export const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "Email"] as const;

export const ALL_STATUSES = [
  "new", "drafted", "ready_to_send", "sent", "replied",
  "interested", "closed", "no_response", "not_interested",
] as const;

export function getNextFollowUp(lead: OutreachLead): { next: string | null; isDue: boolean; label: string } {
  if (!lead.opener_sent_at) return { next: "opener", isDue: false, label: "Opener not sent" };
  if (!lead.fu1_sent_at) {
    const due = new Date(lead.opener_sent_at);
    due.setDate(due.getDate() + 1);
    return { next: "fu1", isDue: new Date() >= due, label: "FU1" };
  }
  if (!lead.fu2_sent_at) {
    const due = new Date(lead.fu1_sent_at);
    due.setDate(due.getDate() + 1);
    return { next: "fu2", isDue: new Date() >= due, label: "FU2" };
  }
  if (!lead.fu3_sent_at) {
    const due = new Date(lead.fu2_sent_at);
    due.setDate(due.getDate() + 1);
    return { next: "fu3", isDue: new Date() >= due, label: "FU3" };
  }
  if (!lead.fu4_sent_at) {
    const due = new Date(lead.fu3_sent_at);
    due.setDate(due.getDate() + 1);
    return { next: "fu4", isDue: new Date() >= due, label: "FU4" };
  }
  return { next: null, isDue: false, label: "All sent" };
}

export function useOutreachLeads() {
  const { activeSubAccountId } = useWorkspace();
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    if (!activeSubAccountId) { setLeads([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("outreach_leads")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load leads"); console.error(error); }
    setLeads((data || []) as unknown as OutreachLead[]);
    setLoading(false);
  }, [activeSubAccountId]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  return { leads, loading, refresh: loadLeads };
}

export function useOutreachMessages(leadId: string | null) {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!leadId) { setMessages([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("outreach_messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    setMessages((data || []) as unknown as OutreachMessage[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  return { messages, loading, refresh: loadMessages };
}

export function useOutreachConfig() {
  const { activeSubAccountId } = useWorkspace();
  const [setupTypes, setSetupTypes] = useState<OutreachSetupType[]>([]);
  const [leadSources, setLeadSources] = useState<OutreachLeadSource[]>([]);
  const [settings, setSettings] = useState<OutreachSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeSubAccountId) { setLoading(false); return; }
    setLoading(true);
    const [stRes, lsRes, settRes] = await Promise.all([
      supabase.from("outreach_setup_types").select("*").eq("sub_account_id", activeSubAccountId).order("sort_order"),
      supabase.from("outreach_lead_sources").select("*").eq("sub_account_id", activeSubAccountId).order("sort_order"),
      supabase.from("outreach_settings").select("*").eq("sub_account_id", activeSubAccountId).maybeSingle(),
    ]);
    setSetupTypes((stRes.data || []) as unknown as OutreachSetupType[]);
    setLeadSources((lsRes.data || []) as unknown as OutreachLeadSource[]);
    setSettings(settRes.data as unknown as OutreachSettingsData | null);
    setLoading(false);
  }, [activeSubAccountId]);

  useEffect(() => { load(); }, [load]);

  return { setupTypes, leadSources, settings, loading, refresh: load };
}
