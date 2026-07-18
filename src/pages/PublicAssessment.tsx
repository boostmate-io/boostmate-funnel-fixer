import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-boostmate.svg";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/auth/AuthModal";
import AssessmentWizard from "@/components/growth/AssessmentWizard";
import AssessmentResult from "@/components/growth/AssessmentResult";
import { createPublicAssessment, readByClaimToken, runAiAnalysis } from "@/lib/growth/api";
import type { AnswerMap, GrowthAssessmentRow } from "@/lib/growth/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Phase = "intro" | "wizard" | "analyzing" | "result";

const PENDING_CLAIM_KEY = "boostmate:pending_growth_claim";

const PublicAssessment = () => {
  const { t, i18n } = useTranslation();
  const { user, isReady } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("intro");
  const [row, setRow] = useState<GrowthAssessmentRow | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect authenticated users to their internal roadmap. Kept in a useEffect
  // (not an early return between hooks) so hook order stays stable across the
  // auth-loading -> authenticated transition — the previous early-return caused
  // a blank screen when auth flipped ready+user mid-render.
  useEffect(() => {
    if (isReady && user) {
      navigate("/dashboard?module=growth-roadmap", { replace: true });
    }
  }, [isReady, user, navigate]);

  const handleSubmit = async (answers: AnswerMap) => {
    setSubmitting(true);
    setPhase("analyzing");
    try {
      const created = await createPublicAssessment(answers);
      setClaimToken(created.claim_token);
      // Fire AI analysis; ignore errors and continue with the deterministic result.
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
    // Persist so Dashboard can claim after signup redirect.
    try {
      sessionStorage.setItem(PENDING_CLAIM_KEY, claimToken);
      localStorage.setItem(PENDING_CLAIM_KEY, claimToken);
    } catch { /* ignore storage errors */ }
    setShowAuth(true);
  };

  // While auth is still resolving, or an authenticated user is about to be
  // redirected, render a neutral loader instead of the public intro.
  if (!isReady || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Boostmate" className="h-8" />
          <button onClick={() => setShowAuth(true)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("header.login")}
          </button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-12">
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
          <AssessmentResult
            row={row}
            ctaSlot={
              <div className="bg-primary/5 border border-primary/30 rounded-xl p-6 text-center">
                <p className="text-foreground mb-4">{t("growth.createAccountCta")}</p>
                <Button size="lg" onClick={handleCreateAccount}>
                  {t("growth.createAccountCtaButton")}
                </Button>
              </div>
            }
          />
        )}
      </main>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
        defaultMode="signup"
      />
    </div>
  );
};

export default PublicAssessment;
