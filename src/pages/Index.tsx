import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo-boostmate.svg";
import AuditWizard from "@/components/audit/AuditWizard";
import AnalyzingScreen from "@/components/audit/AnalyzingScreen";
import AuditResults from "@/components/audit/AuditResults";
import AuthModal from "@/components/auth/AuthModal";
import { AuditFormData } from "@/types/audit";
import { mockResult } from "@/components/audit/mockAuditData";
import { scrapeLandingPage } from "@/lib/api/firecrawl";
import { createSalesCopyFromMarkdown } from "@/lib/api/createSalesCopyFromMarkdown";

type Phase = "wizard" | "analyzing" | "results";

const Index = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [formData, setFormData] = useState<AuditFormData | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [screenshot, setScreenshot] = useState("");
  const [pageContent, setPageContent] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleWizardComplete = async (data: AuditFormData) => {
    setFormData(data);
    setPhase("analyzing");

    // Scrape landing page in background
    const scrapePromise = scrapeLandingPage(data.landingPageUrl);

    const scrapeResult = await scrapePromise;
    setScreenshot(scrapeResult.screenshot);
    setPageContent(scrapeResult.markdown);

    setPhase("results");
  };

  const saveAuditAndRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !formData) return;

    const { data: project } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: t("projects.defaultName") })
      .select()
      .single();

    await supabase.from("audits").insert({
      user_id: user.id,
      target_audience: formData.targetAudience,
      offer: formData.offer,
      landing_page_url: formData.landingPageUrl,
      traffic_source: formData.trafficSource,
      monthly_traffic: formData.monthlyTraffic,
      conversion_rate: formData.conversionRate,
      funnel_strategy: formData.funnelStrategy,
      email: formData.email,
      score: mockResult.score,
      result: mockResult as any,
      landing_page_screenshot: screenshot,
      landing_page_content: pageContent,
    });

    navigate("/dashboard?module=funnel-audit");
  };

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    await saveAuditAndRedirect();
  };

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

      <main className="container max-w-5xl mx-auto px-4 py-12">
        {phase === "wizard" && (
          <div className="animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold text-foreground mb-3">{t("audit.title")}</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">{t("audit.subtitle")}</p>
            </div>
            <AuditWizard onComplete={handleWizardComplete} />
          </div>
        )}
        {phase === "analyzing" && <AnalyzingScreen />}
        {phase === "results" && (
          <AuditResults
            result={mockResult}
            onCreateAccount={() => setShowAuth(true)}
            landingPageScreenshot={screenshot}
          />
        )}
      </main>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} defaultEmail={formData?.email || ""} defaultMode="login" />
    </div>
  );
};

export default Index;
