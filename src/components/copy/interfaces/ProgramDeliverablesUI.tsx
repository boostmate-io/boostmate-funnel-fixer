import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
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

const HEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "introducing_program", label: "Introducing the Program" },
  { value: "complete_system", label: "The Complete System" },
  { value: "transformation_roadmap", label: "Your Transformation Roadmap" },
  { value: "everything_youll_receive", label: "Everything You'll Receive" },
  { value: "custom", label: "Custom" },
];

const SUBHEADLINE_STYLES: Option[] = [
  AI,
  { value: "outcome_focused", label: "Outcome-focused" },
  { value: "simplicity", label: "Simplicity" },
  { value: "premium_positioning", label: "Premium positioning" },
  { value: "custom", label: "Custom" },
];

const TRUST_BADGE: Option[] = [
  AI,
  { value: "years_experience", label: "Years of experience" },
  { value: "clients_helped", label: "Clients helped" },
  { value: "success_rate", label: "Success rate" },
  { value: "optional", label: "Optional" },
  { value: "custom", label: "Custom" },
];

const NUMBER_OF_DELIVERABLES: Option[] = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const DESCRIPTION_STYLE: Option[] = [
  { value: "concise", label: "Concise" },
  { value: "detailed", label: "Detailed" },
  { value: "ai_recommended", label: "AI Recommended" },
];

const DELIVERABLE_FOCUS: Option[] = [
  { value: "practical", label: "Practical implementation" },
  { value: "coaching_support", label: "Coaching / Support" },
  { value: "resources", label: "Resources" },
  { value: "balanced", label: "Balanced" },
];

const NUMBER_OF_BONUSES: Option[] = [
  { value: "0", label: "None" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

const BONUS_POSITIONING: Option[] = [
  { value: "accelerates_results", label: "Accelerates results" },
  { value: "removes_obstacles", label: "Removes obstacles" },
  { value: "increases_accountability", label: "Increases accountability" },
  { value: "mixed", label: "Mixed" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "Reuse Hero CTA" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "program_badge",
  "program_headline",
  "program_subheadline",
  "deliverable_1_type", "deliverable_1_title", "deliverable_1_description",
  "deliverable_2_type", "deliverable_2_title", "deliverable_2_description",
  "deliverable_3_type", "deliverable_3_title", "deliverable_3_description",
  "bonus_section_headline",
  "bonus_section_subheadline",
  "bonus_1_label", "bonus_1_title", "bonus_1_description",
  "bonus_2_label", "bonus_2_title", "bonus_2_description",
  "bonus_3_label", "bonus_3_title", "bonus_3_description",
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

const ProgramDeliverablesUI = ({
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
      toast.success("Program & Deliverables generated");
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

      <SectionCard title="Subheadline Style">
        <PatternPicker
          value={inputs.subheadline_style || "ai_recommended"}
          onChange={(v) => s("subheadline_style", v)}
          options={SUBHEADLINE_STYLES}
          customValue={inputs.subheadline_style_custom}
          onCustomChange={(v) => s("subheadline_style_custom", v)}
          customPlaceholder="Describe your own subheadline style…"
        />
      </SectionCard>

      <SectionCard title="Trust Badge">
        <PatternPicker
          value={inputs.trust_badge || "ai_recommended"}
          onChange={(v) => s("trust_badge", v)}
          options={TRUST_BADGE}
          customValue={inputs.trust_badge_custom}
          onCustomChange={(v) => s("trust_badge_custom", v)}
          customPlaceholder="Write your own trust badge…"
        />
      </SectionCard>

      <SectionCard title="Number of Deliverables">
        <PatternPicker
          value={inputs.number_of_deliverables || "3"}
          onChange={(v) => s("number_of_deliverables", v)}
          options={NUMBER_OF_DELIVERABLES}
          cols={4}
        />
      </SectionCard>

      <SectionCard title="Deliverable Description Style">
        <PatternPicker
          value={inputs.description_style || "ai_recommended"}
          onChange={(v) => s("description_style", v)}
          options={DESCRIPTION_STYLE}
          cols={3}
        />
      </SectionCard>

      <SectionCard title="Deliverable Focus">
        <PatternPicker
          value={inputs.deliverable_focus || "balanced"}
          onChange={(v) => s("deliverable_focus", v)}
          options={DELIVERABLE_FOCUS}
          cols={2}
        />
      </SectionCard>

      <SectionCard title="Number of Bonuses">
        <PatternPicker
          value={inputs.number_of_bonuses || "3"}
          onChange={(v) => s("number_of_bonuses", v)}
          options={NUMBER_OF_BONUSES}
          cols={5}
        />
      </SectionCard>

      <SectionCard title="Bonus Positioning">
        <PatternPicker
          value={inputs.bonus_positioning || "mixed"}
          onChange={(v) => s("bonus_positioning", v)}
          options={BONUS_POSITIONING}
          cols={2}
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Program & Deliverables"}
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
              <div className="text-sm p-3 rounded-md bg-muted/50 border border-border/50 whitespace-pre-wrap">
                {outputs[key]}
              </div>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
};

export default ProgramDeliverablesUI;
