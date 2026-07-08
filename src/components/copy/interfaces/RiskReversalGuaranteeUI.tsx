import { isCtaFieldHidden } from "@/lib/copy/outputFilters";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RotateCw, Loader2, Shield } from "lucide-react";
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

const GUARANTEE_TYPE: Option[] = [
  AI,
  { value: "money_back", label: "Money-back guarantee" },
  { value: "satisfaction", label: "Satisfaction guarantee" },
  { value: "performance", label: "Performance guarantee" },
  { value: "service", label: "Service guarantee" },
  { value: "custom", label: "Custom" },
];

const HEADLINE: Option[] = [
  AI,
  { value: "try_it_risk_free", label: "Try it risk free" },
  { value: "peace_of_mind", label: "Peace of mind" },
  { value: "youre_protected", label: "You're protected" },
  { value: "we_stand_behind_our_work", label: "We stand behind our work" },
  { value: "custom", label: "Custom" },
];

const TONE: Option[] = [
  { value: "reassuring", label: "Reassuring" },
  { value: "confident", label: "Confident" },
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
];

const STRENGTH_FOCUS: Option[] = [
  AI,
  { value: "build_trust", label: "Build trust" },
  { value: "reduce_hesitation", label: "Reduce hesitation" },
  { value: "explain_fairness", label: "Explain fairness" },
  { value: "emphasize_simplicity", label: "Emphasize simplicity" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "No CTA (use Hero CTA above)" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "guarantee_label",
  "section_headline",
  "paragraph_1",
  "paragraph_2",
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

const RiskReversalGuaranteeUI = ({
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
      toast.success("Risk Reversal generated");
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
      <SectionCard title="Guarantee Type">
        <PatternPicker
          value={inputs.guarantee_type || "ai_recommended"}
          onChange={(v) => s("guarantee_type", v)}
          options={GUARANTEE_TYPE}
          customValue={inputs.guarantee_type_custom}
          onCustomChange={(v) => s("guarantee_type_custom", v)}
          customPlaceholder="Describe your own guarantee…"
        />
      </SectionCard>

      <SectionCard title="Headline">
        <PatternPicker
          value={inputs.headline_pattern || "ai_recommended"}
          onChange={(v) => s("headline_pattern", v)}
          options={HEADLINE}
          customValue={inputs.headline_pattern_custom}
          onCustomChange={(v) => s("headline_pattern_custom", v)}
          customPlaceholder="Write your own headline pattern…"
        />
      </SectionCard>

      <SectionCard title="Tone">
        <PatternPicker
          value={inputs.tone || "reassuring"}
          onChange={(v) => s("tone", v)}
          options={TONE}
        />
      </SectionCard>

      <SectionCard title="Guarantee Strength — Focus on">
        <PatternPicker
          value={inputs.strength_focus || "ai_recommended"}
          onChange={(v) => s("strength_focus", v)}
          options={STRENGTH_FOCUS}
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Risk Reversal"}
        </Button>
      </div>

      {hasOutput && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-display font-bold text-foreground">Generated Output</h4>

          {/* Guarantee badge placeholder */}
          <div className="flex justify-center py-4">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-border/70 bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Shield className="w-10 h-10" />
            </div>
          </div>

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

export default RiskReversalGuaranteeUI;
