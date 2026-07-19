import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { readActiveForWorkspace } from "@/lib/growth/api";
import { STAGE_META, STAGE_ORDER } from "@/lib/growth/engine";
import { useGrowthPlan } from "@/lib/growth/useGrowthPlan";
import {
  DECISION_SPECS,
  REASSESS_SLUGS,
  buildDecisionPatch,
  isDecisionTask,
  readDecisionValue,
} from "@/lib/growth/decisionOptions";
import { setWorkspaceState } from "@/lib/growth/cycleService";
import { resolveTaskResources } from "@/lib/growth/resourceResolver";
import { askCoachForTask, normalizeExternalUrl } from "@/lib/coach/askCoachForTask";
import type { DerivedTask, TaskResource, TaskStatus } from "@/lib/growth/taskTypes";
import type { GrowthAssessmentRow, GrowthStage, RelatedModule } from "@/lib/growth/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  MessageCircle,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  onStartAssessment: () => void;
  onOpenModule: (moduleId: string) => void;
}

const MODULE_TO_APP: Partial<Record<RelatedModule, string>> = {
  blueprint: "business-blueprint",
  "offer-creator": "business-blueprint",
  funnels: "funnels",
  copy: "copy-documents",
  analytics: "analytics",
  outreach: "outreach",
  coach: "overview",
  assets: "business-blueprint",
};

/**
 * Dashboard snapshot of the cycle-aware Growth Roadmap (Step 8).
 *
 * Renders:
 *   1. Empty state → Start assessment CTA when no assessment exists.
 *   2. Terminal completed banner when `roadmap_completed`.
 *   3. Stage header (label / bottleneck / objective / milestone) + stage strip.
 *   4. Current focus task with full status + resource + decision-picker CTAs.
 *   5. Next 2 upcoming tasks (compact).
 *   6. Compact completed-foundation strip.
 *   7. Link into the full Growth Roadmap module for the deeper view.
 *
 * Focus task selection order:
 *   • First non-completed stage task in sort order, if any.
 *   • Otherwise first non-completed foundation task in sort order.
 *   • Otherwise stage milestone reached — surface the stage reassess task.
 *
 * All task state is read via `useGrowthPlan` (same hook the full module uses),
 * so writes flow through the same cycle-aware pipeline and any update here
 * appears identically in the Growth Roadmap module.
 */
