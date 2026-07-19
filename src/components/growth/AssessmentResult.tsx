import { useTranslation } from "react-i18next";
import { STAGE_META, STAGE_ORDER } from "@/lib/growth/engine";
import { getGrowthSystemById } from "@/lib/growth/growthSystems";
import type { GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";
import { Button } from "@/components/ui/button";

interface Props {
  row: GrowthAssessmentRow;
  onOpenModule?: (moduleId: RelatedModule) => void;
  ctaSlot?: React.ReactNode;
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

export default function AssessmentResult({ row, onOpenModule, ctaSlot }: Props) {
  const { t } = useTranslation();
  const stage = row.computed_stage;
  const meta = STAGE_META[stage];
  const currentIdx = STAGE_ORDER.indexOf(stage);
  const priorities = row.ai_result?.next_priorities ?? [];
  const sys = row.ai_result?.recommended_growth_system
    ? getGrowthSystemById(row.ai_result.recommended_growth_system.id)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Stage ladder */}
      <div className="grid grid-cols-5 gap-2">
        {STAGE_ORDER.map((s, i) => {
          const active = i === currentIdx;
          const done = i < currentIdx;
          return (
            <div
              key={s}
              className={`rounded-lg p-3 text-center border transition-colors ${
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

      {/* Current stage detail */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {t("growth.yourStage")}
        </div>
        <h3 className="text-2xl font-display font-bold text-foreground mb-4">
          {t(meta.labelKey)}
        </h3>
        <dl className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground mb-1">{t("growth.bottleneck")}</dt>
            <dd className="text-foreground">{t(meta.bottleneckKey)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">{t("growth.objective")}</dt>
            <dd className="text-foreground">{t(meta.objectiveKey)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">{t("growth.milestone")}</dt>
            <dd className="text-foreground">{t(meta.milestoneKey)}</dd>
          </div>
        </dl>
      </div>

      {/* Recommended system */}
      {sys && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {t("growth.recommendedSystem")}
          </div>
          <h4 className="text-lg font-display font-bold text-foreground mb-2">{sys.name}</h4>
          <p className="text-sm text-muted-foreground mb-3">{sys.summary}</p>
          {row.ai_result?.recommended_growth_system?.rationale && (
            <p className="text-sm text-foreground italic">
              "{row.ai_result.recommended_growth_system.rationale}"
            </p>
          )}
        </div>
      )}

      {ctaSlot}
    </div>
  );
}
