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

const HEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "what_youll_achieve", label: "What you'll achieve" },
  { value: "your_transformation", label: "Your transformation" },
  { value: "your_future", label: "Your future" },
  { value: "program_outcomes", label: "Program outcomes" },
  { value: "expected_results", label: "Expected results" },
  { value: "custom", label: "Custom" },
];

const SUBHEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "outcome_focused", label: "Outcome-focused" },
  { value: "transformation_focused", label: "Transformation-focused" },
  { value: "practical", label: "Practical" },
  { value: "inspirational", label: "Inspirational" },
  { value: "custom", label: "Custom" },
];

const NUMBER_OF_OUTCOMES: Option[] = [
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
];

const PRIMARY_FOCUS: Option[] = [
  { value: "practical", label: "Practical outcomes" },
  { value: "emotional", label: "Emotional outcomes" },
  { value: "balanced", label: "Balanced" },
];

const OUTCOME_STYLE: Option[] = [
  { value: "short_punchy", label: "Short & punchy" },
  { value: "more_descriptive", label: "More descriptive" },
  { value: "ai_recommended", label: "AI Recommended" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "Reuse Hero CTA" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "section_headline",
  "section_subheadline",
  "outcome_1_title", "outcome_1_description",
  "outcome_2_title", "outcome_2_description",
  "outcome_3_title", "outcome_3_description",
  "outcome_4_title", "outcome_4_description",
  "outcome_5_title", "outcome_5_description",
  "outcome_6_title", "outcome_6_description",
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

const CoreOutcomesUI = ({
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
        extraInstructions: buildCopyExtraInstructions("core-outcomes", componentInstructions),
        outputStructure,
      });
      onOutputsChange(result.output);
      onGenerated();
      toast.success("Core Outcomes generated");
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
        extraInstructions: buildCopyExtraInstructions("core-outcomes", focus, { focusFieldKey: fieldKey }),
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

      <SectionCard title="Number of Outcomes">
        <PatternPicker
          value={inputs.number_of_outcomes || "6"}
          onChange={(v) => s("number_of_outcomes", v)}
          options={NUMBER_OF_OUTCOMES}
          cols={4}
        />
      </SectionCard>

      <SectionCard title="Primary Focus">
        <PatternPicker
          value={inputs.primary_focus || "balanced"}
          onChange={(v) => s("primary_focus", v)}
          options={PRIMARY_FOCUS}
          cols={3}
        />
      </SectionCard>

      <SectionCard title="Outcome Style">
        <PatternPicker
          value={inputs.outcome_style || "ai_recommended"}
          onChange={(v) => s("outcome_style", v)}
          options={OUTCOME_STYLE}
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Core Outcomes"}
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

export default CoreOutcomesUI;
