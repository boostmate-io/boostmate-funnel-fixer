import ScoreGauge from "./ScoreGauge";
import { AuditResult } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, Target } from "lucide-react";

interface AuditResultsProps {
  result: AuditResult;
  onCreateAccount: () => void;
}

const AuditResults = ({ result, onCreateAccount }: AuditResultsProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Score */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-display font-bold text-foreground mb-6">
          Jouw Funnel Score
        </h2>
        <ScoreGauge score={result.score} />
      </div>

      {/* What's going well */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-card">
        <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-success" /> Wat gaat er goed
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

      {/* Conversion Leaks */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-card">
        <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" /> Top 3 Conversie Lekken
        </h3>
        <div className="space-y-4">
          {result.conversionLeaks.map((leak, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-1">{i + 1}. {leak.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{leak.description}</p>
              <div className="flex items-start gap-2 bg-secondary/50 rounded-md p-3">
                <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground"><strong>Fix:</strong> {leak.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Analysis */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-muted-foreground" /> Huidige Strategie
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{result.currentStrategy.summary}</p>
          <ul className="space-y-2">
            {result.currentStrategy.problems.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card rounded-xl border border-primary/20 p-6 shadow-card">
          <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-primary" /> Geoptimaliseerde Strategie
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{result.optimizedStrategy.summary}</p>
          <ul className="space-y-2">
            {result.optimizedStrategy.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-secondary/50 rounded-xl p-8 border border-border">
        <h3 className="text-xl font-display font-bold text-foreground mb-2">
          Wil je een volledige geoptimaliseerde customer journey?
        </h3>
        <p className="text-muted-foreground mb-6">
          Maak een gratis account aan om je audit te bewaren en een complete funnel strategie te ontwerpen.
        </p>
        <Button variant="hero" size="xl" onClick={onCreateAccount} className="gap-2">
          Gratis account aanmaken <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default AuditResults;
