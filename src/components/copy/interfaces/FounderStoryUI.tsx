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

const STORY_ANGLES: Option[] = [
  AI,
  { value: "personal_journey", label: "Personal Journey" },
  { value: "client_journey", label: "Client Journey" },
  { value: "business_journey", label: "Business Journey" },
  { value: "discovery_story", label: "Discovery Story" },
  { value: "mission_driven", label: "Mission Driven" },
  { value: "custom", label: "Custom" },
];

const EMOTIONAL_FOCUS: Option[] = [
  AI,
  { value: "frustration", label: "Frustration" },
  { value: "doubt", label: "Doubt" },
  { value: "failure", label: "Failure" },
  { value: "determination", label: "Determination" },
  { value: "hope", label: "Hope" },
  { value: "persistence", label: "Persistence" },
  { value: "custom", label: "Custom" },
];

const STORY_STRUCTURES: Option[] = [
  AI,
  { value: "struggle_realization", label: "Struggle → Realization" },
  { value: "failure_discovery", label: "Failure → Discovery" },
  { value: "before_after", label: "Before → After" },
  { value: "challenge_turning_point", label: "Challenge → Turning Point" },
  { value: "personal_transformation", label: "Personal Transformation" },
  { value: "custom", label: "Custom" },
];

const IMAGE_BLOCK_1: Option[] = [
  AI,
  { value: "founder", label: "Founder" },
  { value: "client", label: "Client" },
  { value: "workspace", label: "Workspace" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "illustration", label: "Illustration" },
  { value: "none", label: "None" },
];

const IMAGE_BLOCK_2: Option[] = [
  AI,
  { value: "founder", label: "Founder" },
  { value: "client", label: "Client" },
  { value: "working", label: "Working" },
  { value: "teaching", label: "Teaching" },
  { value: "illustration", label: "Illustration" },
  { value: "none", label: "None" },
];

const CTA_OPTIONS: Option[] = [
  { value: "reuse_hero", label: "Reuse Hero CTA" },
  { value: "generate_new", label: "Generate New CTA" },
];

const OUTPUT_ORDER = [
  "section_headline",
  "section_subheadline",
  "story_block_1_headline",
  "story_block_1",
  "story_block_1_image_prompt",
  "story_block_2_headline",
  "story_block_2",
  "story_block_2_image_prompt",
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

const FounderStoryUI = ({
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
      toast.success("Founder Story generated");
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
      <SectionCard title="Story Angle">
        <PatternPicker
          value={inputs.story_angle || "ai_recommended"}
          onChange={(v) => s("story_angle", v)}
          options={STORY_ANGLES}
          customValue={inputs.story_angle_custom}
          onCustomChange={(v) => s("story_angle_custom", v)}
          customPlaceholder="Write your own story angle…"
        />
      </SectionCard>

      <SectionCard title="Emotional Focus">
        <PatternPicker
          value={inputs.emotional_focus || "ai_recommended"}
          onChange={(v) => s("emotional_focus", v)}
          options={EMOTIONAL_FOCUS}
          customValue={inputs.emotional_focus_custom}
          onCustomChange={(v) => s("emotional_focus_custom", v)}
          customPlaceholder="Write your own emotional focus…"
        />
      </SectionCard>

      <SectionCard title="Story Structure">
        <PatternPicker
          value={inputs.story_structure || "ai_recommended"}
          onChange={(v) => s("story_structure", v)}
          options={STORY_STRUCTURES}
          customValue={inputs.story_structure_custom}
          onCustomChange={(v) => s("story_structure_custom", v)}
          customPlaceholder="Describe your own story structure…"
        />
      </SectionCard>

      <SectionCard title="Image Direction">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Story Block 1</Label>
            <PatternPicker
              value={inputs.image_direction_1 || "ai_recommended"}
              onChange={(v) => s("image_direction_1", v)}
              options={IMAGE_BLOCK_1}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Story Block 2</Label>
            <PatternPicker
              value={inputs.image_direction_2 || "ai_recommended"}
              onChange={(v) => s("image_direction_2", v)}
              options={IMAGE_BLOCK_2}
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
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Founder Story"}
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

export default FounderStoryUI;
