import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import logo from "@/assets/logo-boostmate.svg";
import AuthModal from "@/components/auth/AuthModal";
import AssessmentFlow from "@/components/growth/AssessmentFlow";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Marketing homepage. The lead magnet is the Growth Assessment & Roadmap
 * (shared `AssessmentFlow`, identical to `/assessment`). The legacy Funnel
 * Audit wizard is deprecated and no longer hooked up here.
 */
const Index = () => {
  const { t } = useTranslation();
  const { user, isReady } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const nextParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  useEffect(() => {
    if (safeNext && isReady && !user) setShowAuth(true);
  }, [safeNext, isReady, user]);

  if (isReady && user) return <Navigate to={safeNext ?? "/dashboard"} replace />;

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

export default Index;
