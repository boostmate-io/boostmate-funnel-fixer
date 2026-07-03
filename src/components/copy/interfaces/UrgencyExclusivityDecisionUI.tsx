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

const SECTION_HEADLINE: Option[] = [
  AI,
  { value: "decision_moment", label: "Decision moment" },
  { value: "time_to_choose", label: "Time to choose" },
  { value: "dont_stay_stuck", label: "Don't stay stuck" },
  { value: "what_happens_next", label: "What happens next?" },
  { value: "your_next_move", label: "Your next move" },
  { value: "custom", label: "Custom" },
];

const SECTION_SUBHEADLINE: Option[] = [
  AI,
  { value: "urgency_focused", label: "Urgency-focused" },
  { value: "opportunity_focused", label: "Opportunity-focused" },
  { value: "reflection_focused", label: "Reflection-focused" },
  { value: "limited_availability", label: "Limited availability" },
  { value: "custom", label: "Custom" },
];

const LEFT_TITLE: Option[] = [
  AI,
  { value: "stay_where_you_are", label: "Stay where you are" },
  { value: "keep_doing", label: "Keep doing what you've been doing" },
  { value: "stay_stuck", label: "Stay stuck" },
  { value: "do_nothing", label: "Do nothing" },
  { value: "custom", label: "Custom" },
];

const LEFT_FOCUS: Option[] = [
  AI,
  { value: "emotional", label: "Emotional consequences" },
  { value: "business", label: "Business consequences" },
  { value: "lifestyle", label: "Lifestyle consequences" },
  { value: "mixed", label: "Mixed" },
];

const RIGHT_TITLE: Option[] = [
  AI,
  { value: "move_forward", label: "Move forward" },
  { value: "start_today", label: "Start today" },
  { value: "choose_growth", label: "Choose growth" },
  { value: "apply_now", label: "Apply now" },
  { value: "custom", label: "Custom" },
];

const RIGHT_FOCUS: Option[] = [
  AI,
  { value: "confidence", label: "Confidence" },
  { value: "results", label: "Results" },
  { value: "freedom", label: "Freedom" },
  { value: "identity_shift", label: "Identity shift" },
  { value: "mixed", label: "Mixed" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "Reuse Hero CTA" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "section_headline",
  "section_subheadline",
  "option_1_title",
  "option_1_point_1",
  "option_1_point_2",
  "option_1_point_3",
  "option_1_point_4",
  "option_1_question",
  "option_2_title",
  "option_2_point_1",
  "option_2_point_2",
  "option_2_point_3",
  "option_2_point_4",
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

const UrgencyExclusivityDecisionUI = ({
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
      toast.success("Decision section generated");
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

      <SectionCard title="Left Column — Stay where you are">
        <div>
          <Label className="text-xs text-muted-foreground">Title style</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.left_title_pattern || "ai_recommended"}
              onChange={(v) => s("left_title_pattern", v)}
              options={LEFT_TITLE}
              customValue={inputs.left_title_pattern_custom}
              onCustomChange={(v) => s("left_title_pattern_custom", v)}
              customPlaceholder="Write your own title…"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Focus</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.left_focus || "ai_recommended"}
              onChange={(v) => s("left_focus", v)}
              options={LEFT_FOCUS}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Right Column — Move forward">
        <div>
          <Label className="text-xs text-muted-foreground">Title style</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.right_title_pattern || "ai_recommended"}
              onChange={(v) => s("right_title_pattern", v)}
              options={RIGHT_TITLE}
              customValue={inputs.right_title_pattern_custom}
              onCustomChange={(v) => s("right_title_pattern_custom", v)}
              customPlaceholder="Write your own title…"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Focus</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.right_focus || "ai_recommended"}
              onChange={(v) => s("right_focus", v)}
              options={RIGHT_FOCUS}
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Decision Section"}
        </Button>
      </div>

      {hasOutput && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-display font-bold text-foreground">Generated Output</h4>

          {/* Header */}
          {(outputs.section_headline || outputs.section_subheadline) && (
            <div className="space-y-2">
              {["section_headline", "section_subheadline"].map(key => outputs[key] ? (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                    <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                      onClick={() => handleRegenerateField(key)}
                      disabled={regeneratingField !== null || generating}>
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

          {/* Two comparison cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs uppercase tracking-wide text-destructive">Current path</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {["option_1_title", "option_1_point_1", "option_1_point_2", "option_1_point_3", "option_1_point_4", "option_1_question"].map(key => outputs[key] ? (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                        onClick={() => handleRegenerateField(key)}
                        disabled={regeneratingField !== null || generating}>
                        {regeneratingField === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                      </Button>
                    </div>
                    <div className="text-sm p-3 rounded-md bg-background border border-border/50 whitespace-pre-wrap">
                      {outputs[key]}
                    </div>
                  </div>
                ) : null)}
              </CardContent>
            </Card>

            {/* Right */}
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs uppercase tracking-wide text-primary">Better path</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {["option_2_title", "option_2_point_1", "option_2_point_2", "option_2_point_3", "option_2_point_4"].map(key => outputs[key] ? (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                        onClick={() => handleRegenerateField(key)}
                        disabled={regeneratingField !== null || generating}>
                        {regeneratingField === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                      </Button>
                    </div>
                    <div className="text-sm p-3 rounded-md bg-background border border-border/50 whitespace-pre-wrap">
                      {outputs[key]}
                    </div>
                  </div>
                ) : null)}
              </CardContent>
            </Card>
          </div>

          {/* CTA block */}
          <div className="space-y-2">
            {["cta_button_text", "cta_subtext", "scarcity_line", "bottom_social_proof"].map(key => outputs[key] ? (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                  <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                    onClick={() => handleRegenerateField(key)}
                    disabled={regeneratingField !== null || generating}>
                    {regeneratingField === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="text-sm p-3 rounded-md bg-muted/50 border border-border/50 whitespace-pre-wrap">
                  {outputs[key]}
                </div>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgencyExclusivityDecisionUI;
