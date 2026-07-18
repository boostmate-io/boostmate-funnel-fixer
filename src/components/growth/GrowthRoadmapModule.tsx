import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AssessmentWizard from "@/components/growth/AssessmentWizard";
import AssessmentResult from "@/components/growth/AssessmentResult";
import GrowthPlanPanel from "@/components/growth/GrowthPlanPanel";
import { createInternalAssessment, readActiveForWorkspace, runAiAnalysis } from "@/lib/growth/api";
import type { AnswerMap, GrowthAssessmentRow, RelatedModule } from "@/lib/growth/types";

interface Props {
  onOpenModule?: (moduleId: string) => void;
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

export default function GrowthRoadmapModule({ onOpenModule }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();

  const [row, setRow] = useState<GrowthAssessmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"result" | "wizard" | "analyzing">("result");

  const load = useCallback(async () => {
    if (!activeSubAccountId) return;
    setLoading(true);
    try {
      const r = await readActiveForWorkspace(activeSubAccountId);
      setRow(r);
      setPhase(r ? "result" : "wizard");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeSubAccountId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (answers: AnswerMap) => {
    if (!user || !activeSubAccountId) return;
    setPhase("analyzing");
    try {
      const created = await createInternalAssessment(user.id, activeSubAccountId, answers);
      try {
        await runAiAnalysis(created.id, { language: i18n.language });
      } catch (e) {
        console.warn("AI analysis failed", e);
      }
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Could not save your assessment.");
      setPhase("wizard");
    }
  };

  const openModule = (m: RelatedModule) => {
    const target = MODULE_TO_APP[m];
    if (target && onOpenModule) onOpenModule(target);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            {t("growth.title")}
          </h1>
        </div>
        {row && phase === "result" && (
          <Button variant="outline" size="sm" onClick={() => setPhase("wizard")}>
            {t("growth.retake")}
          </Button>
        )}
      </div>

      {phase === "wizard" && (
        <AssessmentWizard
          initialAnswers={(row?.answers as AnswerMap) ?? undefined}
          onSubmit={handleSubmit}
        />
      )}

      {phase === "analyzing" && (
        <div className="text-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("growth.loading")}</p>
        </div>
      )}

      {phase === "result" && row && (
        <div className="space-y-6">
          <AssessmentResult row={row} onOpenModule={openModule} />
          <GrowthPlanPanel subAccountId={activeSubAccountId} assessment={row} onOpenModule={openModule} />
        </div>
      )}
    </div>
  );
}
