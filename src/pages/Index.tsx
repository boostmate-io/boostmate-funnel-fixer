import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo-boostmate.svg";
import AuditWizard from "@/components/audit/AuditWizard";
import AnalyzingScreen from "@/components/audit/AnalyzingScreen";
import AuditResults from "@/components/audit/AuditResults";
import AuthModal from "@/components/auth/AuthModal";
import { AuditFormData, AuditResult } from "@/types/audit";

const mockResult: AuditResult = {
  score: 42,
  positives: [
    "You have a clearly defined offer",
    "You're generating consistent traffic to your page",
    "You're using email as a follow-up channel",
  ],
  conversionLeaks: [
    {
      title: "Unclear value proposition above the fold",
      description: "Visitors don't understand within 5 seconds what your offer is and why it's relevant to them.",
      fix: "Rewrite your headline with a specific result + timeframe.",
    },
    {
      title: "No social proof visible",
      description: "Testimonials, case studies or results that build trust are missing.",
      fix: "Add at least 3 testimonials with name, photo and specific result.",
    },
    {
      title: "Too many steps to conversion",
      description: "Your funnel has too many friction points causing leads to drop off.",
      fix: "Simplify your funnel to maximum 3 steps.",
    },
  ],
  currentStrategy: {
    summary: "You're currently using a multi-step funnel with a webinar as an intermediate conversion.",
    problems: [
      "Webinar show-up rate is typically low (15-25%)",
      "Too long a sales cycle for an offer under €5,000",
      "No urgency or scarcity built in",
    ],
  },
  optimizedStrategy: {
    summary: "A direct VSL funnel with a strategy call as conversion event delivers faster results.",
    steps: [
      "Replace the webinar with a 15-min Video Sales Letter",
      "Add an automated booking flow after the VSL",
      "Implement a 3-step email nurture for no-shows",
      "Use retargeting ads for page visitors who don't book",
    ],
  },
};

type Phase = "wizard" | "analyzing" | "results";

const Index = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [formData, setFormData] = useState<AuditFormData | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const handleWizardComplete = (data: AuditFormData) => {
    setFormData(data);
    setPhase("analyzing");
    setTimeout(() => setPhase("results"), 4000);
  };

  const saveAuditAndRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !formData) return;

    // Create a default project for the new user
    const { data: project } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: t("projects.defaultName") })
      .select()
      .single();

    // Save the audit
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
    });

    // Navigate to audit module in dashboard
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
        {phase === "results" && <AuditResults result={mockResult} onCreateAccount={() => setShowAuth(true)} />}
      </main>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} defaultEmail={formData?.email || ""} />
    </div>
  );
};

export default Index;
