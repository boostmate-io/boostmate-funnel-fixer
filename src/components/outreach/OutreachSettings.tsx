import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useOutreachConfig } from "./useOutreachData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const OutreachSettings = () => {
  const { activeSubAccountId } = useWorkspace();
  const { setupTypes, leadSources, settings, loading, refresh } = useOutreachConfig();

  // Local state for editable fields
  const [openerTemplate, setOpenerTemplate] = useState("");
  const [followUps, setFollowUps] = useState<string[]>(["", "", "", ""]);
  const [tone, setTone] = useState("conversational, non-salesy, natural");
  const [maxLines, setMaxLines] = useState("4-5");
  const [aiContext, setAiContext] = useState("");
  const [saving, setSaving] = useState(false);

  // New items
  const [newSetupType, setNewSetupType] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("");

  useEffect(() => {
    if (settings) {
      setOpenerTemplate(settings.opener_template || "");
      const futs = (settings.follow_up_templates as any[]) || [];
      setFollowUps([
        futs[0]?.content || futs[0] || "",
        futs[1]?.content || futs[1] || "",
        futs[2]?.content || futs[2] || "",
        futs[3]?.content || futs[3] || "",
      ]);
      const rules = settings.messaging_rules || {};
      setTone((rules as any).tone || "conversational, non-salesy, natural");
      setMaxLines((rules as any).max_lines || "4-5");
      setAiContext(settings.ai_prompt_context || "");
    }
  }, [settings]);

  const saveSettings = async () => {
    if (!activeSubAccountId) return;
    setSaving(true);

    const payload = {
      sub_account_id: activeSubAccountId,
      opener_template: openerTemplate,
      follow_up_templates: followUps.map((content, i) => ({ index: i + 1, content })),
      messaging_rules: { tone, max_lines: maxLines },
      ai_prompt_context: aiContext,
    };

    if (settings?.id) {
      await supabase.from("outreach_settings").update(payload as any).eq("id", settings.id);
    } else {
      await supabase.from("outreach_settings").insert(payload as any);
    }

    toast.success("Settings saved");
    setSaving(false);
    refresh();
  };

  const addSetupType = async () => {
    if (!activeSubAccountId || !newSetupType.trim()) return;
    await supabase.from("outreach_setup_types").insert({
      sub_account_id: activeSubAccountId,
      name: newSetupType.trim(),
      sort_order: setupTypes.length,
    } as any);
    setNewSetupType("");
    refresh();
    toast.success("Setup type added");
  };

  const deleteSetupType = async (id: string) => {
    await supabase.from("outreach_setup_types").delete().eq("id", id);
    refresh();
    toast.success("Deleted");
  };

  const addLeadSource = async () => {
    if (!activeSubAccountId || !newLeadSource.trim()) return;
    await supabase.from("outreach_lead_sources").insert({
      sub_account_id: activeSubAccountId,
      name: newLeadSource.trim(),
      sort_order: leadSources.length,
    } as any);
    setNewLeadSource("");
    refresh();
    toast.success("Lead source added");
  };

  const deleteLeadSource = async (id: string) => {
    await supabase.from("outreach_lead_sources").delete().eq("id", id);
    refresh();
    toast.success("Deleted");
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Setup Types */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Setup Types</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {setupTypes.map((st) => (
            <div key={st.id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
              <span className="text-sm">{st.name}</span>
              <Button size="sm" variant="ghost" onClick={() => deleteSetupType(st.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newSetupType} onChange={(e) => setNewSetupType(e.target.value)} placeholder="New setup type..." className="h-8" onKeyDown={(e) => e.key === "Enter" && addSetupType()} />
            <Button size="sm" onClick={addSetupType}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Lead Sources */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Lead Sources</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {leadSources.map((ls) => (
            <div key={ls.id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
              <span className="text-sm">{ls.name}</span>
              <Button size="sm" variant="ghost" onClick={() => deleteLeadSource(ls.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newLeadSource} onChange={(e) => setNewLeadSource(e.target.value)} placeholder="New lead source..." className="h-8" onKeyDown={(e) => e.key === "Enter" && addLeadSource()} />
            <Button size="sm" onClick={addLeadSource}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Messaging Templates */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Opener Template</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">Custom opener format. Leave empty to use the default. Use [name] as a placeholder.</p>
          <Textarea value={openerTemplate} onChange={(e) => setOpenerTemplate(e.target.value)} rows={5} placeholder="Hey [name], quick question — are you mainly..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Follow-up Templates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {followUps.map((fu, i) => (
            <div key={i}>
              <Label className="text-xs">Follow-up {i + 1}</Label>
              <Textarea
                value={fu}
                onChange={(e) => { const next = [...followUps]; next[i] = e.target.value; setFollowUps(next); }}
                rows={3}
                placeholder={`Follow-up ${i + 1} template...`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Messaging Rules */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Messaging Rules</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Tone</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="conversational, non-salesy, natural" />
          </div>
          <div>
            <Label className="text-xs">Max lines per message</Label>
            <Input value={maxLines} onChange={(e) => setMaxLines(e.target.value)} placeholder="4-5" />
          </div>
          <div>
            <Label className="text-xs">AI prompt context (additional instructions)</Label>
            <Textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} rows={3} placeholder="e.g. Always mention that we specialize in coaching funnels..." />
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
        Save Settings
      </Button>
    </div>
  );
};

export default OutreachSettings;
