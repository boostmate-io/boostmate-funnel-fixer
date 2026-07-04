import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, RotateCw, Loader2 } from "lucide-react";
import { executeAIAction } from "@/lib/api/aiActions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  componentSlug: string;
  aiActionSlug: string;
  componentInstructions: string;
  context: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  outputStructure?: Array<{ key: string; label: string; type: string; item_schema?: any[] }>;
  onInputsChange: (inputs: Record<string, any>) => void;
  onOutputsChange: (outputs: Record<string, any>) => void;
  onGenerated: () => void;
}

type Option = { value: string; label: string };
const AI: Option = { value: "ai_recommended", label: "AI Recommended" };

const PATTERN_INTERRUPT: Option[] = [
  AI,
  { value: "hidden_problem", label: "Hidden Problem" },
  { value: "contrarian", label: "Contrarian Statement" },
  { value: "common_mistake", label: "Common Mistake" },
  { value: "false_belief", label: "False Belief" },
  { value: "shocking_truth", label: "Shocking Truth" },
  { value: "unexpected_cause", label: "Unexpected Cause" },
  { value: "custom", label: "Custom" },
];

const PAIN_ANGLES: Option[] = [
  AI,
  { value: "frustration", label: "Frustration" },
  { value: "overwhelm", label: "Overwhelm" },
  { value: "fear", label: "Fear" },
  { value: "shame", label: "Shame" },
  { value: "confusion", label: "Confusion" },
  { value: "exhaustion", label: "Exhaustion" },
  { value: "missed_opportunity", label: "Missed Opportunity" },
  { value: "internal_conflict", label: "Internal Conflict" },
  { value: "custom", label: "Custom" },
];

const PAIN_STORY_STRUCTURES: Option[] = [
  AI,
  { value: "situation_frustration_emotion", label: "Situation → Frustration → Emotion" },
  { value: "tried_expected_failed", label: "Tried → Expected → Failed" },
  { value: "external_internal", label: "External → Internal struggle" },
  { value: "before_after", label: "Before / After contrast" },
  { value: "dual_persona", label: "Dual Persona (\"Or maybe…\")" },
  { value: "custom", label: "Custom" },
];

const IMAGE_DIRECTIONS: Option[] = [
  AI,
  { value: "person", label: "Person" },
  { value: "couple", label: "Couple" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "workplace", label: "Workplace" },
  { value: "symbolic", label: "Symbolic" },
  { value: "illustration", label: "Illustration" },
  { value: "none", label: "No image" },
];

const OUTPUT_ORDER = [
  "curiosity_headline",
  "curiosity_subheadline",
  "image_prompt",
  "pain_headline",
  "pain_story",
  "cta_button_text",
  "cta_subtext",
  "scarcity_line",
  "supporting_proof",
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
  value, onChange, options, customValue, onCustomChange, customPlaceholder = "Write your own…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  customValue?: string;
  onCustomChange?: (v: string) => void;
  customPlaceholder?: string;
}) => (
  <>
    <RadioGroup value={value || "ai_recommended"} onValueChange={onChange} className="grid grid-cols-2 gap-2">
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

const ProblemAmplifierUI = ({
  aiActionSlug, componentInstructions, context, inputs, outputs, outputStructure,
  onInputsChange, onOutputsChange, onGenerated,
}: Props) => {
  const [generating, setGenerating] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const s = (key: string, value: any) => onInputsChange({ ...inputs, [key]: value });

  const handleGenerate = async () => {
    if (!aiActionSlug) { toast.error("No AI Action linked to this component"); return; }
    setGenerating(true);
    try {
      const result = await executeAIAction({
        slug: aiActionSlug,
        inputs: { ...inputs, context },
        extraInstructions: componentInstructions || undefined,
        outputStructure,
      });
      onOutputsChange(result.output);
      onGenerated();
      toast.success("Problem Amplifier generated");
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
        extraInstructions: focus,
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
      <SectionCard title="Pattern Interrupt">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.pattern_interrupt || "ai_recommended"}
          onChange={(v) => s("pattern_interrupt", v)}
          options={PATTERN_INTERRUPT}
          customValue={inputs.pattern_interrupt_custom}
          onCustomChange={(v) => s("pattern_interrupt_custom", v)}
          customPlaceholder="Write your own pattern interrupt…"
        />
      </SectionCard>

      <SectionCard title="Pain Angle">
        <Label className="text-xs text-muted-foreground">Choose what emotional direction the AI should emphasize.</Label>
        <PatternPicker
          value={inputs.pain_angle || "ai_recommended"}
          onChange={(v) => s("pain_angle", v)}
          options={PAIN_ANGLES}
          customValue={inputs.pain_angle_custom}
          onCustomChange={(v) => s("pain_angle_custom", v)}
          customPlaceholder="Write your own pain angle…"
        />
      </SectionCard>

      <SectionCard title="Pain Story Structure">
        <PatternPicker
          value={inputs.pain_story_structure || "ai_recommended"}
          onChange={(v) => s("pain_story_structure", v)}
          options={PAIN_STORY_STRUCTURES}
          customValue={inputs.pain_story_structure_custom}
          onCustomChange={(v) => s("pain_story_structure_custom", v)}
          customPlaceholder="Describe your own pain story structure…"
        />
      </SectionCard>

      <SectionCard title="Image Direction">
        <PatternPicker
          value={inputs.image_direction || "ai_recommended"}
          onChange={(v) => s("image_direction", v)}
          options={IMAGE_DIRECTIONS}
        />
      </SectionCard>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : hasOutput ? <RotateCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Problem Amplifier"}
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

export default ProblemAmplifierUI;
