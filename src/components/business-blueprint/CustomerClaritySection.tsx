import { useMemo, useState } from "react";
import { Check, TrendingUp, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  calculateSubBlockProgress,
  CLARITY_FIELDS,
  type ClaritySubBlock,
  type CustomerClarityData,
} from "./types";
import { getClarityConfig, getFeedbackMessage } from "./clarityConfig";
import { getBusinessType } from "./businessTypes";
import CoachPanel from "./CoachPanel";
import FieldCard from "./FieldCard";

interface Props {
  data: CustomerClarityData;
  onChange: (patch: Partial<CustomerClarityData>) => void;
  saving: boolean;
  businessType?: string;
}

const CustomerClaritySection = ({ data, onChange, saving, businessType }: Props) => {
  const [active, setActive] = useState<ClaritySubBlock>("avatar");
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachFieldLabel, setCoachFieldLabel] = useState<string | null>(null);

  const bt = getBusinessType(businessType);
  const clarityConfig = useMemo(() => getClarityConfig(businessType), [businessType]);
  const config = clarityConfig.find((c) => c.id === active)!;
  const Icon = config.icon;
  const fields = CLARITY_FIELDS[active];
  const filledCount = fields.filter((f) => (data[f] || "").toString().trim().length > 0).length;
  const progress = calculateSubBlockProgress(data, active);
  const feedback = getFeedbackMessage(config, progress);

  const handleCoachSubmit = (answers: Record<string, string>) => {
    toast.info("AI suggestions coming soon", {
      description: `Captured ${Object.keys(answers).filter((k) => answers[k]?.trim()).length} answers.`,
    });
  };

  const openCoachFor = (label: string) => {
    setCoachFieldLabel(label);
    setCoachOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-display font-bold text-foreground">{config.label}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
          </div>
        </div>

        {/* Horizontal sub-tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {clarityConfig.map((sb) => {
              const sbProgress = calculateSubBlockProgress(data, sb.id);
              const isActive = active === sb.id;
              const SbIcon = sb.icon;
              const isComplete = sbProgress === 100;
              return (
                <button
                  key={sb.id}
                  onClick={() => setActive(sb.id)}
                  className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <SbIcon className="w-4 h-4" />
                  <span>{sb.label}</span>
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <span
                      className={`text-[10px] tabular-nums ${
                        isActive ? "text-primary/70" : "text-muted-foreground/70"
                      }`}
                    >
                      {sbProgress}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Insight box */}
        <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-4 flex gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">
              Why this matters
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{config.insight}</p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground px-1">
          <span className="font-semibold tabular-nums text-foreground">
            {filledCount} / {fields.length}
          </span>
          <span>fields completed</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="tabular-nums">{progress}%</span>
        </div>

        {/* Modular field cards grid */}
        <div className="space-y-4">
          {config.fields.map((field) => (
            <div
              key={field.key as string}
              className={field.fullWidth ? "lg:col-span-2" : ""}
            >
              <FieldCard
                field={field}
                value={(data[field.key] as string) || ""}
                onChange={(v) => onChange({ [field.key]: v } as Partial<CustomerClarityData>)}
                onCoach={() => openCoachFor(field.label)}
              />
            </div>
          ))}
        </div>

        {/* Feedback strip */}
        {feedback && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-primary font-medium">{feedback}</p>
          </div>
        )}

        {/* Sub-block progress bar */}
        <div className="mt-4 px-1">
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Coach panel */}
      <CoachPanel
        open={coachOpen}
        onOpenChange={(o) => {
          setCoachOpen(o);
          if (!o) setCoachFieldLabel(null);
        }}
        title={coachFieldLabel ?? config.label}
        questions={config.coachQuestions}
        onSubmit={handleCoachSubmit}
      />
    </div>
  );
};

export default CustomerClaritySection;
