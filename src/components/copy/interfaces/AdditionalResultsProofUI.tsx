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
  { value: "more_success_stories", label: "More success stories" },
  { value: "real_client_results", label: "Real client results" },
  { value: "more_proof", label: "More proof this works" },
  { value: "see_whats_possible", label: "See what's possible" },
  { value: "people_like_you", label: "People just like you" },
  { value: "custom", label: "Custom" },
];

const SUBHEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "credibility", label: "Credibility-focused" },
  { value: "community", label: "Community-focused" },
  { value: "consistency", label: "Consistency-focused" },
  { value: "inspirational", label: "Inspirational" },
  { value: "custom", label: "Custom" },
];

const NUM_RESULTS: Option[] = [
  { value: "6", label: "6" },
  { value: "8", label: "8" },
  { value: "10", label: "10" },
  { value: "12", label: "12" },
];

const CAPTION_STYLE: Option[] = [
  { value: "short_wins", label: "Short wins" },
  { value: "transformation", label: "Transformation-focused" },
  { value: "emotional", label: "Emotional breakthroughs" },
  { value: "business", label: "Business results" },
  { value: "mixed", label: "Mixed (AI Recommended)" },
];

const TONE: Option[] = [
  { value: "natural", label: "Natural" },
  { value: "excited", label: "Excited" },
  { value: "matter_of_fact", label: "Matter-of-fact" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "Reuse Hero CTA" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "section_headline",
  "section_subheadline",
  "result_1_caption",
  "result_2_caption",
  "result_3_caption",
  "result_4_caption",
  "result_5_caption",
  "result_6_caption",
  "result_7_caption",
  "result_8_caption",
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
    <RadioGroup value={value || options[0].value} onValueChange={onChange} className={`grid gap-2 grid-cols-${cols}`}>
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

const AdditionalResultsProofUI = ({
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
      toast.success("Additional Results Proof generated");
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
      <SectionCard title="Section Headline">
        <PatternPicker
          value={inputs.headline_pattern || "ai_recommended"}
          onChange={(v) => s("headline_pattern", v)}
          options={HEADLINE_PATTERNS}
          customValue={inputs.headline_pattern_custom}
          onCustomChange={(v) => s("headline_pattern_custom", v)}
          customPlaceholder="Write your own headline direction…"
        />
      </SectionCard>

      <SectionCard title="Section Subheadline">
        <PatternPicker
          value={inputs.subheadline_pattern || "ai_recommended"}
          onChange={(v) => s("subheadline_pattern", v)}
          options={SUBHEADLINE_PATTERNS}
          customValue={inputs.subheadline_pattern_custom}
          onCustomChange={(v) => s("subheadline_pattern_custom", v)}
          customPlaceholder="Write your own subheadline direction…"
        />
      </SectionCard>

      <SectionCard title="Result Captions">
        <div className="space-y-2">
          <Label className="text-xs">Number of results</Label>
          <PatternPicker
            value={inputs.results_count || "8"}
            onChange={(v) => s("results_count", v)}
            options={NUM_RESULTS}
            cols={4}
          />
          <p className="text-[11px] text-muted-foreground">
            The template displays 8 captions by default — extras are stored for future use.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Caption style</Label>
          <PatternPicker
            value={inputs.caption_style || "short_wins"}
            onChange={(v) => s("caption_style", v)}
            options={CAPTION_STYLE}
            cols={2}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Tone</Label>
          <PatternPicker
            value={inputs.tone || "matter_of_fact"}
            onChange={(v) => s("tone", v)}
            options={TONE}
            cols={3}
          />
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Additional Results Proof"}
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

export default AdditionalResultsProofUI;
