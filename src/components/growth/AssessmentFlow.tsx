// Shared, self-contained Growth Assessment flow.
//
// Single source of truth for the anonymous lead-magnet experience. Used by
// both the public `/assessment` page and the embedded block on the marketing
// homepage. Phases: intro -> wizard -> analyzing -> result (+ read-only
// roadmap preview rendered by the SAME GrowthPlanPanel the app uses).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/auth/AuthModal";
import AssessmentWizard from "@/components/growth/AssessmentWizard";
import AssessmentResult from "@/components/growth/AssessmentResult";
import GrowthPlanPanel from "@/components/growth/GrowthPlanPanel";
import { usePreviewGrowthPlan } from "@/lib/growth/usePreviewGrowthPlan";
import { createPublicAssessment, readByClaimToken, runAiAnalysis } from "@/lib/growth/api";
import type { AnswerMap, GrowthAssessmentRow } from "@/lib/growth/types";
import { toast } from "sonner";

export const PENDING_CLAIM_KEY = "boostmate:pending_growth_claim";

type Phase = "intro" | "wizard" | "analyzing" | "result";

interface Props {
  /** `page` shows the intro headline first; `embedded` starts on the wizard. */
  variant?: "page" | "embedded";
}

export default function AssessmentFlow({ variant = "page" }: Props) {
  const { t, i18n } = useTranslation();

  const [phase, setPhase] = useState<Phase>(variant === "page" ? "intro" : "wizard");
  const [row, setRow] = useState<GrowthAssessmentRow | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { loading: previewLoading, plan: previewPlan } = usePreviewGrowthPlan(
    phase === "result" ? row : null,
  );

  const handleSubmit = async (answers: AnswerMap) => {
    setSubmitting(true);
    setPhase("analyzing");
    try {
      const created = await createPublicAssessment(answers);
      setClaimToken(created.claim_token);
      try {
        await runAiAnalysis(created.id, { claimToken: created.claim_token, language: i18n.language });
      } catch (e) {
        console.warn("AI analysis failed, falling back to deterministic-only result", e);
      }
      const fresh = await readByClaimToken(created.claim_token);
      setRow(fresh);
      setPhase("result");
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Please try again.");
      setPhase("wizard");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = () => {
    if (!claimToken) return;
    // Persist so the Dashboard can claim the assessment after signup redirect.
    try {
      sessionStorage.setItem(PENDING_CLAIM_KEY, claimToken);
      localStorage.setItem(PENDING_CLAIM_KEY, claimToken);
    } catch { /* ignore storage errors */ }
    setShowAuth(true);
  };

  const cta = (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10 text-center">
      <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
        {t("growth.ctaHeadline")}
      </h2>
      <p className="text-muted-foreground max-w-xl mx-auto mb-6">
        {t("growth.ctaBody")}
      </p>
      <ul className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center mb-8 text-sm text-foreground">
        {[t("growth.ctaBullet1"), t("growth.ctaBullet2"), t("growth.ctaBullet3")].map((b) => (
          <li key={b} className="flex items-center gap-2 justify-center">
            <Check className="w-4 h-4 text-primary shrink-0" />
            {b}
          </li>
        ))}
      </ul>
      <Button size="lg" className="h-12 px-8 text-base" onClick={handleCreateAccount}>
        {t("growth.createAccountCtaButton")}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
      <p className="text-xs text-muted-foreground mt-3">{t("growth.createAccountCta")}</p>
    </div>
  );

  return (
    <>
      {phase === "intro" && (
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t("growth.publicTitle")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            {t("growth.publicSubtitle")}
          </p>
          <Button size="lg" onClick={() => setPhase("wizard")}>
            {t("growth.start")}
          </Button>
        </div>
      )}

      {phase === "wizard" && (
        <AssessmentWizard submitting={submitting} onSubmit={handleSubmit} />
      )}

      {phase === "analyzing" && (
        <div className="text-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("growth.loading")}</p>
        </div>
      )}

      {phase === "result" && row && (
        <div className="space-y-6">
          <AssessmentResult row={row} />
          <GrowthPlanPanel
            mode="preview"
            subAccountId={null}
            assessment={row}
            loading={previewLoading}
            plan={previewPlan}
            workspaceState={{}}
            previewCta={cta}
          />
        </div>
      )}

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
        defaultMode="signup"
      />
    </>
  );
}
