import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AuditWizard from "./AuditWizard";
import AnalyzingScreen from "./AnalyzingScreen";
import AuditResults from "./AuditResults";
import { AuditFormData, AuditResult } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

interface DashboardAuditWizardProps {
  onBack: () => void;
  onComplete: () => void;
  initialData?: AuditFormData | null;
}

const DashboardAuditWizard = ({ onBack, onComplete, initialData }: DashboardAuditWizardProps) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>(initialData ? "analyzing" : "wizard");
  const [formData, setFormData] = useState<AuditFormData | null>(initialData || null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  const saveAudit = async (data: AuditFormData, result: AuditResult) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("audits").insert({
      user_id: user.id,
      target_audience: data.targetAudience,
      offer: data.offer,
      landing_page_url: data.landingPageUrl,
      traffic_source: data.trafficSource,
      monthly_traffic: data.monthlyTraffic,
      conversion_rate: data.conversionRate,
      funnel_strategy: data.funnelStrategy,
      email: data.email,
      score: result.score,
      result: result as any,
    });

    if (error) {
      console.error("Error saving audit:", error);
      toast.error(t("auditModule.saveError"));
    }
  };

  const handleWizardComplete = (data: AuditFormData) => {
    setFormData(data);
    setPhase("analyzing");

    // Mock: simulate analysis, then save
    setTimeout(async () => {
      setAuditResult(mockResult);
      await saveAudit(data, mockResult);
      setPhase("results");
    }, 4000);
  };

  // If initialData was passed (from public flow), start analyzing
  if (initialData && phase === "analyzing" && !auditResult) {
    setTimeout(async () => {
      setAuditResult(mockResult);
      if (formData) await saveAudit(formData, mockResult);
      setPhase("results");
    }, 4000);
  }

  return (
    <div>
      {phase === "wizard" && (
        <div>
          <Button variant="ghost" onClick={onBack} className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" /> {t("auditModule.backToList")}
          </Button>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              {t("auditModule.newAudit.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("auditModule.newAudit.description")}
            </p>
          </div>
          <AuditWizard onComplete={handleWizardComplete} />
        </div>
      )}

      {phase === "analyzing" && <AnalyzingScreen />}

      {phase === "results" && auditResult && (
        <div>
          <Button variant="ghost" onClick={onComplete} className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" /> {t("auditModule.backToList")}
          </Button>
          <AuditResults result={auditResult} onCreateAccount={() => {}} showCta={false} />
        </div>
      )}
    </div>
  );
};

export default DashboardAuditWizard;
