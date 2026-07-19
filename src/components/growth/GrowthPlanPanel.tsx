import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, PlayCircle, XCircle, ExternalLink, RefreshCw, Trophy, MessageCircle, BookOpen, Lock } from "lucide-react";
import { toast } from "sonner";
import { useGrowthPlan } from "@/lib/growth/useGrowthPlan";
import type { DerivedTask, TaskResource, TaskStatus } from "@/lib/growth/taskTypes";
import type { GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";
import { setWorkspaceState } from "@/lib/growth/cycleService";
import {
  DECISION_SPECS,
  REASSESS_SLUGS,
  buildDecisionPatch,
  isDecisionTask,
  readDecisionValue,
} from "@/lib/growth/decisionOptions";
import { resolveTaskResources } from "@/lib/growth/resourceResolver";
import { askCoachForTask, normalizeExternalUrl } from "@/lib/coach/askCoachForTask";

interface Props {
  subAccountId: string | null;
  assessment: GrowthAssessmentRow | null;
  onOpenModule?: (moduleId: RelatedModule) => void;
  /** Invoked when the user clicks the "Retake assessment" CTA on a reassess
   *  task (or the terminal completion banner). Parent flips the wizard on. */
  onRetakeAssessment?: () => void;
}

/**
 * Cycle-aware Growth Plan (Step 6).
 *
 * Layout:
 *   1. Terminal completion banner  → when `workspaceState.roadmap_completed`.
 *   2. Foundation tasks (stage=any) → grouped separately (blueprint etc).
 *   3. Stage tasks scoped to the currently active cycle.
 *
 * Task row variants:
 *   - Decision tasks   → inline Select / free-text picker (writes via
 *                        `setWorkspaceState`; toggle checkbox hidden).
 *   - Reassess tasks   → derived status + "Retake assessment" CTA;
 *                        no toggle, no progress row is ever written.
 *   - Normal tasks     → checkbox toggle → `updateStatus`.
 *
 * Cycle numbers and internal cycle mechanics are intentionally not exposed.
 */
export default function GrowthPlanPanel({
  subAccountId,
  assessment,
  onOpenModule,
  onRetakeAssessment,
}: Props) {
  const { t } = useTranslation();
  const {
    loading,
    plan,
    activeCycle,
    needsCycleBootstrap,
    workspaceState,
    refresh,
    updateStatus,
  } = useGrowthPlan(subAccountId, assessment);

  if (!assessment) return null;

  const roadmapCompleted = workspaceState.roadmap_completed === true;

  if (loading || needsCycleBootstrap) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h4 className="font-display font-bold text-foreground mb-3">
          {t("growth.plan.title", "Your Growth Plan")}
        </h4>
        <div className="py-8 text-center text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
          {needsCycleBootstrap
            ? t("growth.plan.bootstrapping", "Preparing your plan…")
            : t("common.loading", "Loading…")}
        </div>
      </div>
    );
  }

  if (roadmapCompleted) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-card text-center">
        <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-6 h-6 text-primary-foreground" />
        </div>
        <h4 className="font-display font-bold text-foreground mb-2">
          {t("growth.plan.completedTitle", "You've completed the Growth Roadmap")}
        </h4>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          {t(
            "growth.plan.completedBody",
            "Every stage of the Growth Roadmap has been reached. Retake the assessment any time to spot new bottlenecks.",
          )}
        </p>
        {onRetakeAssessment && (
          <Button variant="outline" size="sm" onClick={onRetakeAssessment}>
            {t("growth.retake", "Retake assessment")}
          </Button>
        )}
      </div>
    );
  }

  const foundationTasks = plan.filter((p) => p.task.stage === "any");
  const stageTasks = plan.filter((p) => p.task.stage !== "any");

  const completedCount = plan.filter((p) => p.isCompleted).length;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-display font-bold text-foreground">
          {t("growth.plan.title", "Your Growth Plan")}
        </h4>
        <span className="text-xs text-muted-foreground">
          {completedCount} / {plan.length} {t("growth.plan.done", "done")}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t(
          "growth.plan.description",
          "Your next concrete actions, filtered to your current stage.",
        )}
      </p>

      {plan.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "growth.plan.empty",
            "No tasks match your current stage yet. Complete your Business Blueprint or retake the assessment for tailored next steps.",
          )}
        </p>
      ) : (
        <div className="space-y-6">
          {foundationTasks.length > 0 && (
            <TaskGroup
              label={t("growth.plan.groupFoundation", "Foundation")}
              hint={t(
                "growth.plan.groupFoundationHint",
                "Cross-stage groundwork. Stays with your workspace.",
              )}
              items={foundationTasks}
              subAccountId={subAccountId}
              workspaceState={workspaceState}
              onStatus={updateStatus}
              onRefresh={refresh}
              onOpenModule={onOpenModule}
              onRetakeAssessment={onRetakeAssessment}
            />
          )}
          {stageTasks.length > 0 && (
            <TaskGroup
              label={t("growth.plan.groupStage", "This stage")}
              items={stageTasks}
              subAccountId={subAccountId}
              workspaceState={workspaceState}
              onStatus={updateStatus}
              onRefresh={refresh}
              onOpenModule={onOpenModule}
              onRetakeAssessment={onRetakeAssessment}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task group
// ---------------------------------------------------------------------------

function TaskGroup({
  label,
  hint,
  items,
  subAccountId,
  workspaceState,
  onStatus,
  onRefresh,
  onOpenModule,
  onRetakeAssessment,
}: {
  label: string;
  hint?: string;
  items: DerivedTask[];
  subAccountId: string | null;
  workspaceState: Record<string, unknown>;
  onStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenModule?: (m: RelatedModule) => void;
  onRetakeAssessment?: () => void;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
        {label}
      </div>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      <ol className="space-y-3">
        {items.map((item) => (
          <PlanRow
            key={item.task.id}
            item={item}
            subAccountId={subAccountId}
            workspaceState={workspaceState}
            onStatus={(status) => onStatus(item.task.id, status)}
            onRefresh={onRefresh}
            onOpenModule={onOpenModule}
            onRetakeAssessment={onRetakeAssessment}
          />
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row variants
// ---------------------------------------------------------------------------

function PlanRow({
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
  onOpenModule?: (m: RelatedModule) => void;
  onRetakeAssessment?: () => void;
}) {
  const { task, status } = item;
  const isReassess = REASSESS_SLUGS.has(task.slug);
  const isDecision = isDecisionTask(task.slug);

  return (
    <li className="flex gap-3 p-3 rounded-lg border border-border bg-background/40">
      <StatusIcon status={status} interactive={!isReassess && !isDecision} onToggle={() =>
        onStatus(status === "completed" ? "available" : "completed")
      } />

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-foreground ${status === "completed" ? "line-through opacity-70" : ""}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-sm text-muted-foreground mt-0.5">{task.description}</div>
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
            <div className="flex flex-wrap gap-2 mt-2 items-center">
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

        <RowActions
          status={status}
          isReassess={isReassess}
          isDecision={isDecision}
          onStatus={onStatus}
          onRetakeAssessment={onRetakeAssessment}
        />
      </div>
    </li>
  );
}

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
        : status === "dismissed"
          ? XCircle
          : status === "locked"
            ? Lock
            : Circle;
  const iconClass =
    status === "completed"
      ? "text-green-500"
      : status === "in_progress"
        ? "text-primary"
        : status === "locked"
          ? "text-muted-foreground/60"
          : "text-muted-foreground";

  if (!interactive || status === "locked") {
    return <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconClass}`} aria-hidden />;
  }
  return (
    <button type="button" onClick={onToggle} className="mt-0.5 shrink-0" aria-label="Toggle completion">
      <Icon className={`w-5 h-5 ${iconClass}`} />
    </button>
  );
}

function RowActions({
  status,
  isReassess,
  isDecision,
  onStatus,
  onRetakeAssessment,
}: {
  status: TaskStatus;
  isReassess: boolean;
  isDecision: boolean;
  onStatus: (status: TaskStatus) => Promise<void>;
  onRetakeAssessment?: () => void;
}) {
  if (isReassess) {
    return (
      <div className="flex items-center gap-1 mt-2">
        {status === "completed" ? (
          <span className="text-xs text-muted-foreground">
            Reassessment complete for this stage.
          </span>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={onRetakeAssessment}
            disabled={!onRetakeAssessment}
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Retake assessment
          </Button>
        )}
      </div>
    );
  }

  if (isDecision) {
    // Picker itself carries the primary action; no start/dismiss.
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {status !== "in_progress" && status !== "completed" && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onStatus("in_progress")}>
          Start
        </Button>
      )}
      {status !== "dismissed" && status !== "completed" && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onStatus("dismissed")}>
          Dismiss
        </Button>
      )}
      {status === "dismissed" && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onStatus("available")}>
          Restore
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision picker
// ---------------------------------------------------------------------------

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
      <div className="mt-2 flex gap-2 items-center">
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
    <div className="mt-2 flex gap-2 items-center flex-wrap">
      <Select
        value={current || undefined}
        onValueChange={(v) => save(v)}
        disabled={saving}
      >
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

// ---------------------------------------------------------------------------
// Resource link
// ---------------------------------------------------------------------------

function ResourceLink({ r, onOpenModule }: { r: TaskResource; onOpenModule?: (m: RelatedModule) => void }) {
  const label = r.label ?? r.ref;
  if (r.type === "module" && r.module && onOpenModule) {
    return (
      <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => onOpenModule(r.module!)}>
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
        className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
      >
        {label} <ExternalLink className="w-3 h-3" />
      </a>
    );
  }
  return <span className="text-xs text-muted-foreground">{label}</span>;
}
