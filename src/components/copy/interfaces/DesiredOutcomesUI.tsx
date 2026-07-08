import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RotateCw, Loader2, Check } from "lucide-react";
import { executeAIAction } from "@/lib/api/aiActions";
import { buildCopyExtraInstructions } from "@/lib/copy/headlineInstructions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  componentSlug: string;
  aiActionSlug: string;
  componentInstructions: string;
  headlineInstructions?: string;
  context: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  outputStructure?: Array<{ key: string; label: string; type: string; role?: string; item_schema?: any[] }>;
  onInputsChange: (inputs: Record<string, any>) => void;
  onOutputsChange: (outputs: Record<string, any>) => void;
  onGenerated: () => void;
}

type Option = { value: string; label: string };
const AI: Option = { value: "ai_recommended", label: "AI Recommended" };

const HEADLINE_STYLES: Option[] = [
  AI,
  { value: "recognition", label: "Recognition" },
  { value: "invitation", label: "Invitation" },
  { value: "future_vision", label: "Future Vision" },
  { value: "qualification", label: "Qualification" },
  { value: "aspirational", label: "Aspirational" },
  { value: "custom", label: "Custom" },
];

const OUTCOME_FOCUS = [
  { value: "financial", label: "Financial" },
  { value: "freedom", label: "Freedom" },
  { value: "confidence", label: "Confidence" },
  { value: "relationships", label: "Relationships" },
  { value: "health", label: "Health" },
  { value: "time", label: "Time" },
  { value: "business_growth", label: "Business Growth" },
  { value: "peace_of_mind", label: "Peace of Mind" },
  { value: "lifestyle", label: "Lifestyle" },
];

const OUTCOME_STRUCTURES: Option[] = [
  AI,
  { value: "goal_benefit", label: "Goal → Benefit" },
  { value: "goal_emotion", label: "Goal → Emotion" },
  { value: "before_after", label: "Before → After" },
  { value: "practical_emotional", label: "Practical + Emotional" },
  { value: "milestone_based", label: "Milestone Based" },
  { value: "custom", label: "Custom" },
];

const NUMBER_OF_GOALS: Option[] = [
  AI,
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "Reuse Hero CTA" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "section_headline",
  "section_subheadline",
  "goal_1_title", "goal_1_description",
  "goal_2_title", "goal_2_description",
  "goal_3_title", "goal_3_description",
  "goal_4_title", "goal_4_description",
  "goal_5_title", "goal_5_description",
  "goal_6_title", "goal_6_description",
  "cta_button_text",
  "cta_subtext",
  "scarcity_line",
  "bottom_social_proof",
];

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="border-border/50">
    <CardHeader className="pb-3 pt-4 px-4">
      <CardTitle className="text-sm font-display">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4 space-y-3">{children}</CardContent>
  </Card>
);

const PatternPicker = ({
  value, onChange, options, customValue, onCustomChange, customPlaceholder = "Write your own…", cols = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  customValue?: string;
  onCustomChange?: (v: string) => void;
  customPlaceholder?: string;
  cols?: number;
}) => (
  <>
    <RadioGroup value={value || "ai_recommended"} onValueChange={onChange} className={`grid gap-2 grid-cols-${cols}`}>
      {options.map(p => (
        <label
          key={p.value}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
        >
          <RadioGroupItem value={p.value} className="shrink-0" />
          <span>{p.label}</span>
        </label>
      ))}
    </RadioGroup>
    {value === "custom" && onCustomChange && (
      <Input
        value={customValue || ""}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder={customPlaceholder}
        className="text-sm mt-2"
      />
    )}
  </>
);

