import { isCtaFieldHidden } from "@/lib/copy/outputFilters";
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

const HEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "recognition", label: "Recognition" },
  { value: "question", label: "Question" },
  { value: "emotional_statement", label: "Emotional Statement" },
  { value: "situation_based", label: "Situation Based" },
  { value: "observation", label: "Observation" },
  { value: "custom", label: "Custom" },
];

const PAIN_STRUCTURES: Option[] = [
  AI,
  { value: "situation_consequence", label: "Situation → Consequence" },
  { value: "frustration_emotion", label: "Frustration → Emotion" },
  { value: "action_no_result", label: "Action → No Result" },
  { value: "internal_conflict", label: "Internal Conflict" },
  { value: "daily_struggle", label: "Daily Struggle" },
  { value: "custom", label: "Custom" },
];

const NUMBER_OF_PAINS: Option[] = [
  AI,
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const PAIN_ANGLES = [
  { value: "emotional", label: "Emotional" },
  { value: "practical", label: "Practical" },
  { value: "financial", label: "Financial" },
  { value: "time", label: "Time" },
  { value: "energy", label: "Energy" },
  { value: "confidence", label: "Confidence" },
  { value: "relationships", label: "Relationships" },
  { value: "stress", label: "Stress" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "No CTA (use Hero CTA above)" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "headline",
  "subheadline",
  "pain_1_title", "pain_1_description",
  "pain_2_title", "pain_2_description",
  "pain_3_title", "pain_3_description",
  "pain_4_title", "pain_4_description",
  "pain_5_title", "pain_5_description",
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

const PainPointsUI = ({
  aiActionSlug, componentInstructions, headlineInstructions, context, inputs, outputs, outputStructure,
  onInputsChange, onOutputsChange, onGenerated,
}: Props) => {
  const [generating, setGenerating] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const s = (key: string, value: any) => onInputsChange({ ...inputs, [key]: value });

  const painAngles: string[] = inputs.pain_angles || [];
  const toggleAngle = (v: string) => {
    const next = painAngles.includes(v) ? painAngles.filter(x => x !== v) : [...painAngles, v];
    s("pain_angles", next);
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
      toast.success("Pain Points generated");
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
      <SectionCard title="Headline Pattern">
        <PatternPicker
          value={inputs.headline_pattern || "ai_recommended"}
          onChange={(v) => s("headline_pattern", v)}
          options={HEADLINE_PATTERNS}
          customValue={inputs.headline_pattern_custom}
          onCustomChange={(v) => s("headline_pattern_custom", v)}
          customPlaceholder="Write your own headline pattern…"
        />
      </SectionCard>

      <SectionCard title="Pain Point Structure">
        <PatternPicker
          value={inputs.pain_structure || "ai_recommended"}
          onChange={(v) => s("pain_structure", v)}
          options={PAIN_STRUCTURES}
          customValue={inputs.pain_structure_custom}
          onCustomChange={(v) => s("pain_structure_custom", v)}
          customPlaceholder="Describe your own pain point structure…"
        />
      </SectionCard>

      <SectionCard title="Number of Pain Points">
        <PatternPicker
          value={inputs.number_of_pains || "ai_recommended"}
          onChange={(v) => s("number_of_pains", v)}
          options={NUMBER_OF_PAINS}
          cols={4}
        />
      </SectionCard>

      <SectionCard title="Pain Angle">
        <p className="text-xs text-muted-foreground">AI Recommended is used when nothing is selected.</p>
        <div className="flex flex-wrap gap-2">
          {PAIN_ANGLES.map(a => {
            const active = painAngles.includes(a.value);
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggleAngle(a.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/50"
                }`}
              >
                {active && <Check className="w-3 h-3" />}
                {a.label}
              </button>
            );
          })}
        </div>
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Pain Points"}
        </Button>
      </div>

      {hasOutput && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-display font-bold text-foreground">Generated Output</h4>
          {outputKeys.filter(key => !isCtaFieldHidden(key, inputs)).map(key => outputs[key] ? (
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

export default PainPointsUI;
