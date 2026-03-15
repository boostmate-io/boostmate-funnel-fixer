import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProgressBar from "./ProgressBar";
import { AuditFormData, initialFormData } from "@/types/audit";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface StepConfig {
  field: keyof AuditFormData;
  label: string;
  placeholder: string;
  type: "input" | "textarea" | "url" | "email";
}

const steps: StepConfig[] = [
  { field: "targetAudience", label: "Wie is je doelpubliek?", placeholder: "Bijv. Coaches die hun online programma willen lanceren...", type: "textarea" },
  { field: "offer", label: "Wat is je aanbod?", placeholder: "Bijv. Een 12-weeks groepsprogramma voor €2.497...", type: "textarea" },
  { field: "landingPageUrl", label: "Wat is je landingspagina URL?", placeholder: "https://jouw-website.com/aanbod", type: "url" },
  { field: "trafficSource", label: "Waar komt je verkeer vandaan?", placeholder: "Bijv. Facebook Ads, Instagram organisch, Google...", type: "input" },
  { field: "monthlyTraffic", label: "Hoeveel verkeer krijg je per maand?", placeholder: "Bijv. 5.000 bezoekers", type: "input" },
  { field: "conversionRate", label: "Wat is je huidige conversieratio?", placeholder: "Bijv. 2%", type: "input" },
  { field: "funnelStrategy", label: "Leg je huidige funnel strategie uit", placeholder: "Beschrijf de stappen die een prospect doorloopt van eerste contact tot aankoop...", type: "textarea" },
  { field: "email", label: "Wat is je e-mailadres?", placeholder: "jouw@email.com", type: "email" },
];

interface AuditWizardProps {
  onComplete: (data: AuditFormData) => void;
}

const AuditWizard = ({ onComplete }: AuditWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AuditFormData>(initialFormData);
  const [error, setError] = useState("");

  const step = steps[currentStep];
  const value = formData[step.field];
  const isLastStep = currentStep === steps.length - 1;

  const validate = () => {
    if (!value.trim()) {
      setError("Dit veld is verplicht");
      return false;
    }
    if (step.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Vul een geldig e-mailadres in");
      return false;
    }
    if (step.type === "url" && !/^https?:\/\/.+\..+/.test(value)) {
      setError("Vul een geldige URL in (start met https://)");
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
          {step.label}
        </label>

        {step.type === "textarea" ? (
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={step.placeholder}
            className="text-base min-h-[120px] border-border focus:ring-2 focus:ring-primary/30 animate-slide-in-right"
            autoFocus
          />
        ) : (
          <Input
            type={step.type === "url" ? "url" : step.type === "email" ? "email" : "text"}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={step.placeholder}
            className="h-12 text-base border-border focus:ring-2 focus:ring-primary/30 animate-slide-in-right"
            autoFocus
          />
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex justify-between mt-8">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Vorige
        </Button>
        <Button onClick={handleNext} size="lg" className="gap-2">
          {isLastStep ? "Analyseer mijn funnel" : "Volgende"} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AuditWizard;
