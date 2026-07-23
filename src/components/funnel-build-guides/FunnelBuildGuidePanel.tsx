import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, GraduationCap, ExternalLink, PlayCircle, ChevronDown, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Task {
  id: string;
  stage_id: string;
  title: string;
  description_md: string | null;
  instructions_url: string | null;
  video_url: string | null;
  sort_order: number;
  is_active: boolean;
}
interface Stage {
  id: string;
  build_guide_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  tasks: Task[];
}
interface Guide {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  source: string;
  stages: Stage[];
}

interface Props {
  funnelId: string | null;
  onClose: () => void;
}

const FunnelBuildGuidePanel = ({ funnelId, onClose }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [openGuides, setOpenGuides] = useState<Set<string>>(new Set());
  const [openStages, setOpenStages] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!funnelId) { setLoading(false); return; }
    setLoading(true);

    const { data: fbg } = await supabase
      .from("funnel_build_guides")
      .select("build_guide_id, source, sort_order")
      .eq("funnel_id", funnelId)
      .order("sort_order", { ascending: true });

    const guideIds = (fbg ?? []).map((r: any) => r.build_guide_id);
    if (guideIds.length === 0) {
      setGuides([]); setCompleted(new Set()); setLoading(false); return;
    }

    const [{ data: guideRows }, { data: stageRows }, { data: taskRows }, { data: progRows }] = await Promise.all([
      supabase.from("build_guides").select("id,name,description,sort_order").in("id", guideIds),
      supabase.from("build_guide_stages").select("id,build_guide_id,title,description,sort_order").in("build_guide_id", guideIds).order("sort_order", { ascending: true }),
      supabase.from("build_guide_tasks").select("id,stage_id,title,description_md,instructions_url,video_url,sort_order,is_active").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("funnel_build_task_progress").select("task_id").eq("funnel_id", funnelId).not("completed_at", "is", null),
    ]);

    const stageIdsForGuides = new Set((stageRows ?? []).map((s: any) => s.id));
    const activeTasks = (taskRows ?? []).filter((t: any) => stageIdsForGuides.has(t.stage_id));

    const stagesByGuide = new Map<string, Stage[]>();
    for (const s of (stageRows ?? []) as any[]) {
      const tasksForStage = activeTasks.filter((t: any) => t.stage_id === s.id);
      const arr = stagesByGuide.get(s.build_guide_id) ?? [];
      arr.push({ ...s, tasks: tasksForStage } as Stage);
      stagesByGuide.set(s.build_guide_id, arr);
    }

    const ordered = (fbg ?? []).map((r: any) => {
      const g = (guideRows ?? []).find((x: any) => x.id === r.build_guide_id);
      if (!g) return null;
      return { ...g, source: r.source, stages: stagesByGuide.get(g.id) ?? [] } as Guide;
    }).filter(Boolean) as Guide[];

    setGuides(ordered);
    setCompleted(new Set((progRows ?? []).map((p: any) => p.task_id)));
    // Auto-open first guide/stage for convenience
    if (ordered.length > 0) {
      setOpenGuides(new Set([ordered[0].id]));
      if (ordered[0].stages[0]) setOpenStages(new Set([ordered[0].stages[0].id]));
    }
    setLoading(false);
  }, [funnelId]);

  useEffect(() => { load(); }, [load]);

  const allTasks = useMemo(() => guides.flatMap((g) => g.stages.flatMap((s) => s.tasks)), [guides]);
  const overallPct = allTasks.length === 0 ? 0 : Math.round((allTasks.filter((t) => completed.has(t.id)).length / allTasks.length) * 100);

  const toggleTask = useCallback(async (task: Task, next: boolean) => {
    if (!funnelId || !user) return;
    // Optimistic
    setCompleted((prev) => {
      const s = new Set(prev);
      if (next) s.add(task.id); else s.delete(task.id);
      return s;
    });
    try {
      if (next) {
        const { error } = await supabase.from("funnel_build_task_progress").upsert({
          funnel_id: funnelId,
          task_id: task.id,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        }, { onConflict: "funnel_id,task_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("funnel_build_task_progress")
          .delete().eq("funnel_id", funnelId).eq("task_id", task.id);
        if (error) throw error;
      }
    } catch (e: any) {
      // Rollback
      setCompleted((prev) => {
        const s = new Set(prev);
        if (next) s.delete(task.id); else s.add(task.id);
        return s;
      });
      toast.error("Kon taak niet bijwerken");
    }
  }, [funnelId, user]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) =>
    setter((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-bold text-foreground">Build Guides</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-muted/80" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {!funnelId ? (
        <div className="p-6 text-sm text-muted-foreground">Save the funnel first to attach build guides.</div>
      ) : loading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : guides.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          No build guides attached to this funnel yet. Guides are auto-attached when you start building from a Growth Route.
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overall progress</span>
              <span className="font-semibold">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2" />
            <div className="text-[11px] text-muted-foreground">
              {allTasks.filter((t) => completed.has(t.id)).length} / {allTasks.length} tasks complete
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {guides.map((g) => {
                const gTasks = g.stages.flatMap((s) => s.tasks);
                const gDone = gTasks.filter((t) => completed.has(t.id)).length;
                const gPct = gTasks.length === 0 ? 0 : Math.round((gDone / gTasks.length) * 100);
                const gOpen = openGuides.has(g.id);
                return (
                  <div key={g.id} className="rounded-lg border border-border bg-background overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2 p-3 hover:bg-muted/40 text-left"
                      onClick={() => toggleSet(setOpenGuides)(g.id)}
                    >
                      {gOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{g.name}</span>
                          <Badge variant="outline" className="text-[9px] uppercase">{g.source === "growth_system" ? "System" : "Channel"}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={gPct} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground w-10 text-right">{gPct}%</span>
                        </div>
                      </div>
                    </button>

                    {gOpen && (
                      <div className="border-t border-border">
                        {g.stages.map((s) => {
                          const sDone = s.tasks.filter((t) => completed.has(t.id)).length;
                          const sPct = s.tasks.length === 0 ? 0 : Math.round((sDone / s.tasks.length) * 100);
                          const sOpen = openStages.has(s.id);
                          return (
                            <div key={s.id} className="border-b border-border last:border-b-0">
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 text-left"
                                onClick={() => toggleSet(setOpenStages)(s.id)}
                              >
                                {sOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                <span className="text-xs font-medium flex-1 truncate">{s.title}</span>
                                <span className="text-[10px] text-muted-foreground">{sDone}/{s.tasks.length} · {sPct}%</span>
                              </button>
                              {sOpen && (
                                <div className="px-3 pb-3 space-y-3">
                                  {s.tasks.length === 0 && (
                                    <div className="text-[11px] text-muted-foreground italic px-1">No tasks in this stage.</div>
                                  )}
                                  {s.tasks.map((t) => {
                                    const done = completed.has(t.id);
                                    return (
                                      <div key={t.id} className={`rounded-md border p-2.5 ${done ? "bg-muted/40 border-border" : "border-border bg-background"}`}>
                                        <div className="flex items-start gap-2">
                                          <Checkbox
                                            checked={done}
                                            onCheckedChange={(v) => toggleTask(t, !!v)}
                                            className="mt-0.5"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                                            {t.description_md && (
                                              <div className="prose prose-xs prose-neutral dark:prose-invert max-w-none mt-1.5 text-[11px] leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.description_md}</ReactMarkdown>
                                              </div>
                                            )}
                                            {(t.instructions_url || t.video_url) && (
                                              <div className="flex items-center gap-3 mt-2">
                                                {t.instructions_url && (
                                                  <a href={t.instructions_url} target="_blank" rel="noopener noreferrer"
                                                     className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                                    <ExternalLink className="w-3 h-3" /> Instructions
                                                  </a>
                                                )}
                                                {t.video_url && (
                                                  <a href={t.video_url} target="_blank" rel="noopener noreferrer"
                                                     className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                                    <PlayCircle className="w-3 h-3" /> Video
                                                  </a>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {done && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
};

export default FunnelBuildGuidePanel;
