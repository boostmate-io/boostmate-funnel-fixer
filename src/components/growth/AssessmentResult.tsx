import { useTranslation } from "react-i18next";
import { useGrowthSystemsContent } from "@/lib/growth/useGrowthContent";
import type { GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";
import StageLadder from "./StageLadder";
import StageDetailCard from "./StageDetailCard";
import { STAGE_META } from "@/lib/growth/engine";

interface Props {
  row: GrowthAssessmentRow;
  onOpenModule?: (moduleId: RelatedModule) => void;
  ctaSlot?: React.ReactNode;
}

export default function AssessmentResult({ row, ctaSlot }: Props) {
  const { t } = useTranslation();
  const { getSystem } = useGrowthSystemsContent();
  const stage = row.computed_stage;
  const systemId = row.ai_result?.recommended_growth_system?.id;
  // Canonical catalog content (growth_systems_catalog).
  const sys = getSystem(systemId);
  const summary = row.ai_result?.summary?.trim();


  return (
    <div className="space-y-6">
      {/* Stage ladder */}
      <StageLadder currentStage={stage} />

      {/* AI assessment summary */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          {t("growth.aiSummaryTitle")}
        </div>
        <p className="text-base text-foreground leading-relaxed">
          {summary || t("growth.aiSummaryFallback", {
            stage: t(STAGE_META[stage].labelKey),
            system: sys?.name ?? t("growth.recommendedSystem"),
          })}
        </p>
      </div>

      {/* Current stage detail */}
      <StageDetailCard stage={stage} />


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
