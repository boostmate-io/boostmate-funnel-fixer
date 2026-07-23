import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Filter, Milestone, ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  GrowthRoadmapTaskRow,
  TaskResource,
  TaskResourceType,
  TaskStage,
} from "@/lib/growth/taskTypes";
import type { GrowthStage } from "@/lib/growth/types";
import { STAGE_ORDER } from "@/lib/growth/engine";
import { DECISION_SPECS } from "@/lib/growth/decisionOptions";
import { resolveTaskResourcesForStrategy } from "@/lib/growth/resourceResolver";
import { summarizeCondition } from "@/lib/growth/conditionSummary";

// ---------------------------------------------------------------------------
// Static option catalogs (mirrors the code-owned vocabulary)
// ---------------------------------------------------------------------------

const STAGE_OPTIONS: { value: TaskStage; label: string }[] = [
  { value: "any", label: "Foundation (any)" },
  { value: "validate", label: "Validate" },
  { value: "attract", label: "Attract" },
  { value: "optimize", label: "Optimize" },
  { value: "scale", label: "Scale" },
  { value: "systemize", label: "Systemize" },
];

const RESOURCE_TYPES: { value: TaskResourceType; label: string }[] = [
  { value: "module", label: "In-app module" },
  { value: "doc", label: "Doc" },
  { value: "build_guide", label: "Build guide" },
  { value: "external", label: "External URL" },
];

/** Per-stage strategy option set for resource tagging. Sourced from the same
 *  `DECISION_SPECS` catalog the roadmap uses at runtime, so tagged resources
 *  are guaranteed to match a valid decision value. */
function strategiesForStage(stage: TaskStage): { value: string; label: string }[] {
  const specSlugByStage: Partial<Record<TaskStage, string>> = {
    validate: "validate-choose-path",
    attract: "attract-choose-channel",
    optimize: "optimize-identify-bottleneck",
    scale: "scale-choose-lever",
    systemize: "systemize-choose-path",
  };
  const slug = specSlugByStage[stage];
  if (!slug) return [];
  const spec = DECISION_SPECS[slug];
  return spec?.options ?? [];
}

// ---------------------------------------------------------------------------
// Editing state helpers
// ---------------------------------------------------------------------------

type EditingTask = Partial<GrowthRoadmapTaskRow> & { resources?: TaskResource[] };

