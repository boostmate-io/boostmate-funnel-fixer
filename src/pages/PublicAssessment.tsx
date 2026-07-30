import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-boostmate.svg";
import AuthModal from "@/components/auth/AuthModal";
import AssessmentFlow from "@/components/growth/AssessmentFlow";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Public `/assessment` page — thin shell around the shared `AssessmentFlow`
 * (same component the marketing homepage embeds).
 */
const PublicAssessment = () => {
  const { t } = useTranslation();
  const { user, isReady } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  // Redirect authenticated users to their internal roadmap. Kept in a useEffect
  // (not an early return between hooks) so hook order stays stable across the
  // auth-loading -> authenticated transition.
  useEffect(() => {
    if (isReady && user) {
      navigate("/dashboard?module=growth-roadmap", { replace: true });
    }
  }, [isReady, user, navigate]);

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
        <AssessmentFlow variant="page" />
      </main>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
        defaultMode="login"
      />
    </div>
  );
};

export default PublicAssessment;

