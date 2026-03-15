import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProgressBar from "./ProgressBar";
import { AuditFormData, initialFormData } from "@/types/audit";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface StepConfig {
  field: keyof AuditFormData;
  labelKey: string;
  placeholderKey: string;
  type: "input" | "textarea" | "url" | "email";
}

const allSteps: StepConfig[] = [
  { field: "targetAudience", labelKey: "audit.questions.targetAudience", placeholderKey: "audit.questions.targetAudiencePlaceholder", type: "textarea" },
  { field: "offer", labelKey: "audit.questions.offer", placeholderKey: "audit.questions.offerPlaceholder", type: "textarea" },
  { field: "landingPageUrl", labelKey: "audit.questions.landingPageUrl", placeholderKey: "audit.questions.landingPageUrlPlaceholder", type: "url" },
  { field: "trafficSource", labelKey: "audit.questions.trafficSource", placeholderKey: "audit.questions.trafficSourcePlaceholder", type: "input" },
  { field: "monthlyTraffic", labelKey: "audit.questions.monthlyTraffic", placeholderKey: "audit.questions.monthlyTrafficPlaceholder", type: "input" },
  { field: "conversionRate", labelKey: "audit.questions.conversionRate", placeholderKey: "audit.questions.conversionRatePlaceholder", type: "input" },
  { field: "funnelStrategy", labelKey: "audit.questions.funnelStrategy", placeholderKey: "audit.questions.funnelStrategyPlaceholder", type: "textarea" },
  { field: "email", labelKey: "audit.questions.email", placeholderKey: "audit.questions.emailPlaceholder", type: "email" },
];

interface AuditWizardProps {
  onComplete: (data: AuditFormData) => void;
  hideEmailStep?: boolean;
}

const AuditWizard = ({ onComplete, hideEmailStep = false }: AuditWizardProps) => {
  const { t } = useTranslation();
  const steps = hideEmailStep ? allSteps.filter(s => s.field !== "email") : allSteps;
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AuditFormData>(initialFormData);
  const [error, setError] = useState("");

  const step = steps[currentStep];
  const value = formData[step.field];
  const isLastStep = currentStep === steps.length - 1;

  const validate = () => {
    if (!value.trim()) {
      setError(t("audit.required"));
      return false;
    }
    if (step.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(t("audit.invalidEmail"));
      return false;
    }
    if (step.type === "url" && !/^https?:\/\/.+\..+/.test(value)) {
      setError(t("audit.invalidUrl"));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    if (!validate()) return;
    if (isLastStep) {
      onComplete(formData);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleChange = (val: string) => {
    setError("");
    setFormData((prev) => ({ ...prev, [step.field]: val }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step.type !== "textarea") {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in">
      <ProgressBar currentStep={currentStep + 1} totalSteps={steps.length} />

      <div className="mt-10" key={currentStep}>
        <label className="block text-xl font-display font-bold text-foreground mb-4">
          {t(step.labelKey)}
        </label>

        {step.type === "textarea" ? (
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t(step.placeholderKey)}
            className="text-base min-h-[120px] border-border focus:ring-2 focus:ring-primary/30 animate-slide-in-right"
            autoFocus
          />
        ) : (
          <Input
            type={step.type === "url" ? "url" : step.type === "email" ? "email" : "text"}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(step.placeholderKey)}
            className="h-12 text-base border-border focus:ring-2 focus:ring-primary/30 animate-slide-in-right"
            autoFocus
          />
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> {t("audit.previous")}
        </Button>
        <Button onClick={handleNext} size="lg" className="gap-2">
          {isLastStep ? t("audit.analyze") : t("audit.next")} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AuditWizard;