export default function GrowthRoadmapOverview({ onStartAssessment, onOpenModule }: Props) {
  const { t } = useTranslation();
  const { activeSubAccountId } = useWorkspace();
  const [row, setRow] = useState<GrowthAssessmentRow | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeSubAccountId) return;
      setLoadingAssessment(true);
      try {
        const r = await readActiveForWorkspace(activeSubAccountId);
        if (!cancelled) setRow(r);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingAssessment(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSubAccountId]);

  const {
    loading: loadingPlan,
    plan,
    activeCycle,
    workspaceState,
    refresh,
    updateStatus,
  } = useGrowthPlan(activeSubAccountId, row);

  if (loadingAssessment) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  // Empty state — no assessment yet.
  if (!row) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 shadow-card text-center">
        <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {t("growth.publicTitle")}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          {t("growth.publicSubtitle")}
        </p>
        <Button size="lg" onClick={onStartAssessment}>
          {t("growth.start")}
        </Button>
      </div>
    );
  }

  const roadmapCompleted = workspaceState.roadmap_completed === true;
  const stage: GrowthStage = activeCycle?.stage ?? row.computed_stage;
  const meta = STAGE_META[stage];
  const currentIdx = STAGE_ORDER.indexOf(stage);

  // Header block (always shown when an assessment exists).
  const header = (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
        {t("growth.title")}
      </h1>
    </div>
  );

  const stageStrip = (
    <div className="grid grid-cols-5 gap-2">
      {STAGE_ORDER.map((s, i) => {
        const active = !roadmapCompleted && i === currentIdx;
        const done = roadmapCompleted || i < currentIdx;
        return (
          <div
            key={s}
            className={`rounded-lg p-3 text-center border ${
              active
                ? "border-primary bg-primary/10 text-foreground"
                : done
                  ? "border-border bg-muted/40 text-muted-foreground"
                  : "border-border bg-card text-muted-foreground"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide">Stage {i + 1}</div>
            <div className="text-sm font-medium">{t(STAGE_META[s].labelKey)}</div>
            <div className="text-xs mt-1">{row.stage_scores[s]}</div>
          </div>
        );
      })}
    </div>
  );

  // Terminal completed → replaces plan area with completion banner.
  if (roadmapCompleted) {
    return (
      <div className="space-y-6">
        {header}
        {stageStrip}
        <div className="bg-card rounded-xl border border-border p-8 shadow-card text-center">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            {t("growth.plan.completedTitle", "You've completed the Growth Roadmap")}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {t(
              "growth.plan.completedBody",
              "Every stage of the Growth Roadmap has been reached. Retake the assessment any time to spot new bottlenecks.",
            )}
          </p>
          <Button variant="outline" size="sm" onClick={onStartAssessment}>
            {t("growth.retake", "Retake assessment")}
          </Button>
        </div>
      </div>
    );
  }

  const openModule = (m: RelatedModule) => {
    const target = MODULE_TO_APP[m];
    if (target) onOpenModule(target);
  };

  // Partition and select focus / upcoming.
  const foundationTasks = plan.filter((p) => p.task.stage === "any");
  const stageTasks = plan.filter((p) => p.task.stage !== "any");
  const completedFoundations = foundationTasks.filter((p) => p.isCompleted);
  const actionable = (p: DerivedTask) => !p.isCompleted && p.status !== "locked" && p.status !== "dismissed";
  const openFoundation = foundationTasks.filter(actionable);
  const openStage = stageTasks.filter(actionable);

  // Foundations outrank stage tasks for focus selection.
  const focus: DerivedTask | undefined = openFoundation[0] ?? openStage[0];
  const upcoming: DerivedTask[] = (() => {
    if (openFoundation[0]) return [...openFoundation.slice(1), ...openStage].slice(0, 2);
    if (openStage[0]) return openStage.slice(1, 3);
    return [];
  })();

  return (
    <div className="space-y-6">
      {header}
      {stageStrip}

      {/* Stage header card */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {t("growth.yourStage")}
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-3">
          {t(meta.labelKey)}
        </h2>
        <div className="space-y-1.5">
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">{t("growth.bottleneck")}: </span>
            {t(meta.bottleneckKey)}
          </p>
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">{t("growth.objective")}: </span>
            {t(meta.objectiveKey)}
          </p>
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">
              {t("growth.milestone", "Milestone")}:{" "}
            </span>
            {t(meta.milestoneKey)}
          </p>
        </div>
      </div>

      {/* Focus + upcoming */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {t("growth.plan.focus", "Your focus right now")}
          </h3>
          <Button variant="link" size="sm" onClick={() => onOpenModule("growth-roadmap")}>
            {t("growth.plan.viewFull", "View full plan")} <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {loadingPlan ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
            {t("common.loading", "Loading…")}
          </div>
        ) : !focus ? (
          <MilestoneReachedCard onRetake={onStartAssessment} />
        ) : (
          <>
            <FocusTaskCard
              item={focus}
              subAccountId={activeSubAccountId}
              workspaceState={workspaceState}
              onStatus={(status) => updateStatus(focus.task.id, status)}
              onRefresh={refresh}
              onOpenModule={openModule}
              onRetakeAssessment={onStartAssessment}
            />

            {upcoming.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  {t("growth.plan.upNext", "Up next")}
                </div>
                <ol className="space-y-2">
                  {upcoming.map((item) => (
                    <UpcomingRow
                      key={item.task.id}
                      item={item}
                      workspaceState={workspaceState}
                    />
                  ))}
                </ol>
              </div>
            )}
          </>
        )}

        {completedFoundations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              {t("growth.plan.foundationDone", "Foundation locked in")}
            </div>
            <div className="flex flex-wrap gap-2">
              {completedFoundations.map((c) => (
                <span
                  key={c.task.id}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground"
                >
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {c.task.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Milestone-reached placeholder (all stage tasks complete, awaiting reassess)
// ---------------------------------------------------------------------------

function MilestoneReachedCard({ onRetake }: { onRetake: () => void }) {
  return (
    <div className="p-4 rounded-lg border border-primary/40 bg-primary/5 text-center">
      <div className="font-medium text-foreground mb-1">
        Stage milestone reached
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        You've completed every task in this stage. Retake the assessment to advance.
      </p>
      <Button size="sm" onClick={onRetake}>
        <RefreshCw className="w-3 h-3 mr-1.5" />
        Retake assessment
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Focus task card — full CTA + decision picker
// ---------------------------------------------------------------------------

function FocusTaskCard({
  item,
  subAccountId,
  workspaceState,
  onStatus,
  onRefresh,
  onOpenModule,
  onRetakeAssessment,
}: {
  item: DerivedTask;
  subAccountId: string | null;
  workspaceState: Record<string, unknown>;
  onStatus: (status: TaskStatus) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenModule: (m: RelatedModule) => void;
  onRetakeAssessment: () => void;
}) {
  const { task, status } = item;
  const isReassess = REASSESS_SLUGS.has(task.slug);
  const isDecision = isDecisionTask(task.slug);

  return (
    <div className="p-4 rounded-lg border border-primary/40 bg-primary/[0.04]">
      <div className="flex gap-3">
        <StatusIcon
          status={status}
          interactive={!isReassess && !isDecision}
          onToggle={() => onStatus(status === "completed" ? "available" : "completed")}
        />
        <div className="flex-1 min-w-0">
          <div
            className={`font-semibold text-foreground ${
              status === "completed" ? "line-through opacity-70" : ""
            }`}
          >
            {task.title}
          </div>
          {task.description && (
            <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
          )}

          {isDecision && subAccountId && (
            <DecisionPicker
              slug={task.slug}
              subAccountId={subAccountId}
              workspaceState={workspaceState}
              onSaved={onRefresh}
            />
          )}

          {(() => {
            const resolved = resolveTaskResources(task, workspaceState);
            const buildGuideUrl = normalizeExternalUrl(task.build_guide_ref);
            const hasCoachPrompt = Boolean(task.coach_prompt_ref);
            if (resolved.length === 0 && !buildGuideUrl && !hasCoachPrompt) return null;
            return (
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                {resolved.map((r, i) => (
                  <ResourceLink key={i} r={r} onOpenModule={onOpenModule} />
                ))}
                {buildGuideUrl && (
                  <a
                    href={buildGuideUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted transition-colors text-foreground"
                  >
                    <BookOpen className="w-3 h-3" />
                    Open Build Guide
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
                {hasCoachPrompt && (
                  <button
                    type="button"
                    onClick={() =>
                      askCoachForTask({
                        taskSlug: task.slug,
                        taskTitle: task.title,
                        coachPromptRef: task.coach_prompt_ref ?? null,
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Ask Coach
                  </button>
                )}
              </div>
            );
          })()}

          {isReassess ? (
            <div className="mt-3">
              <Button size="sm" onClick={onRetakeAssessment}>
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Retake assessment
              </Button>
            </div>
          ) : (
            !isDecision && (
              <div className="flex items-center gap-1 mt-3">
                {status !== "in_progress" && status !== "completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onStatus("in_progress")}
                  >
                    Start
                  </Button>
                )}
                {status !== "dismissed" && status !== "completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onStatus("dismissed")}
                  >
                    Dismiss
                  </Button>
                )}
                {status === "dismissed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onStatus("available")}
                  >
                    Restore
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upcoming task row — compact, read-only
// ---------------------------------------------------------------------------

function UpcomingRow({
  item,
  workspaceState,
}: {
  item: DerivedTask;
  workspaceState: Record<string, unknown>;
}) {
  const { task, status } = item;
  const isDecision = isDecisionTask(task.slug);
  const currentDecision = isDecision ? readDecisionValue(workspaceState, task.slug) : undefined;
  const spec = isDecision ? DECISION_SPECS[task.slug] : undefined;
  const decisionLabel =
    currentDecision && spec
      ? spec.options?.find((o) => o.value === currentDecision)?.label ?? currentDecision
      : undefined;

  return (
    <li className="flex gap-3 items-start p-2 rounded-md">
      <StatusIcon status={status} interactive={false} onToggle={() => {}} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{task.title}</div>
        {decisionLabel && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Selected: <span className="text-foreground">{decisionLabel}</span>
          </div>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Shared bits (mirroring GrowthPlanPanel so behaviour stays identical)
// ---------------------------------------------------------------------------

function StatusIcon({
  status,
  interactive,
  onToggle,
}: {
  status: TaskStatus;
  interactive: boolean;
  onToggle: () => void;
}) {
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "in_progress"
        ? PlayCircle
        : Circle;
  const iconClass =
    status === "completed"
      ? "text-green-500"
      : status === "in_progress"
        ? "text-primary"
        : "text-muted-foreground";

  if (!interactive) {
    return <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconClass}`} aria-hidden />;
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-0.5 shrink-0"
      aria-label="Toggle completion"
    >
      <Icon className={`w-5 h-5 ${iconClass}`} />
    </button>
  );
}

function ResourceLink({
  r,
  onOpenModule,
}: {
  r: TaskResource;
  onOpenModule: (m: RelatedModule) => void;
}) {
  const label = r.label ?? r.ref;
  if (r.type === "module" && r.module) {
    return (
      <Button
        variant="link"
        size="sm"
        className="h-auto px-0 text-xs"
        onClick={() => onOpenModule(r.module!)}
      >
        {label} →
      </Button>
    );
  }
  if (r.type === "external") {
    return (
      <a
        href={r.ref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {label}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

function DecisionPicker({
  slug,
  subAccountId,
  workspaceState,
  onSaved,
}: {
  slug: string;
  subAccountId: string;
  workspaceState: Record<string, unknown>;
  onSaved: () => Promise<void>;
}) {
  const spec = DECISION_SPECS[slug];
  const current = readDecisionValue(workspaceState, slug) ?? "";
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);

  if (!spec) return null;

  const dirty = draft.trim() !== "" && draft !== current;

  const save = async (value: string) => {
    setSaving(true);
    try {
      await setWorkspaceState({
        subAccountId,
        patch: buildDecisionPatch(spec.stateKey, value),
      });
      await onSaved();
    } catch (e) {
      console.error("DecisionPicker.save failed", e);
      toast.error("Could not save your choice.");
    } finally {
      setSaving(false);
    }
  };

  if (spec.freeText) {
    return (
      <div className="mt-3 flex gap-2 items-center">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={spec.placeholder}
          className="h-9 text-sm max-w-md"
          disabled={saving}
        />
        <Button
          size="sm"
          className="h-9"
          disabled={!dirty || saving}
          onClick={() => save(draft.trim())}
        >
          {current ? "Update" : "Save"}
        </Button>
        {current && !dirty && (
          <span className="text-xs text-muted-foreground">Saved</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2 items-center flex-wrap">
      <Select value={current || undefined} onValueChange={(v) => save(v)} disabled={saving}>
        <SelectTrigger className="h-9 text-sm w-[260px]">
          <SelectValue placeholder="Choose an option…" />
        </SelectTrigger>
        <SelectContent>
          {spec.options?.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && (
        <span className="text-xs text-muted-foreground">
          You can change this later.
        </span>
      )}
    </div>
  );
}

