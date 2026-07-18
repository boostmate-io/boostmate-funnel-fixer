import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, PlayCircle, XCircle, ExternalLink } from "lucide-react";
import { useGrowthPlan } from "@/lib/growth/useGrowthPlan";
import type { DerivedTask, TaskResource } from "@/lib/growth/taskTypes";
import type { GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";

interface Props {
  subAccountId: string | null;
  assessment: GrowthAssessmentRow | null;
  onOpenModule?: (moduleId: RelatedModule) => void;
}

/**
 * Renders the deterministic Growth Plan for the current workspace + stage.
 * Layer 2 of the Growth Roadmap V2 — WHAT to execute next.
 */
export default function GrowthPlanPanel({ subAccountId, assessment, onOpenModule }: Props) {
  const { t } = useTranslation();
  const { loading, plan, updateStatus } = useGrowthPlan(subAccountId, assessment);

  if (!assessment) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-display font-bold text-foreground">
          {t("growth.plan.title", "Your Growth Plan")}
        </h4>
        <span className="text-xs text-muted-foreground">
          {plan.filter((p) => p.isCompleted).length} / {plan.length} {t("growth.plan.done", "done")}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t(
          "growth.plan.description",
          "Deterministic next-actions filtered to your current stage and workspace signals.",
        )}
      </p>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
          {t("common.loading", "Loading…")}
        </div>
      ) : plan.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "growth.plan.empty",
            "No tasks match your current stage yet. Complete your Business Blueprint or retake the assessment for tailored next steps.",
          )}
        </p>
      ) : (
        <ol className="space-y-3">
          {plan.map((item) => (
            <PlanRow
              key={item.task.id}
              item={item}
              onOpenModule={onOpenModule}
              onStatus={(status) => updateStatus(item.task.id, status)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function PlanRow({
  item,
  onOpenModule,
  onStatus,
}: {
  item: DerivedTask;
  onOpenModule?: (moduleId: RelatedModule) => void;
  onStatus: (status: DerivedTask["status"]) => Promise<void>;
}) {
  const { task, status } = item;

  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "in_progress"
        ? PlayCircle
        : status === "dismissed"
          ? XCircle
          : Circle;

  const iconClass =
    status === "completed"
      ? "text-green-500"
      : status === "in_progress"
        ? "text-primary"
        : status === "dismissed"
          ? "text-muted-foreground"
          : "text-muted-foreground";

  return (
    <li className="flex gap-3 p-3 rounded-lg border border-border bg-background/40">
      <button
        type="button"
        onClick={() => onStatus(status === "completed" ? "available" : "completed")}
        className="mt-0.5 shrink-0"
        aria-label="Toggle completion"
      >
        <Icon className={`w-5 h-5 ${iconClass}`} />
      </button>

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-foreground ${status === "completed" ? "line-through opacity-70" : ""}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-sm text-muted-foreground mt-0.5">{task.description}</div>
        )}

        {task.resources && task.resources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {task.resources.map((r, i) => (
              <ResourceLink key={i} r={r} onOpenModule={onOpenModule} />
            ))}
          </div>
        )}

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
      </div>
    </li>
  );
}

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
