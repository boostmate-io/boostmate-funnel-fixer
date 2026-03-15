import { useTranslation } from "react-i18next";
import ScoreGauge from "./ScoreGauge";
import { AuditResult } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, Target } from "lucide-react";

interface AuditResultsProps {
  result: AuditResult;
  onCreateAccount: () => void;
  showCta?: boolean;
}

const AuditResults = ({ result, onCreateAccount, showCta = true }: AuditResultsProps) => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-display font-bold text-foreground mb-6">{t("results.title")}</h2>
        <ScoreGauge score={result.score} />
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-card">
        <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-success" /> {t("results.positives")}
        </h3>
        <ul className="space-y-2">
          {result.positives.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-success mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-card">
        <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" /> {t("results.leaks")}
        </h3>
        <div className="space-y-4">
          {result.conversionLeaks.map((leak, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-1">{i + 1}. {leak.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{leak.description}</p>
              <div className="flex items-start gap-2 bg-secondary/50 rounded-md p-3">
                <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground"><strong>{t("results.fix")}:</strong> {leak.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-muted-foreground" /> {t("results.currentStrategy")}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{result.currentStrategy.summary}</p>
          <ul className="space-y-2">
            {result.currentStrategy.problems.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card rounded-xl border border-primary/20 p-6 shadow-card">
          <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-primary" /> {t("results.optimizedStrategy")}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{result.optimizedStrategy.summary}</p>
          <ul className="space-y-2">
            {result.optimizedStrategy.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" /> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showCta && (
        <div className="text-center bg-secondary/50 rounded-xl p-8 border border-border">
          <h3 className="text-xl font-display font-bold text-foreground mb-2">{t("results.ctaTitle")}</h3>
          <p className="text-muted-foreground mb-6">{t("results.ctaDescription")}</p>
          <Button variant="hero" size="xl" onClick={onCreateAccount} className="gap-2">
            {t("results.ctaButton")} <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditResults;
