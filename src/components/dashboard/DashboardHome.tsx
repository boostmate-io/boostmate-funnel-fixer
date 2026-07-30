// =============================================================================
// DashboardHome — central overview of the application.
//
// Real data: Growth Roadmap next task, stage, progress, recent activity.
// Placeholder: Funnel Performance widget (future analytics module).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCoach } from "@/contexts/CoachContext";
import { readActiveForWorkspace } from "@/lib/growth/api";
import { useGrowthPlan } from "@/lib/growth/useGrowthPlan";
import { useGrowthStageContent } from "@/lib/growth/useGrowthContent";
import type { GrowthAssessmentRow } from "@/lib/growth/types";
import type { DerivedTask } from "@/lib/growth/taskTypes";

interface Props {
  onOpenModule: (moduleId: string) => void;
  onStartAssessment: () => void;
}

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-card rounded-xl border border-border shadow-card ${className}`}>
    {children}
  </div>
);

/** Deterministic effort estimate — the task catalog has no duration field yet. */
function estimateMinutes(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 997;
  const buckets = [15, 30, 45, 60, 90];
  return buckets[h % buckets.length];
}

function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DashboardHome({ onOpenModule, onStartAssessment }: Props) {
  const { t } = useTranslation();
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const { openCoach } = useCoach();
  const { getStage } = useGrowthStageContent();

  const [assessment, setAssessment] = useState<GrowthAssessmentRow | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeSubAccountId) return;
      setLoadingAssessment(true);
      try {
        const r = await readActiveForWorkspace(activeSubAccountId);
        if (!cancelled) setAssessment(r);
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

  const { loading: loadingPlan, plan, activeCycle } = useGrowthPlan(activeSubAccountId, assessment);

  const stage = activeCycle?.stage ?? assessment?.computed_stage ?? null;
  const stageLabel = stage ? getStage(stage).label || stage : null;

  const completedTasks = plan.filter((p) => p.isCompleted);
  const totalTasks = plan.length;
  const pct = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const nextTask: DerivedTask | undefined = useMemo(
    () =>
      plan.find(
        (p) => !p.isCompleted && p.status !== "locked" && p.status !== "dismissed",
      ),
    [plan],
  );

  const activity = useMemo(() => {
    const items: { label: string; at: string; icon: typeof CheckCircle2 }[] = [];
    completedTasks
      .filter((p) => p.progress?.completed_at)
      .sort((a, b) =>
        (b.progress!.completed_at as string).localeCompare(a.progress!.completed_at as string),
      )
      .slice(0, 4)
      .forEach((p) =>
        items.push({
          label: `Completed “${p.task.title}”`,
          at: p.progress!.completed_at as string,
          icon: CheckCircle2,
        }),
      );
    if (activeCycle?.started_at) {
      items.push({
        label: `Growth Roadmap generated${stageLabel ? ` — ${stageLabel} stage` : ""}`,
        at: activeCycle.started_at,
        icon: Target,
      });
    }
    if (assessment?.created_at) {
      items.push({
        label: "Growth Assessment completed",
        at: assessment.created_at,
        icon: Sparkles,
      });
    }
    if (user?.created_at) {
      items.push({ label: "Account created", at: user.created_at, icon: Users });
    }
    return items
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 6);
  }, [completedTasks, activeCycle, assessment, user, stageLabel]);

  const loading = loadingAssessment || (assessment ? loadingPlan : false);

  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A. Continue your Growth Roadmap */}
        <Card className="lg:col-span-2 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary mb-3">
              <TrendingUp className="w-4 h-4" />
              Continue your Growth Roadmap
            </div>

            {!assessment ? (
              <>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  Find your Growth Stage
                </h2>
                <p className="text-muted-foreground max-w-lg mb-6">
                  Take the Growth Assessment to unlock a roadmap tailored to where your
                  business is right now.
                </p>
                <Button onClick={onStartAssessment}>
                  {t("growth.start", "Start assessment")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                {stageLabel && (
                  <div className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-3">
                    Current stage · {stageLabel}
                  </div>
                )}
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  {nextTask ? nextTask.task.title : "All current tasks are complete"}
                </h2>
                <p className="text-muted-foreground max-w-lg mb-5 line-clamp-3">
                  {nextTask
                    ? nextTask.task.description
                    : "Great work — review your roadmap to see what unlocks next."}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => onOpenModule("growth-roadmap")}>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {nextTask && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Est. {formatMinutes(estimateMinutes(nextTask.task.slug))}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* B. Growth Roadmap Progress */}
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
            <Target className="w-4 h-4 text-primary" />
            Roadmap progress
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-display font-bold text-foreground">{pct}%</span>
            <span className="text-sm text-muted-foreground">complete</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {completedTasks.length} / {totalTasks} tasks completed
          </p>
          <Progress value={pct} className="h-2" />
          <Button
            variant="outline"
            size="sm"
            className="mt-5 w-full"
            onClick={() => onOpenModule("growth-roadmap")}
          >
            View roadmap
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C. Funnel performance (placeholder) */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BarChart3 className="w-4 h-4 text-primary" />
              Funnel performance
            </div>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              Preview data
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active funnels", value: "3" },
              { label: "Visitors (30d)", value: "4,812" },
              { label: "Leads (30d)", value: "386" },
              { label: "Conversion rate", value: "8.0%" },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-2xl font-display font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Live analytics arrive with the analytics module — these figures are illustrative.
          </p>
        </Card>

        {/* D. AI Coach */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
            <Bot className="w-4 h-4 text-primary" />
            AI Coach
          </div>
          <p className="text-sm text-muted-foreground flex-1">
            Your strategist knows your blueprint, stage and roadmap. Ask what to build next,
            or get help finishing your current task.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => openCoach()}>
            Open AI Coach
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* E. Quick actions */}
        <Card className="p-6">
          <p className="text-sm font-medium text-foreground mb-4">Quick actions</p>
          <div className="space-y-2">
            {[
              { label: "Growth Roadmap", icon: TrendingUp, action: () => onOpenModule("growth-roadmap") },
              { label: "Business Blueprint", icon: Sparkles, action: () => onOpenModule("business-blueprint") },
              { label: "Funnels", icon: GitBranch, action: () => onOpenModule("funnels") },
              { label: "Copy documents", icon: FileText, action: () => onOpenModule("copy-documents") },
              { label: "AI Coach", icon: Bot, action: () => openCoach() },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <a.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{a.label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>

        {/* F. Recent activity */}
        <Card className="lg:col-span-2 p-6">
          <p className="text-sm font-medium text-foreground mb-4">Recent activity</p>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Activity will appear here as you work through your roadmap.
            </p>
          ) : (
            <ol className="relative space-y-4">
              {activity.map((item, i) => (
                <li key={`${item.label}-${i}`} className="flex items-start gap-3">
                  <span className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <item.icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(item.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
