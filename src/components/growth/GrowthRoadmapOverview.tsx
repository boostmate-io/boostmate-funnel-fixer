import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { readActiveForWorkspace } from "@/lib/growth/api";
import { STAGE_META, STAGE_ORDER } from "@/lib/growth/engine";
import type { GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

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
 * Dashboard-first snapshot of the active Growth Assessment.
 * If none exists yet, renders a big "Start assessment" CTA (Stage 0 substitute).
 */
export default function GrowthRoadmapOverview({ onStartAssessment, onOpenModule }: Props) {
  const { t } = useTranslation();
  const { activeSubAccountId } = useWorkspace();
  const [row, setRow] = useState<GrowthAssessmentRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeSubAccountId) return;
      setLoading(true);
      try {
        const r = await readActiveForWorkspace(activeSubAccountId);
        if (!cancelled) setRow(r);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSubAccountId]);

  if (loading) {
    return <div className="h-40 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
    </div>;
  }

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
        <Button size="lg" onClick={onStartAssessment}>{t("growth.start")}</Button>
      </div>
    );
  }

  const stage = row.computed_stage;
  const meta = STAGE_META[stage];
  const currentIdx = STAGE_ORDER.indexOf(stage);
  const priorities = row.ai_result?.next_priorities ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          {t("growth.title")}
        </h1>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {STAGE_ORDER.map((s, i) => {
          const active = i === currentIdx;
          const done = i < currentIdx;
          return (
            <div
              key={s}
              className={`rounded-lg p-3 text-center border ${
                active ? "border-primary bg-primary/10 text-foreground"
                : done ? "border-border bg-muted/40 text-muted-foreground"
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

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {t("growth.yourStage")}
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-3">
          {t(meta.labelKey)}
        </h2>
        <p className="text-sm text-foreground mb-2">
          <span className="text-muted-foreground">{t("growth.bottleneck")}: </span>
          {t(meta.bottleneckKey)}
        </p>
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">{t("growth.objective")}: </span>
          {t(meta.objectiveKey)}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground">
            {t("growth.priorities")}
          </h3>
          <Button variant="link" size="sm" onClick={onStartAssessment}>
            {t("growth.retake")}
          </Button>
        </div>
        {priorities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("growth.aiError")}</p>
        ) : (
          <ol className="space-y-4">
            {priorities.slice(0, 3).map((p, i) => (
              <li key={i} className="flex gap-4">
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{p.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{p.rationale}</div>
                  {p.related_module && p.related_module !== "none" && MODULE_TO_APP[p.related_module] && (
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 h-auto mt-1"
                      onClick={() => onOpenModule(MODULE_TO_APP[p.related_module!]!)}
                    >
                      {t("growth.openModule")} →
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
