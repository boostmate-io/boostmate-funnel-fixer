import { useTranslation } from "react-i18next";
import { getGrowthSystemById } from "@/lib/growth/growthSystems";
import type { GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";
import StageLadder from "./StageLadder";
import StageDetailCard from "./StageDetailCard";

interface Props {
  row: GrowthAssessmentRow;
  onOpenModule?: (moduleId: RelatedModule) => void;
  ctaSlot?: React.ReactNode;
}

export default function AssessmentResult({ row, ctaSlot }: Props) {
  const { t } = useTranslation();
  const stage = row.computed_stage;
  const sys = row.ai_result?.recommended_growth_system
    ? getGrowthSystemById(row.ai_result.recommended_growth_system.id)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Stage ladder */}
      <StageLadder currentStage={stage} />

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
