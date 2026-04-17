import { useState } from "react";
import { Sparkles, Lightbulb, Wand2, MessageSquare, Check, TrendingUp, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  calculateSubBlockProgress,
  CLARITY_FIELDS,
  type ClaritySubBlock,
  type CustomerClarityData,
} from "./types";
import { CLARITY_CONFIG, getConfig, getFeedbackMessage, type FieldDef } from "./clarityConfig";
import ChipsField from "./fields/ChipsField";
import TagsField from "./fields/TagsField";
import CoachPanel from "./CoachPanel";
import ExamplesDialog from "./ExamplesDialog";

interface Props {
  data: CustomerClarityData;
  onChange: (patch: Partial<CustomerClarityData>) => void;
  saving: boolean;
}

const renderField = (
  field: FieldDef,
  value: string,
  onChange: (v: string) => void,
) => {
  switch (field.type) {
    case "chips-single":
      return <ChipsField value={value} onChange={onChange} options={field.options || []} />;
    case "tags":
      return <TagsField value={value} onChange={onChange} placeholder={field.placeholder} />;
    case "textarea":
    default:
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows || 3}
          className="resize-none"
        />
      );
  }
};

const CustomerClaritySection = ({ data, onChange, saving }: Props) => {
  const [active, setActive] = useState<ClaritySubBlock>("avatar");
  const [coachOpen, setCoachOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);

  const config = getConfig(active);
  const Icon = config.icon;
  const fields = CLARITY_FIELDS[active];
  const filledCount = fields.filter((f) => (data[f] || "").toString().trim().length > 0).length;
  const progress = calculateSubBlockProgress(data, active);
  const feedback = getFeedbackMessage(config, progress);

  const handleCoachSubmit = (answers: Record<string, string>) => {
    toast.info("Coach mode — AI suggestions coming soon", {
      description: `Captured ${Object.keys(answers).filter((k) => answers[k]?.trim()).length} answers.`,
    });
  };

  const handleImproveConfirm = () => {
    setImproveOpen(false);
    toast.info("Improve Answers — AI rewrites coming soon");
  };

  const handleGenerateDraft = () => {
    toast.info("Generate Draft — AI generation coming soon");
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
          {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
        </div>

        {/* Horizontal sub-tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {CLARITY_CONFIG.map((sb) => {
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

        {/* Content card */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-muted/20 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {filledCount} / {fields.length}
              </span>
              <span>fields completed</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handleGenerateDraft}>
                <Wand2 className="w-3.5 h-3.5" />
                Generate Draft
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setCoachOpen(true)}>
                <MessageSquare className="w-3.5 h-3.5" />
                Coach Me
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={() => setImproveOpen(true)}
                disabled={filledCount === 0}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Improve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={() => setExamplesOpen(true)}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Examples
              </Button>
            </div>
          </div>

          {/* Fields grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {config.fields.map((field) => (
              <div
                key={field.key as string}
                className={`space-y-2 ${field.fullWidth ? "lg:col-span-2" : ""}`}
              >
                <Label className="text-sm font-semibold text-foreground">{field.label}</Label>
                {renderField(
                  field,
                  (data[field.key] as string) || "",
                  (v) => onChange({ [field.key]: v } as Partial<CustomerClarityData>),
                )}
                {field.helper && <p className="text-xs text-muted-foreground">{field.helper}</p>}
              </div>
            ))}
          </div>

          {/* Feedback strip */}
          {feedback && (
            <div className="px-6 py-3 border-t border-border bg-primary/5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm text-primary font-medium">{feedback}</p>
            </div>
          )}
        </div>

        {/* Sub-block progress bar */}
        <div className="mt-4 px-1">
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Coach panel */}
      <CoachPanel
        open={coachOpen}
        onOpenChange={setCoachOpen}
        title={config.label}
        questions={config.coachQuestions}
        onSubmit={handleCoachSubmit}
      />

      {/* Examples dialog */}
      <ExamplesDialog
        open={examplesOpen}
        onOpenChange={setExamplesOpen}
        title={config.label}
        examples={config.examples}
      />

      {/* Improve confirm */}
      <AlertDialog open={improveOpen} onOpenChange={setImproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Improve your answers?</AlertDialogTitle>
            <AlertDialogDescription>
              AI will rewrite your existing answers to be clearer, more specific, and more strategic.
              You'll be able to review changes before they replace anything.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImproveConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerClaritySection;
