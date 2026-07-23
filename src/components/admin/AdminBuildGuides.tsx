// =============================================================================
// AdminBuildGuides — CRUD for reusable Build Guides + inline Stages & Tasks.
// Guides are attached to Growth Systems / Acquisition Channels elsewhere.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, BookOpen, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Guide {
  id: string;
  key: string;
  label: string;
  description: string | null;
  scope: string; // 'system' | 'channel' | 'shared'
  is_active: boolean;
  sort_order: number;
}

interface Stage {
  id: string;
  guide_id: string;
  label: string;
  description: string | null;
  sort_order: number;
}

interface Task {
  id: string;
  stage_id: string;
  label: string;
  description_md: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

const SCOPES = ["system", "channel", "shared"];

const AdminBuildGuides = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [stagesByGuide, setStagesByGuide] = useState<Record<string, Stage[]>>({});
  const [tasksByStage, setTasksByStage] = useState<Record<string, Task[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [editingGuide, setEditingGuide] = useState<Partial<Guide> | null>(null);
  const [editingStage, setEditingStage] = useState<{ guide_id: string } & Partial<Stage> | null>(null);
  const [editingTask, setEditingTask] = useState<{ stage_id: string } & Partial<Task> | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGuides = useCallback(async () => {
    const { data } = await supabase.from("build_guides").select("*").order("sort_order");
    setGuides((data ?? []) as Guide[]);
  }, []);

  const loadStages = useCallback(async (guideId: string) => {
    const { data } = await supabase
      .from("build_guide_stages")
      .select("*")
      .eq("guide_id", guideId)
      .order("sort_order");
    setStagesByGuide((prev) => ({ ...prev, [guideId]: (data ?? []) as Stage[] }));
  }, []);

  const loadTasks = useCallback(async (stageId: string) => {
    const { data } = await supabase
      .from("build_guide_tasks")
      .select("*")
      .eq("stage_id", stageId)
      .order("sort_order");
    setTasksByStage((prev) => ({ ...prev, [stageId]: (data ?? []) as Task[] }));
  }, []);

  useEffect(() => { loadGuides(); }, [loadGuides]);

  const toggleGuide = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { next.add(id); if (!stagesByGuide[id]) loadStages(id); }
      return next;
    });
  };

  const toggleStage = (id: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { next.add(id); if (!tasksByStage[id]) loadTasks(id); }
      return next;
    });
  };

  const saveGuide = async () => {
    if (!editingGuide?.key || !editingGuide?.label) { toast.error("Key and label required"); return; }
    setLoading(true);
    const payload: any = {
      key: editingGuide.key,
      label: editingGuide.label,
      description: editingGuide.description ?? null,
      scope: editingGuide.scope ?? "shared",
      is_active: editingGuide.is_active ?? true,
      sort_order: editingGuide.sort_order ?? guides.length * 10,
    };
    const q = editingGuide.id
      ? supabase.from("build_guides").update(payload).eq("id", editingGuide.id)
      : supabase.from("build_guides").insert(payload);
    const { error } = await q;
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setEditingGuide(null); loadGuides(); }
  };

  const delGuide = async (id: string) => {
    if (!confirm("Delete this guide? All stages and tasks will be removed.")) return;
    const { error } = await supabase.from("build_guides").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); loadGuides(); }
  };

  const saveStage = async () => {
    if (!editingStage?.label) { toast.error("Label required"); return; }
    const payload: any = {
      guide_id: editingStage.guide_id,
      label: editingStage.label,
      description: editingStage.description ?? null,
      sort_order: editingStage.sort_order ?? (stagesByGuide[editingStage.guide_id]?.length ?? 0) * 10,
    };
    const q = editingStage.id
      ? supabase.from("build_guide_stages").update(payload).eq("id", editingStage.id)
      : supabase.from("build_guide_stages").insert(payload);
    const { error } = await q;
    if (error) toast.error(error.message);
    else { toast.success("Saved"); loadStages(editingStage.guide_id); setEditingStage(null); }
  };

  const delStage = async (id: string, guideId: string) => {
    if (!confirm("Delete this stage?")) return;
    const { error } = await supabase.from("build_guide_stages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); loadStages(guideId); }
  };

  const saveTask = async () => {
    if (!editingTask?.label) { toast.error("Label required"); return; }
    const payload: any = {
      stage_id: editingTask.stage_id,
      label: editingTask.label,
      description_md: editingTask.description_md ?? null,
      is_required: editingTask.is_required ?? true,
      is_active: editingTask.is_active ?? true,
      sort_order: editingTask.sort_order ?? (tasksByStage[editingTask.stage_id]?.length ?? 0) * 10,
    };
    const q = editingTask.id
      ? supabase.from("build_guide_tasks").update(payload).eq("id", editingTask.id)
      : supabase.from("build_guide_tasks").insert(payload);
    const { error } = await q;
    if (error) toast.error(error.message);
    else { toast.success("Saved"); loadTasks(editingTask.stage_id); setEditingTask(null); }
  };

  const delTask = async (id: string, stageId: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("build_guide_tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); loadTasks(stageId); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Build Guides
        </h2>
        <Button size="sm" onClick={() => setEditingGuide({ is_active: true, scope: "shared", sort_order: guides.length * 10 })}>
          <Plus className="w-4 h-4 mr-1" /> New Guide
        </Button>
      </div>

      <div className="space-y-2">
        {guides.map((g) => {
          const isOpen = expanded.has(g.id);
          const stages = stagesByGuide[g.id];
          return (
            <div key={g.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 p-3">
                <button onClick={() => toggleGuide(g.id)} className="p-1 hover:bg-muted rounded">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{g.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{g.key}</Badge>
                    <Badge variant="outline" className="text-[10px]">{g.scope}</Badge>
                    {!g.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {g.description && <div className="text-xs text-muted-foreground mt-0.5">{g.description}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditingGuide(g)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => delGuide(g.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {isOpen && (
                <div className="border-t border-border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stages</span>
                    <Button size="sm" variant="outline" onClick={() => setEditingStage({ guide_id: g.id })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Stage
                    </Button>
                  </div>
                  {!stages ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                    </div>
                  ) : stages.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic py-2">No stages yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {stages.map((s) => {
                        const stageOpen = expandedStages.has(s.id);
                        const tasks = tasksByStage[s.id];
                        return (
                          <div key={s.id} className="rounded border border-border bg-background">
                            <div className="flex items-center gap-2 px-2 py-1.5">
                              <button onClick={() => toggleStage(s.id)} className="p-0.5 hover:bg-muted rounded">
                                {stageOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{s.label}</div>
                                {s.description && <div className="text-[11px] text-muted-foreground truncate">{s.description}</div>}
                              </div>
                              <button onClick={() => setEditingStage({ guide_id: g.id, ...s })} className="p-1 hover:bg-muted rounded"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => delStage(s.id, g.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            {stageOpen && (
                              <div className="border-t border-border p-2 space-y-1.5 bg-muted/10">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Tasks</span>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingTask({ stage_id: s.id, is_required: true, is_active: true })}>
                                    <Plus className="w-3 h-3 mr-1" /> Task
                                  </Button>
                                </div>
                                {!tasks ? (
                                  <div className="text-xs text-muted-foreground py-1">Loading…</div>
                                ) : tasks.length === 0 ? (
                                  <div className="text-xs text-muted-foreground italic py-1">No tasks yet.</div>
                                ) : (
                                  tasks.map((t) => (
                                    <div key={t.id} className="flex items-center gap-2 px-2 py-1 rounded bg-background border border-border">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium flex items-center gap-1.5">
                                          {t.label}
                                          {!t.is_required && <Badge variant="outline" className="text-[9px]">optional</Badge>}
                                          {!t.is_active && <Badge variant="destructive" className="text-[9px]">inactive</Badge>}
                                        </div>
                                      </div>
                                      <button onClick={() => setEditingTask({ stage_id: s.id, ...t })} className="p-1 hover:bg-muted rounded"><Pencil className="w-3 h-3" /></button>
                                      <button onClick={() => delTask(t.id, s.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guide dialog */}
      <Dialog open={!!editingGuide} onOpenChange={(o) => !o && setEditingGuide(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingGuide?.id ? "Edit" : "New"} Build Guide</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Key</Label><Input value={editingGuide?.key ?? ""} onChange={(e) => setEditingGuide({ ...editingGuide!, key: e.target.value })} placeholder="meta-ads-launch" /></div>
              <div><Label>Label</Label><Input value={editingGuide?.label ?? ""} onChange={(e) => setEditingGuide({ ...editingGuide!, label: e.target.value })} placeholder="Meta Ads Launch" /></div>
            </div>
            <div>
              <Label>Scope</Label>
              <select className="w-full border rounded h-10 px-2 bg-background"
                value={editingGuide?.scope ?? "shared"}
                onChange={(e) => setEditingGuide({ ...editingGuide!, scope: e.target.value })}>
                {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={editingGuide?.description ?? ""} onChange={(e) => setEditingGuide({ ...editingGuide!, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort order</Label><Input type="number" value={editingGuide?.sort_order ?? 0} onChange={(e) => setEditingGuide({ ...editingGuide!, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-3"><Switch checked={editingGuide?.is_active ?? true} onCheckedChange={(v) => setEditingGuide({ ...editingGuide!, is_active: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingGuide(null)}>Cancel</Button>
            <Button onClick={saveGuide} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage dialog */}
      <Dialog open={!!editingStage} onOpenChange={(o) => !o && setEditingStage(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStage?.id ? "Edit" : "New"} Stage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Label</Label><Input value={editingStage?.label ?? ""} onChange={(e) => setEditingStage({ ...editingStage!, label: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={editingStage?.description ?? ""} onChange={(e) => setEditingStage({ ...editingStage!, description: e.target.value })} /></div>
            <div><Label>Sort order</Label><Input type="number" value={editingStage?.sort_order ?? 0} onChange={(e) => setEditingStage({ ...editingStage!, sort_order: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingStage(null)}>Cancel</Button>
            <Button onClick={saveStage}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task dialog */}
      <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingTask?.id ? "Edit" : "New"} Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Label</Label><Input value={editingTask?.label ?? ""} onChange={(e) => setEditingTask({ ...editingTask!, label: e.target.value })} /></div>
            <div>
              <Label>Description (Markdown)</Label>
              <Textarea rows={10} className="font-mono text-xs" value={editingTask?.description_md ?? ""} onChange={(e) => setEditingTask({ ...editingTask!, description_md: e.target.value })} placeholder="## Steps&#10;1. ..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Sort order</Label><Input type="number" value={editingTask?.sort_order ?? 0} onChange={(e) => setEditingTask({ ...editingTask!, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-3"><Switch checked={editingTask?.is_required ?? true} onCheckedChange={(v) => setEditingTask({ ...editingTask!, is_required: v })} /><Label>Required</Label></div>
              <div className="flex items-end gap-3"><Switch checked={editingTask?.is_active ?? true} onCheckedChange={(v) => setEditingTask({ ...editingTask!, is_active: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={saveTask}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBuildGuides;
