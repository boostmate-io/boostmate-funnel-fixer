import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Workflow, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OFFER_TIERS = ["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"] as const;
const STAGES = ["validate", "attract", "optimize", "scale", "systemize"] as const;

interface System {
  id: string;
  key: string;
  label: string;
  description: string | null;
  primary_objective: string | null;
  suitable_offer_tiers: string[] | null;
  recommended_stages: string[] | null;
  architecture: any;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Channel {
  id: string;
  key: string;
  label: string;
}

interface CompatRow {
  growth_system_id: string;
  acquisition_channel_id: string;
}

interface GuideRow { id: string; name: string; }
interface SystemGuideRow { growth_system_id: string; build_guide_id: string; }

const AdminGrowthSystemsCatalog = () => {
  const [rows, setRows] = useState<System[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [compat, setCompat] = useState<CompatRow[]>([]);
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [systemGuides, setSystemGuides] = useState<SystemGuideRow[]>([]);
  const [editing, setEditing] = useState<Partial<System> | null>(null);
  const [archText, setArchText] = useState("");
  const [archError, setArchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [sys, ch, cp, gd, sg] = await Promise.all([
      supabase.from("growth_systems_catalog").select("*").order("sort_order", { ascending: true }),
      supabase.from("acquisition_channels").select("id,key,label").eq("is_active", true).order("sort_order"),
      supabase.from("growth_system_channel_compat").select("growth_system_id,acquisition_channel_id"),
      supabase.from("build_guides").select("id,name").eq("is_active", true).order("sort_order"),
      supabase.from("growth_system_build_guides").select("growth_system_id,build_guide_id"),
    ]);
    if (sys.data) setRows(sys.data as any);
    if (ch.data) setChannels(ch.data as any);
    if (cp.data) setCompat(cp.data as any);
    if (gd.data) setGuides(gd.data as any);
    if (sg.data) setSystemGuides(sg.data as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  const compatBySystem = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of compat) {
      if (!map.has(row.growth_system_id)) map.set(row.growth_system_id, new Set());
      map.get(row.growth_system_id)!.add(row.acquisition_channel_id);
    }
    return map;
  }, [compat]);

  const guidesBySystem = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of systemGuides) {
      if (!map.has(row.growth_system_id)) map.set(row.growth_system_id, new Set());
      map.get(row.growth_system_id)!.add(row.build_guide_id);
    }
    return map;
  }, [systemGuides]);


  const openEdit = (r?: System) => {
    setEditing(r ?? { is_active: true, sort_order: rows.length * 10, suitable_offer_tiers: [], recommended_stages: [], architecture: {} });
    setArchText(JSON.stringify(r?.architecture ?? {}, null, 2));
    setArchError(null);
  };

  const toggleArr = (arr: string[] | null | undefined, val: string) => {
    const s = new Set(arr ?? []);
    if (s.has(val)) s.delete(val); else s.add(val);
    return Array.from(s);
  };

  const save = async () => {
    if (!editing?.key || !editing?.label) { toast.error("Key and label required"); return; }
    let architecture: any = {};
    try {
      architecture = archText.trim() ? JSON.parse(archText) : {};
      setArchError(null);
    } catch (e: any) {
      setArchError(e.message);
      toast.error("Invalid JSON in architecture");
      return;
    }
    setLoading(true);
    const payload: any = {
      key: editing.key,
      label: editing.label,
      description: editing.description ?? null,
      primary_objective: editing.primary_objective ?? null,
      suitable_offer_tiers: editing.suitable_offer_tiers ?? [],
      recommended_stages: editing.recommended_stages ?? [],
      architecture,
      icon: editing.icon ?? null,
      sort_order: editing.sort_order ?? 100,
      is_active: editing.is_active ?? true,
    };

    let systemId = editing.id;
    if (systemId) {
      const { error } = await supabase.from("growth_systems_catalog").update(payload).eq("id", systemId);
      if (error) { toast.error(error.message); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from("growth_systems_catalog").insert(payload).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "Insert failed"); setLoading(false); return; }
      systemId = data.id;
    }

    // Sync compat.
    const desired = new Set<string>((editing as any).__compat ?? Array.from(compatBySystem.get(systemId!) ?? []));
    const current = compatBySystem.get(systemId!) ?? new Set<string>();
    const toAdd = Array.from(desired).filter((id) => !current.has(id));
    const toRemove = Array.from(current).filter((id) => !desired.has(id));
    if (toAdd.length) {
      const { error } = await supabase.from("growth_system_channel_compat").insert(
        toAdd.map((cid) => ({ growth_system_id: systemId!, acquisition_channel_id: cid })),
      );
      if (error) toast.error(`Compat add: ${error.message}`);
    }
    for (const cid of toRemove) {
      await supabase.from("growth_system_channel_compat")
        .delete().eq("growth_system_id", systemId!).eq("acquisition_channel_id", cid);
    }

    // Sync build guides.
    const desiredG = new Set<string>((editing as any).__guides ?? Array.from(guidesBySystem.get(systemId!) ?? []));
    const currentG = guidesBySystem.get(systemId!) ?? new Set<string>();
    const gAdd = Array.from(desiredG).filter((id) => !currentG.has(id));
    const gRemove = Array.from(currentG).filter((id) => !desiredG.has(id));
    if (gAdd.length) {
      const { error } = await supabase.from("growth_system_build_guides").insert(
        gAdd.map((gid) => ({ growth_system_id: systemId!, build_guide_id: gid })),
      );
      if (error) toast.error(`Guides add: ${error.message}`);
    }
    for (const gid of gRemove) {
      await supabase.from("growth_system_build_guides")
        .delete().eq("growth_system_id", systemId!).eq("build_guide_id", gid);
    }

    setLoading(false);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this system?")) return;
    const { error } = await supabase.from("growth_systems_catalog").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const editingCompat: Set<string> = useMemo(() => {
    if (!editing) return new Set();
    if ((editing as any).__compat) return new Set<string>((editing as any).__compat);
    return new Set(editing.id ? compatBySystem.get(editing.id) ?? [] : []);
  }, [editing, compatBySystem]);

  const editingGuides: Set<string> = useMemo(() => {
    if (!editing) return new Set();
    if ((editing as any).__guides) return new Set<string>((editing as any).__guides);
    return new Set(editing.id ? guidesBySystem.get(editing.id) ?? [] : []);
  }, [editing, guidesBySystem]);

  const toggleCompat = (cid: string) => {
    if (!editing) return;
    const next = new Set(editingCompat);
    if (next.has(cid)) next.delete(cid); else next.add(cid);
    setEditing({ ...editing, __compat: Array.from(next) } as any);
  };

  const toggleGuide = (gid: string) => {
    if (!editing) return;
    const next = new Set(editingGuides);
    if (next.has(gid)) next.delete(gid); else next.add(gid);
    setEditing({ ...editing, __guides: Array.from(next) } as any);
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold flex items-center gap-2">
          <Workflow className="w-4 h-4" /> Growth Systems Catalog
        </h2>
        <Button size="sm" onClick={() => openEdit()}>
          <Plus className="w-4 h-4 mr-1" /> New System
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{r.label}</span>
                <Badge variant="secondary" className="text-[10px]">{r.key}</Badge>
                {(r.recommended_stages ?? []).map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                ))}
                <Badge variant="outline" className="text-[10px]">{(compatBySystem.get(r.id)?.size ?? 0)} channels</Badge>
                {!r.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
              </div>
              {r.primary_objective && <div className="text-xs font-medium mt-1">Objective: {r.primary_objective}</div>}
              {r.description && <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Growth System</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Key</Label><Input value={editing?.key ?? ""} onChange={(e) => setEditing({ ...editing!, key: e.target.value })} placeholder="client_converter" /></div>
              <div><Label>Label</Label><Input value={editing?.label ?? ""} onChange={(e) => setEditing({ ...editing!, label: e.target.value })} placeholder="Client Converter" /></div>
            </div>
            <div><Label>Primary Objective</Label><Input value={editing?.primary_objective ?? ""} onChange={(e) => setEditing({ ...editing!, primary_objective: e.target.value })} placeholder="Convert leads into paying clients" /></div>
            <div><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} rows={2} /></div>

            <div>
              <Label>Suitable offer tiers</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {OFFER_TIERS.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={(editing?.suitable_offer_tiers ?? []).includes(t)}
                      onCheckedChange={() => setEditing({ ...editing!, suitable_offer_tiers: toggleArr(editing?.suitable_offer_tiers, t) })} />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Recommended stages</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {STAGES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={(editing?.recommended_stages ?? []).includes(s)}
                      onCheckedChange={() => setEditing({ ...editing!, recommended_stages: toggleArr(editing?.recommended_stages, s) })} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Compatible acquisition channels</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded">
                {channels.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={editingCompat.has(ch.id)} onCheckedChange={() => toggleCompat(ch.id)} />
                    {ch.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Attached build guides</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded">
                {guides.length === 0 && <div className="text-xs text-muted-foreground col-span-2">No build guides yet — create them in the Build Guides admin tab.</div>}
                {guides.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={editingGuides.has(g.id)} onCheckedChange={() => toggleGuide(g.id)} />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>



            <div>
              <Label>Architecture (JSON)</Label>
              <Textarea value={archText} onChange={(e) => { setArchText(e.target.value); setArchError(null); }}
                rows={8} className="font-mono text-xs" placeholder='{"stages":[]}' />
              {archError && <div className="text-xs text-destructive mt-1">JSON error: {archError}</div>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Icon</Label><Input value={editing?.icon ?? ""} onChange={(e) => setEditing({ ...editing!, icon: e.target.value })} placeholder="Zap" /></div>
              <div><Label>Sort order</Label><Input type="number" value={editing?.sort_order ?? 0} onChange={(e) => setEditing({ ...editing!, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-3"><Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })} /><Label>Active</Label></div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={loading}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGrowthSystemsCatalog;
