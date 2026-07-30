// Workspace-backed container for the Growth Roadmap.
//
// Owns the data side (useGrowthPlan) and hands it to the presentational
// GrowthPlanPanel in `interactive` mode. The public/anonymous preview uses
// the very same panel in `preview` mode with `usePreviewGrowthPlan`.

import { useGrowthPlan } from "@/lib/growth/useGrowthPlan";
import type { GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";
import GrowthPlanPanel from "./GrowthPlanPanel";

interface Props {
  subAccountId: string | null;
  assessment: GrowthAssessmentRow | null;
  onOpenModule?: (moduleId: RelatedModule) => void;
  onRetakeAssessment?: () => void;
}

export default function GrowthPlanContainer({
  subAccountId,
  assessment,
  onOpenModule,
  onRetakeAssessment,
}: Props) {
  const {
    loading,
    plan,
    needsCycleBootstrap,
    workspaceState,
    refresh,
    updateStatus,
  } = useGrowthPlan(subAccountId, assessment);

  return (
    <GrowthPlanPanel
      mode="interactive"
      assessment={assessment}
      subAccountId={subAccountId}
      loading={loading}
      needsCycleBootstrap={needsCycleBootstrap}
      plan={plan}
      workspaceState={workspaceState}
      refresh={refresh}
      updateStatus={updateStatus}
      onOpenModule={onOpenModule}
      onRetakeAssessment={onRetakeAssessment}
    />
  );
}
