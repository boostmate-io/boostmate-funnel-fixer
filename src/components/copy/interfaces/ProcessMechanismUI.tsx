import { isCtaFieldHidden } from "@/lib/copy/outputFilters";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RotateCw, Loader2 } from "lucide-react";
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
  { value: "how_it_works", label: "How it works" },
  { value: "our_proven_process", label: "Our proven process" },
  { value: "framework_behind_results", label: "The framework behind the results" },
  { value: "transformation_roadmap", label: "Your transformation roadmap" },
  { value: "from_where_you_are", label: "From where you are to where you want to be" },
  { value: "custom", label: "Custom" },
];

const SUBHEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "transformation_focused", label: "Transformation-focused" },
  { value: "framework_focused", label: "Framework-focused" },
  { value: "simplicity", label: "Simplicity" },
  { value: "practical", label: "Practical" },
  { value: "custom", label: "Custom" },
];

const NUMBER_OF_STEPS: Option[] = [
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const STEP_NAMING: Option[] = [
  { value: "outcome_oriented", label: "Outcome-oriented" },
  { value: "action_oriented", label: "Action-oriented" },
  { value: "framework_terminology", label: "Framework terminology" },
  { value: "ai_recommended", label: "AI Recommended" },
];

const PROCESS_FOCUS: Option[] = [
  { value: "transformation_journey", label: "Transformation journey" },
  { value: "strategic_framework", label: "Strategic framework" },
  { value: "coaching_methodology", label: "Coaching methodology" },
  { value: "hybrid", label: "Hybrid" },
];

const DESCRIPTION_STYLE: Option[] = [
  { value: "short_punchy", label: "Short & punchy" },
  { value: "more_explanatory", label: "More explanatory" },
  { value: "ai_recommended", label: "AI Recommended" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "No CTA (use Hero CTA above)" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "section_headline",
  "section_subheadline",
  "step_1_label", "step_1_title", "step_1_description",
  "step_2_label", "step_2_title", "step_2_description",
  "step_3_label", "step_3_title", "step_3_description",
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

const ProcessMechanismUI = ({
  aiActionSlug, componentInstructions, headlineInstructions, context, inputs, outputs, outputStructure,
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
        extraInstructions: buildCopyExtraInstructions(headlineInstructions, componentInstructions, { outputStructure }),
        outputStructure,
      });
      onOutputsChange(result.output);
      onGenerated();
      toast.success("Process / Unique Mechanism generated");
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
      <SectionCard title="Section Headline">
        <PatternPicker
          value={inputs.headline_pattern || "ai_recommended"}
          onChange={(v) => s("headline_pattern", v)}
          options={HEADLINE_PATTERNS}
          customValue={inputs.headline_pattern_custom}
          onCustomChange={(v) => s("headline_pattern_custom", v)}
          customPlaceholder="Write your own headline pattern…"
        />
      </SectionCard>

      <SectionCard title="Section Subheadline">
        <PatternPicker
          value={inputs.subheadline_pattern || "ai_recommended"}
          onChange={(v) => s("subheadline_pattern", v)}
          options={SUBHEADLINE_PATTERNS}
          customValue={inputs.subheadline_pattern_custom}
          onCustomChange={(v) => s("subheadline_pattern_custom", v)}
          customPlaceholder="Describe your own subheadline pattern…"
        />
      </SectionCard>

      <SectionCard title="Number of Steps">
        <PatternPicker
          value={inputs.number_of_steps || "3"}
          onChange={(v) => s("number_of_steps", v)}
          options={NUMBER_OF_STEPS}
          cols={3}
        />
      </SectionCard>

      <SectionCard title="Step Naming Style">
        <PatternPicker
          value={inputs.step_naming || "outcome_oriented"}
          onChange={(v) => s("step_naming", v)}
          options={STEP_NAMING}
          cols={2}
        />
      </SectionCard>

      <SectionCard title="Process Focus">
        <PatternPicker
          value={inputs.process_focus || "transformation_journey"}
          onChange={(v) => s("process_focus", v)}
          options={PROCESS_FOCUS}
          cols={2}
        />
      </SectionCard>

      <SectionCard title="Description Style">
        <PatternPicker
          value={inputs.description_style || "ai_recommended"}
          onChange={(v) => s("description_style", v)}
          options={DESCRIPTION_STYLE}
          cols={3}
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Process / Unique Mechanism"}
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

export default ProcessMechanismUI;