function blankResource(): TaskResource {
  return { type: "module", ref: "", label: "" };
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function AdminGrowthRoadmapTasks() {
  const [tasks, setTasks] = useState<GrowthRoadmapTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditingTask | null>(null);
  const [growthSystems, setGrowthSystems] = useState<Array<{ id: string; label: string }>>([]);
  const [stageFilter, setStageFilter] = useState<TaskStage | "all">("all");
  const [showInactive, setShowInactive] = useState(true);

  useEffect(() => {
    supabase
      .from("growth_systems_catalog")
      .select("id,label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setGrowthSystems((data ?? []) as Array<{ id: string; label: string }>));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("growth_roadmap_tasks")
        .select("*")
        .order("stage", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setTasks((data ?? []) as unknown as GrowthRoadmapTaskRow[]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Load failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!showInactive && !t.is_active) return false;
      if (stageFilter !== "all" && t.stage !== stageFilter) return false;
      return true;
    });
  }, [tasks, stageFilter, showInactive]);

  const save = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      const patch = {
        title: editing.title ?? "",
        description: editing.description ?? "",
        is_active: editing.is_active ?? true,
        sort_order: editing.sort_order ?? 0,
        stage: editing.stage ?? "any",
        applicable_stages: (editing.applicable_stages ?? []) as GrowthStage[],
        resources: (editing.resources ?? []) as unknown as TaskResource[],
        cta_label: editing.cta_label ?? null,
        build_guide_ref: editing.build_guide_ref ?? null,
        target_growth_system_id: (editing as any).target_growth_system_id ?? null,
        coach_prompt_ref: editing.coach_prompt_ref ?? null,
      };
      const { error } = await supabase
        .from("growth_roadmap_tasks")
        .update(patch as never)
        .eq("id", editing.id);
      if (error) throw error;
      toast.success("Task saved");
      setEditing(null);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const bump = async (task: GrowthRoadmapTaskRow, dir: -1 | 1) => {
    const patch = { sort_order: task.sort_order + dir * 10 };
    const { error } = await supabase
      .from("growth_roadmap_tasks")
      .update(patch as never)
      .eq("id", task.id);
    if (error) toast.error("Reorder failed");
    else load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Milestone className="w-4 h-4 text-primary" />
            Growth Roadmap Tasks
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage the seeded task catalog. Slug, activation, and completion
            logic remain code-controlled — displayed here read-only.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select
              value={stageFilter}
              onValueChange={(v) => setStageFilter(v as TaskStage | "all")}
            >
              <SelectTrigger className="h-8 text-xs w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All stages
                </SelectItem>
                {STAGE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Label className="text-xs">Show inactive</Label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No tasks match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} onEdit={() => setEditing({ ...task })} onBump={bump} />
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditForm
              editing={editing}
              setEditing={setEditing}
              onCancel={() => setEditing(null)}
              onSave={save}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function TaskRow({
  task,
  onEdit,
  onBump,
}: {
  task: GrowthRoadmapTaskRow;
  onEdit: () => void;
  onBump: (t: GrowthRoadmapTaskRow, dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border">
      <div className="text-xs text-muted-foreground font-mono w-8 pt-0.5 text-right shrink-0">
        {task.sort_order}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{task.title}</span>
          <Badge variant="secondary" className="text-[10px]">
            {task.stage}
          </Badge>
          {!task.is_active && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              inactive
            </Badge>
          )}
          {(task.resources ?? []).length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {(task.resources ?? []).length} resources
            </Badge>
          )}
          {task.build_guide_ref && (
            <Badge variant="outline" className="text-[10px]">
              guide: {task.build_guide_ref}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">{task.slug}</div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onBump(task, -1)} title="Move up">
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onBump(task, 1)} title="Move down">
          <ArrowDown className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------

function EditForm({
  editing,
  setEditing,
  onCancel,
  onSave,
  saving,
  growthSystems,
}: {
  editing: EditingTask;
  setEditing: (t: EditingTask) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  growthSystems: Array<{ id: string; label: string }>;
}) {
  const stage: TaskStage = (editing.stage ?? "any") as TaskStage;
  const resources = editing.resources ?? [];
  const strategyOptions = strategiesForStage(stage);
  const sharedResources = resources.filter((r) => !r.strategy);
  const perStrategyResources = resources.filter((r) => r.strategy);

  const updateResource = (idx: number, patch: Partial<TaskResource>) => {
    const next = resources.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setEditing({ ...editing, resources: next });
  };
  const removeResource = (idx: number) => {
    const next = resources.filter((_, i) => i !== idx);
    setEditing({ ...editing, resources: next });
  };
  const addResource = (strategy?: string) => {
    setEditing({
      ...editing,
      resources: [...resources, { ...blankResource(), ...(strategy ? { strategy } : {}) }],
    });
  };
  const indexOfResource = (r: TaskResource) => resources.indexOf(r);

  return (
    <div className="space-y-5">
      {/* Read-only identity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Slug (read-only)</Label>
          <Input value={editing.slug ?? ""} readOnly className="text-xs font-mono bg-muted/40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sort order</Label>
          <Input
            type="number"
            value={editing.sort_order ?? 0}
            onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Title / description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input
          value={editing.title ?? ""}
          onChange={(e) => setEditing({ ...editing, title: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={editing.description ?? ""}
          onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Stage config */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Primary stage</Label>
          <Select
            value={stage}
            onValueChange={(v) => setEditing({ ...editing, stage: v as TaskStage })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Active</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={editing.is_active ?? true}
              onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
            />
            <span className="text-xs text-muted-foreground">
              {editing.is_active ?? true ? "Visible to users" : "Hidden from users"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Applicable stages (task also surfaces on these stages)</Label>
        <div className="flex flex-wrap gap-3 pt-1">
          {STAGE_ORDER.map((s) => {
            const checked = (editing.applicable_stages ?? []).includes(s);
            return (
              <label key={s} className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    const cur = new Set(editing.applicable_stages ?? []);
                    if (v) cur.add(s);
                    else cur.delete(s);
                    setEditing({ ...editing, applicable_stages: Array.from(cur) });
                  }}
                />
                {s}
              </label>
            );
          })}
        </div>
      </div>

      {/* CTA + refs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Primary CTA label</Label>
          <Input
            value={editing.cta_label ?? ""}
            placeholder="e.g. Start this experiment"
            onChange={(e) =>
              setEditing({ ...editing, cta_label: e.target.value || null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Build Guide URL</Label>
          <Input
            value={editing.build_guide_ref ?? ""}
            placeholder="https://docs.google.com/spreadsheets/…"
            className="font-mono text-xs"
            onChange={(e) =>
              setEditing({ ...editing, build_guide_ref: e.target.value || null })
            }
          />
          <p className="text-[11px] text-muted-foreground">
            Full external spreadsheet URL. When set, the roadmap task shows an
            "Open Build Guide" button that opens this link in a new tab.
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Target Growth System (route resolver)</Label>
        <Select
          value={((editing as any).target_growth_system_id as string) ?? "__none__"}
          onValueChange={(v) =>
            setEditing({ ...editing, target_growth_system_id: v === "__none__" ? null : v } as EditingTask)
          }
        >
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="No target system" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs">None</SelectItem>
            {growthSystems.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          When set, the task CTA resolves to a Growth Architecture route using this system:
          jump when exactly one route matches, open the filtered map when several match,
          or pre-fill Add Route when none exist. Legacy Build Guide URL above is used only
          when no target system is set.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Coach prompt reference</Label>
        <Input
          value={editing.coach_prompt_ref ?? ""}
          placeholder="coach:growth-task-slug"
          className="font-mono"
          onChange={(e) =>
            setEditing({ ...editing, coach_prompt_ref: e.target.value || null })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Slug of an admin-managed Instruction Block (matches
          <code className="mx-1">ai_instruction_blocks.name</code>). When set,
          the roadmap task shows an "Ask Coach" button that opens the Coach
          scoped to this task and auto-starts the conversation using that
          instruction block.
        </p>
      </div>

      {/* Resources */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Shared resources</Label>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addResource()}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        {sharedResources.length === 0 && (
          <p className="text-xs text-muted-foreground">No shared resources yet.</p>
        )}
        {sharedResources.map((r) => {
          const idx = indexOfResource(r);
          return (
            <ResourceEditor
              key={idx}
              resource={r}
              strategyOptions={strategyOptions}
              onChange={(p) => updateResource(idx, p)}
              onRemove={() => removeResource(idx)}
            />
          );
        })}

        {strategyOptions.length > 0 && (
          <>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <Label className="text-xs font-medium">Per-strategy resources</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Surface only when the user's chosen {stage} strategy matches.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addResource(strategyOptions[0]?.value)}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {perStrategyResources.length === 0 && (
              <p className="text-xs text-muted-foreground">No per-strategy resources yet.</p>
            )}
            {perStrategyResources.map((r) => {
              const idx = indexOfResource(r);
              return (
                <ResourceEditor
                  key={idx}
                  resource={r}
                  strategyOptions={strategyOptions}
                  onChange={(p) => updateResource(idx, p)}
                  onRemove={() => removeResource(idx)}
                />
              );
            })}

            <StrategyPreview stage={stage} resources={resources} />
          </>
        )}
      </div>

      {/* Read-only logic */}
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Applicability logic (code-controlled)
          </div>
          <div className="text-xs font-mono break-words">
            {summarizeCondition((editing as { applicability_conditions?: unknown }).applicability_conditions as never ?? null)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Prerequisite (activation) logic (code-controlled)
          </div>
          <div className="text-xs font-mono break-words">
            {summarizeCondition(editing.activation_conditions ?? null)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Completion logic (code-controlled)
          </div>
          <div className="text-xs font-mono break-words">
            {summarizeCondition(editing.completion_conditions ?? null)}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resource editor
// ---------------------------------------------------------------------------

function ResourceEditor({
  resource,
  strategyOptions,
  onChange,
  onRemove,
}: {
  resource: TaskResource;
  strategyOptions: { value: string; label: string }[];
  onChange: (patch: Partial<TaskResource>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={resource.type}
          onValueChange={(v) => onChange({ type: v as TaskResourceType })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={resource.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label"
          className="h-8 text-xs"
        />
        <Input
          value={resource.ref}
          onChange={(e) => onChange({ ref: e.target.value })}
          placeholder="ref / URL / slug"
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="flex items-center gap-2">
        {strategyOptions.length > 0 && resource.strategy !== undefined && (
          <Select
            value={resource.strategy || ""}
            onValueChange={(v) => onChange({ strategy: v })}
          >
            <SelectTrigger className="h-8 text-xs w-[220px]">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent>
              {strategyOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {resource.type === "module" && (
          <Input
            value={resource.module ?? ""}
            onChange={(e) => onChange({ module: e.target.value as TaskResource["module"] })}
            placeholder="Module id (blueprint, funnels…)"
            className="h-8 text-xs font-mono flex-1"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={onRemove}
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy preview
// ---------------------------------------------------------------------------

function StrategyPreview({
  stage,
  resources,
}: {
  stage: TaskStage;
  resources: TaskResource[];
}) {
  const options = strategiesForStage(stage);
  if (options.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
        Resolved resources per strategy
      </div>
      <div className="space-y-1.5">
        {options.map((o) => {
          const resolved = resolveTaskResourcesForStrategy(resources, stage, o.value);
          return (
            <div key={o.value} className="text-xs flex items-start gap-2">
              <span className="font-medium min-w-[140px]">{o.label}</span>
              <span className="text-muted-foreground">
                {resolved.length === 0
                  ? "—"
                  : resolved
                      .map((r) => `${r.label || r.ref}${r.strategy ? "" : " (shared)"}`)
                      .join(", ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
