import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const SECTION_HEADLINE: Option[] = [
  AI,
  { value: "understanding_your_reality", label: "Understanding your reality" },
  { value: "the_truth_about", label: "The truth about..." },
  { value: "why_most_people_struggle", label: "Why most people struggle" },
  { value: "what_weve_learned", label: "What we've learned" },
  { value: "before_anything_changes", label: "Before anything changes" },
  { value: "custom", label: "Custom" },
];

const SECTION_SUBHEADLINE: Option[] = [
  AI,
  { value: "empathy_focused", label: "Empathy-focused" },
  { value: "educational", label: "Educational" },
  { value: "pattern_recognition", label: "Pattern recognition" },
  { value: "perspective_shift", label: "Perspective shift" },
  { value: "custom", label: "Custom" },
];

const BLOCK1_HEADLINE: Option[] = [
  AI,
  { value: "the_current_reality", label: "The current reality" },
  { value: "whats_really_happening", label: "What's really happening" },
  { value: "why_this_keeps_happening", label: "Why this keeps happening" },
  { value: "most_people_dont_realize", label: "Most people don't realize..." },
  { value: "custom", label: "Custom" },
];

const BLOCK1_FOCUS: Option[] = [
  AI,
  { value: "industry_confusion", label: "Industry confusion" },
  { value: "common_mistakes", label: "Common mistakes" },
  { value: "false_beliefs", label: "False beliefs" },
  { value: "hidden_patterns", label: "Hidden patterns" },
  { value: "mixed", label: "Mixed" },
];

const BLOCK1_TONE: Option[] = [
  { value: "empathetic", label: "Empathetic" },
  { value: "educational", label: "Educational" },
  { value: "direct", label: "Direct" },
];

const BLOCK2_HEADLINE: Option[] = [
  AI,
  { value: "daily_reality", label: "Daily reality" },
  { value: "the_emotional_cost", label: "The emotional cost" },
  { value: "living_with_this_problem", label: "Living with this problem" },
  { value: "if_this_sounds_familiar", label: "If this sounds familiar..." },
  { value: "custom", label: "Custom" },
];

const BLOCK2_FOCUS: Option[] = [
  AI,
  { value: "emotional_impact", label: "Emotional impact" },
  { value: "daily_frustrations", label: "Daily frustrations" },
  { value: "internal_dialogue", label: "Internal dialogue" },
  { value: "practical_consequences", label: "Practical consequences" },
  { value: "mixed", label: "Mixed" },
];

const BLOCK2_TONE: Option[] = [
  { value: "empathetic", label: "Empathetic" },
  { value: "emotional", label: "Emotional" },
  { value: "direct", label: "Direct" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "Reuse Hero CTA" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "section_headline",
  "section_subheadline",
  "block_1_headline",
  "block_1_paragraph_1",
  "block_1_paragraph_2",
  "block_1_paragraph_3",
  "block_1_paragraph_4",
  "block_2_headline",
  "block_2_paragraph_1",
  "block_2_paragraph_2",
  "block_2_paragraph_3",
  "block_2_paragraph_4",
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

const AuthorityContextInsightUI = ({
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
      toast.success("Authority Context & Insight generated");
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
          value={inputs.section_headline_pattern || "ai_recommended"}
          onChange={(v) => s("section_headline_pattern", v)}
          options={SECTION_HEADLINE}
          customValue={inputs.section_headline_pattern_custom}
          onCustomChange={(v) => s("section_headline_pattern_custom", v)}
          customPlaceholder="Write your own headline pattern…"
        />
      </SectionCard>

      <SectionCard title="Section Subheadline">
        <PatternPicker
          value={inputs.section_subheadline_pattern || "ai_recommended"}
          onChange={(v) => s("section_subheadline_pattern", v)}
          options={SECTION_SUBHEADLINE}
          customValue={inputs.section_subheadline_pattern_custom}
          onCustomChange={(v) => s("section_subheadline_pattern_custom", v)}
          customPlaceholder="Describe your own subheadline style…"
        />
      </SectionCard>

      <SectionCard title="Block 1 — Current Reality">
        <div>
          <Label className="text-xs text-muted-foreground">Headline pattern</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.block_1_headline_pattern || "ai_recommended"}
              onChange={(v) => s("block_1_headline_pattern", v)}
              options={BLOCK1_HEADLINE}
              customValue={inputs.block_1_headline_pattern_custom}
              onCustomChange={(v) => s("block_1_headline_pattern_custom", v)}
              customPlaceholder="Write your own headline pattern…"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Content focus</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.block_1_focus || "ai_recommended"}
              onChange={(v) => s("block_1_focus", v)}
              options={BLOCK1_FOCUS}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tone</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.block_1_tone || "educational"}
              onChange={(v) => s("block_1_tone", v)}
              options={BLOCK1_TONE}
              cols={3}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Block 2 — Daily Reality">
        <div>
          <Label className="text-xs text-muted-foreground">Headline pattern</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.block_2_headline_pattern || "ai_recommended"}
              onChange={(v) => s("block_2_headline_pattern", v)}
              options={BLOCK2_HEADLINE}
              customValue={inputs.block_2_headline_pattern_custom}
              onCustomChange={(v) => s("block_2_headline_pattern_custom", v)}
              customPlaceholder="Write your own headline pattern…"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Content focus</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.block_2_focus || "ai_recommended"}
              onChange={(v) => s("block_2_focus", v)}
              options={BLOCK2_FOCUS}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tone</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.block_2_tone || "empathetic"}
              onChange={(v) => s("block_2_tone", v)}
              options={BLOCK2_TONE}
              cols={3}
            />
          </div>
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Authority Context & Insight"}
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

export default AuthorityContextInsightUI;
