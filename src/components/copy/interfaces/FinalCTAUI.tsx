import { isCtaFieldHidden } from "@/lib/copy/outputFilters";
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

const EYEBROW: Option[] = [
  AI,
  { value: "ready_to_move_forward", label: "Ready to move forward?" },
  { value: "stop_staying_stuck", label: "Stop staying stuck" },
  { value: "your_next_chapter", label: "Your next chapter starts here" },
  { value: "youre_closer_than_you_think", label: "You're closer than you think" },
  { value: "custom", label: "Custom" },
];

const HEADLINE: Option[] = [
  AI,
  { value: "outcome_focused", label: "Outcome-focused" },
  { value: "inspirational", label: "Inspirational" },
  { value: "decision_focused", label: "Decision-focused" },
  { value: "direct", label: "Direct" },
  { value: "custom", label: "Custom" },
];

const PARAGRAPH_TONE: Option[] = [
  AI,
  { value: "reassuring", label: "Reassuring" },
  { value: "motivational", label: "Motivational" },
  { value: "calm_confidence", label: "Calm confidence" },
  { value: "direct", label: "Direct" },
  { value: "custom", label: "Custom" },
];

const GUARANTEE_REMINDER: Option[] = [
  { value: "auto", label: "Auto" },
  { value: "include", label: "Include guarantee" },
  { value: "exclude", label: "Do not reference guarantee" },
];

const CTA_HEADLINE: Option[] = [
  AI,
  { value: "book_your_consultation", label: "Book your consultation" },
  { value: "ready_when_you_are", label: "Ready when you are" },
  { value: "take_the_first_step", label: "Take the first step" },
  { value: "lets_get_started", label: "Let's get started" },
  { value: "custom", label: "Custom" },
];

const CTA_SUBLINE: Option[] = [
  AI,
  { value: "low_pressure", label: "Low pressure" },
  { value: "consultation_focused", label: "Consultation focused" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "custom", label: "Custom" },
];

const PROOF_LINE: Option[] = [
  AI,
  { value: "experience", label: "Experience" },
  { value: "results", label: "Results" },
  { value: "trust", label: "Trust" },
  { value: "social_proof", label: "Social proof" },
  { value: "custom", label: "Custom" },
];

const OUTPUT_ORDER = [
  "eyebrow",
  "section_headline",
  "section_subheadline",
  "cta_headline",
  "cta_subheadline",
  "proof_line",
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

const FinalCTAUI = ({
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
      toast.success("Final CTA generated");
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
      <SectionCard title="Eyebrow">
        <PatternPicker
          value={inputs.eyebrow_pattern || "ai_recommended"}
          onChange={(v) => s("eyebrow_pattern", v)}
          options={EYEBROW}
          customValue={inputs.eyebrow_pattern_custom}
          onCustomChange={(v) => s("eyebrow_pattern_custom", v)}
          customPlaceholder="Write your own eyebrow…"
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

      <SectionCard title="Supporting Paragraph">
        <div>
          <Label className="text-xs text-muted-foreground">Tone</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.paragraph_tone || "ai_recommended"}
              onChange={(v) => s("paragraph_tone", v)}
              options={PARAGRAPH_TONE}
              customValue={inputs.paragraph_tone_custom}
              onCustomChange={(v) => s("paragraph_tone_custom", v)}
              customPlaceholder="Describe your own tone…"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Guarantee reminder</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.guarantee_reminder || "auto"}
              onChange={(v) => s("guarantee_reminder", v)}
              options={GUARANTEE_REMINDER}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="CTA Microcopy">
        <div>
          <Label className="text-xs text-muted-foreground">CTA headline</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.cta_headline_pattern || "ai_recommended"}
              onChange={(v) => s("cta_headline_pattern", v)}
              options={CTA_HEADLINE}
              customValue={inputs.cta_headline_pattern_custom}
              onCustomChange={(v) => s("cta_headline_pattern_custom", v)}
              customPlaceholder="Write your own CTA headline…"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">CTA supporting line</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.cta_subline_style || "ai_recommended"}
              onChange={(v) => s("cta_subline_style", v)}
              options={CTA_SUBLINE}
              customValue={inputs.cta_subline_style_custom}
              onCustomChange={(v) => s("cta_subline_style_custom", v)}
              customPlaceholder="Describe your CTA supporting line style…"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Proof line</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.proof_line_focus || "ai_recommended"}
              onChange={(v) => s("proof_line_focus", v)}
              options={PROOF_LINE}
              customValue={inputs.proof_line_focus_custom}
              onCustomChange={(v) => s("proof_line_focus_custom", v)}
              customPlaceholder="Describe your proof angle…"
            />
          </div>
        </div>
      </SectionCard>

      <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        The CTA button, subline and scarcity line are injected automatically from the Global CTA and are not generated here.
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : hasOutput ? <RotateCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Final CTA"}
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
              {key === "cta_subheadline" && (
                <div className="mt-2 p-3 rounded-md border border-dashed border-primary/40 bg-primary/5 text-xs text-muted-foreground">
                  [Global CTA button + subline + scarcity line]
                </div>
              )}
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
};

export default FinalCTAUI;
