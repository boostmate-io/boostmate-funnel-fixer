import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AuditWizard from "./AuditWizard";
import AnalyzingScreen from "./AnalyzingScreen";
import AuditResults from "./AuditResults";
import { AuditFormData, AuditResult } from "@/types/audit";
import { mockResult } from "./mockAuditData";
import { scrapeLandingPage } from "@/lib/api/firecrawl";
import { analyzeAudit, createSalesCopyAsset, createFunnelFromAnalysis } from "@/lib/api/auditAnalysis";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Phase = "wizard" | "analyzing" | "results";

interface DashboardAuditWizardProps {
  onBack: () => void;
  onComplete: () => void;
}

const DashboardAuditWizard = ({ onBack, onComplete }: DashboardAuditWizardProps) => {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [formData, setFormData] = useState<AuditFormData | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [screenshot, setScreenshot] = useState("");
  const analyzeStarted = useRef(false);

  const saveAudit = async (data: AuditFormData, result: AuditResult, screenshotUrl: string, content: string) => {
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
      landing_page_screenshot: screenshotUrl,
      landing_page_content: content,
    });

    if (error) {
      console.error("Error saving audit:", error);
      toast.error(t("auditModule.saveError"));
    }
  };

  const handleWizardComplete = async (data: AuditFormData) => {
    setFormData(data);
    setPhase("analyzing");
    analyzeStarted.current = true;

    const scrapeResult = await scrapeLandingPage(data.landingPageUrl);
    setScreenshot(scrapeResult.screenshot);

    const [analysis] = await Promise.all([
      analyzeAudit(scrapeResult.screenshot, scrapeResult.markdown, data.funnelStrategy, data.trafficSource),
      saveAudit(data, mockResult, scrapeResult.screenshot, scrapeResult.markdown),
    ]);

    const realResult: AuditResult = {
      ...mockResult,
      currentFunnel: analysis.nodes.length > 0
        ? { nodes: analysis.nodes as any, edges: analysis.edges as any }
        : mockResult.currentFunnel,
    };
    setAuditResult(realResult);

    if (user) {
      const projectId = activeProject?.id || null;
      const domain = data.landingPageUrl.replace(/^https?:\/\//, "").split("/")[0];

      const assetId = await createSalesCopyAsset(
        user.id,
        projectId,
        `Sales Copy - ${domain}`,
        analysis.sections
      );

      await createFunnelFromAnalysis(
        user.id,
        projectId,
        `Funnel - ${domain}`,
        analysis.nodes,
        analysis.edges,
        assetId
      );
    }

    setPhase("results");
  };

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
          <AuditWizard onComplete={handleWizardComplete} hideEmailStep />
        </div>
      )}

      {phase === "analyzing" && <AnalyzingScreen />}

      {phase === "results" && auditResult && (
        <div>
          <Button variant="ghost" onClick={onComplete} className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" /> {t("auditModule.backToList")}
          </Button>
          <AuditResults
            result={auditResult}
            onCreateAccount={() => {}}
            showCta={false}
            landingPageScreenshot={screenshot}
          />
        </div>
      )}
    </div>
  );
};

export default DashboardAuditWizard;
