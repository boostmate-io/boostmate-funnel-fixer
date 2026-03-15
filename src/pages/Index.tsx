import { useState } from "react";
import AuditWizard from "@/components/audit/AuditWizard";
import AnalyzingScreen from "@/components/audit/AnalyzingScreen";
import AuditResults from "@/components/audit/AuditResults";
import AuthModal from "@/components/auth/AuthModal";
import { AuditFormData, AuditResult } from "@/types/audit";
import { useNavigate } from "react-router-dom";

const mockResult: AuditResult = {
  score: 42,
  positives: [
    "Je hebt een duidelijk gedefinieerd aanbod",
    "Je genereert consistent verkeer naar je pagina",
    "Je gebruikt e-mail als opvolgkanaal",
  ],
  conversionLeaks: [
    {
      title: "Onduidelijke waardepropositie boven de vouw",
      description: "Bezoekers begrijpen binnen 5 seconden niet wat je aanbod is en waarom het voor hen relevant is.",
      fix: "Herschrijf je headline met een specifiek resultaat + tijdsframe. Bijv: 'Lanceer je online programma in 8 weken — zonder techstress.'",
    },
    {
      title: "Geen sociaal bewijs zichtbaar",
      description: "Er ontbreken testimonials, case studies of resultaten die vertrouwen opbouwen.",
      fix: "Voeg minimaal 3 testimonials toe met naam, foto en specifiek resultaat direct onder je aanbod.",
    },
    {
      title: "Te veel stappen naar de conversie",
      description: "Je funnel heeft te veel frictiepunten waardoor leads afhaken voordat ze actie ondernemen.",
      fix: "Vereenvoudig je funnel tot maximaal 3 stappen: Ad → Landing Page → Booking/Checkout.",
    },
  ],
  currentStrategy: {
    summary: "Je gebruikt momenteel een multi-step funnel met een webinar als tussenconversie.",
    problems: [
      "Webinar show-up rate is typisch laag (15-25%)",
      "Te lange sales cycle voor een aanbod onder €5.000",
      "Geen urgentie of schaarste ingebouwd",
    ],
  },
  optimizedStrategy: {
    summary: "Een directe VSL-funnel met een strategiegesprek als conversie-event levert snellere resultaten.",
    steps: [
      "Vervang het webinar door een 15-min Video Sales Letter",
      "Voeg een geautomatiseerde booking-flow toe na de VSL",
      "Implementeer een 3-staps e-mail nurture voor no-shows",
      "Gebruik retargeting ads voor paginabezoekers die niet booken",
    ],
  },
};

type Phase = "wizard" | "analyzing" | "results";

const Index = () => {
  const [phase, setPhase] = useState<Phase>("wizard");
  const [formData, setFormData] = useState<AuditFormData | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const handleWizardComplete = (data: AuditFormData) => {
    setFormData(data);
    setPhase("analyzing");
    setTimeout(() => setPhase("results"), 4000);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-foreground">
            <span className="text-primary">Boost</span>mate
          </h1>
          <button
            onClick={() => setShowAuth(true)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Inloggen
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-5xl mx-auto px-4 py-12">
        {phase === "wizard" && (
          <div className="animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold text-foreground mb-3">
                Gratis Funnel Audit
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Ontdek waarom je funnel niet converteert en krijg een concrete strategie om meer klanten te winnen.
              </p>
            </div>
            <AuditWizard onComplete={handleWizardComplete} />
          </div>
        )}

        {phase === "analyzing" && <AnalyzingScreen />}

        {phase === "results" && (
          <AuditResults
            result={mockResult}
            onCreateAccount={() => setShowAuth(true)}
          />
        )}
      </main>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
        defaultEmail={formData?.email || ""}
      />
    </div>
  );
};

export default Index;