const DesiredOutcomesUI = ({
  aiActionSlug, componentInstructions, headlineInstructions, context, inputs, outputs, outputStructure,
  onInputsChange, onOutputsChange, onGenerated,
}: Props) => {
  const [generating, setGenerating] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const s = (key: string, value: any) => onInputsChange({ ...inputs, [key]: value });

  const outcomeFocus: string[] = inputs.outcome_focus || [];
  const toggleFocus = (v: string) => {
    const next = outcomeFocus.includes(v) ? outcomeFocus.filter(x => x !== v) : [...outcomeFocus, v];
    s("outcome_focus", next);
  };

  const handleGenerate = async () => {
    if (!aiActionSlug) { toast.error("No AI Action linked to this component"); return; }
    setGenerating(true);
    try {
      const result = await executeAIAction({
        slug: aiActionSlug,
        inputs: { ...inputs, context },
        extraInstructions: buildCopyExtraInstructions(headlineInstructions, componentInstructions, { outputStructure }),
        outputStructure,
      });
      onOutputsChange(result.output);
      onGenerated();
      toast.success("Desired Outcomes generated");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateField = async (fieldKey: string) => {
    if (!aiActionSlug) return;
    setRegeneratingField(fieldKey);
    try {
      const fieldLabel = fieldKey.replace(/_/g, " ");
      const existing = Object.entries(outputs)
        .filter(([k, v]) => k !== fieldKey && v)
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("\n");
      const focus = `IMPORTANT: Only regenerate the "${fieldLabel}" field. Keep all other fields unchanged.\n\nEXISTING OUTPUT:\n${existing}\n\n${componentInstructions || ""}`;
      const result = await executeAIAction({
        slug: aiActionSlug,
        inputs: { ...inputs, context },
        extraInstructions: buildCopyExtraInstructions(headlineInstructions, focus, { focusFieldKey: fieldKey, outputStructure }),
        outputStructure,
      });
      if (result.output && result.output[fieldKey] !== undefined && result.output[fieldKey] !== "") {
        onOutputsChange({ ...outputs, [fieldKey]: result.output[fieldKey] });
        onGenerated();
        toast.success(`${fieldLabel} regenerated`);
      } else {
        toast.error(`No "${fieldLabel}" returned`);
      }
    } catch (e: any) {
      toast.error(e.message || "Regeneration failed");
    } finally {
      setRegeneratingField(null);
    }
  };

  const rawKeys = Object.keys(outputs);
  const outputKeys = [
    ...OUTPUT_ORDER.filter(k => rawKeys.includes(k)),
    ...rawKeys.filter(k => !OUTPUT_ORDER.includes(k)),
  ];
  const hasOutput = outputKeys.some(k => outputs[k]);

  return (
    <div className="space-y-4">
      <SectionCard title="Headline Style">
        <PatternPicker
          value={inputs.headline_style || "ai_recommended"}
          onChange={(v) => s("headline_style", v)}
          options={HEADLINE_STYLES}
          customValue={inputs.headline_style_custom}
          onCustomChange={(v) => s("headline_style_custom", v)}
          customPlaceholder="Write your own headline style…"
        />
      </SectionCard>

      <SectionCard title="Outcome Focus">
        <p className="text-xs text-muted-foreground">AI Recommended is used when nothing is selected.</p>
        <div className="flex flex-wrap gap-2">
          {OUTCOME_FOCUS.map(o => {
            const active = outcomeFocus.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleFocus(o.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/50"
                }`}
              >
                {active && <Check className="w-3 h-3" />}
                {o.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Outcome Structure">
        <PatternPicker
          value={inputs.outcome_structure || "ai_recommended"}
          onChange={(v) => s("outcome_structure", v)}
          options={OUTCOME_STRUCTURES}
          customValue={inputs.outcome_structure_custom}
          onCustomChange={(v) => s("outcome_structure_custom", v)}
          customPlaceholder="Describe your own outcome structure…"
        />
      </SectionCard>

      <SectionCard title="Number of Goal Cards">
        <PatternPicker
          value={inputs.number_of_goals || "ai_recommended"}
          onChange={(v) => s("number_of_goals", v)}
          options={NUMBER_OF_GOALS}
          cols={4}
        />
      </SectionCard>

      <SectionCard title="CTA">
        <PatternPicker
          value={inputs.cta_mode || "reuse_hero"}
          onChange={(v) => s("cta_mode", v)}
          options={CTA_OPTIONS}
        />
      </SectionCard>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : hasOutput ? <RotateCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Desired Outcomes"}
        </Button>
      </div>

      {hasOutput && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-display font-bold text-foreground">Generated Output</h4>
          {outputKeys.map(key => outputs[key] ? (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 gap-1 text-xs"
                  onClick={() => handleRegenerateField(key)}
                  disabled={regeneratingField !== null || generating}
                >
                  {regeneratingField === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                </Button>
              </div>
              <Textarea value={outputs[key] || ""} onChange={(e) => onOutputsChange({ ...outputs, [key]: e.target.value })} className="text-sm min-h-[70px]" />
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
};

export default DesiredOutcomesUI;
