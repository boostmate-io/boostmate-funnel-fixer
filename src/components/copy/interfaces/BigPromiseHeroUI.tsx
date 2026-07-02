import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, RotateCw, Loader2 } from "lucide-react";
import { executeAIAction } from "@/lib/api/aiActions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeroSectionUIProps {
  componentSlug: string;
  aiActionSlug: string;
  componentInstructions: string;
  context: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  onInputsChange: (inputs: Record<string, any>) => void;
  onOutputsChange: (outputs: Record<string, any>) => void;
  onGenerated: () => void;
}

type Option = { value: string; label: string };

const AI = { value: "ai_recommended", label: "AI Recommended" };

const ANNOUNCEMENT_PATTERNS: Option[] = [
  AI,
  { value: "scarcity", label: "Scarcity" },
  { value: "authority", label: "Authority" },
  { value: "social_proof", label: "Social Proof" },
  { value: "pain_problem", label: "Pain / Problem" },
  { value: "custom", label: "Custom" },
];

const PROOF_BADGE_PATTERNS: Option[] = [
  AI,
  { value: "years_experience", label: "Years Experience" },
  { value: "clients_helped", label: "Clients Helped" },
  { value: "results_achieved", label: "Results Achieved" },
  { value: "rating", label: "Rating" },
  { value: "featured_in", label: "Featured In" },
  { value: "custom", label: "Custom" },
];

const PRE_HEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "for_audience", label: "For [target audience]" },
  { value: "the_solution", label: "The [solution] for [target audience]" },
  { value: "finally", label: "Finally, a [solution] that works" },
  { value: "new_system", label: "New: [system name]" },
  { value: "attention", label: "Attention [audience]" },
  { value: "are_you", label: "Are you [specific pain or frustration]?" },
  { value: "custom", label: "Custom" },
];

const HEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "outcome_emotion", label: "Get [desired outcome] and [emotional result]" },
  { value: "how_to_timeframe", label: "How to get [result] in [timeframe]" },
  { value: "discover_mechanism", label: "Discover the [mechanism] to [outcome]" },
  { value: "benefit_without", label: "Get [benefit] without [obstacle]" },
  { value: "stop_start", label: "Stop [pain] and start [pleasure]" },
  { value: "track_record", label: "Over the past [X years], we've helped [number] [audience] achieve [result]" },
  { value: "custom", label: "Custom" },
];

const SUBHEADLINE_PATTERNS: Option[] = [
  AI,
  { value: "objection_handling", label: "Objection Handling" },
  { value: "authority", label: "Authority" },
  { value: "empathy", label: "Empathy" },
  { value: "expand_promise", label: "Expand the Promise" },
  { value: "custom", label: "Custom" },
];

const VIDEO_INTRO_PATTERNS: Option[] = [
  AI,
  { value: "watch_how", label: "Watch how it works" },
  { value: "discover_system", label: "Discover the system" },
  { value: "client_success", label: "Client Success Story" },
  { value: "custom", label: "Custom" },
];

const CTA_GOALS: Option[] = [
  AI,
  { value: "book_strategy_call", label: "Book Strategy Call" },
  { value: "apply_now", label: "Apply Now" },
  { value: "schedule_consultation", label: "Schedule Consultation" },
  { value: "get_started", label: "Get Started" },
  { value: "learn_more", label: "Learn More" },
  { value: "custom", label: "Custom" },
];

const CTA_SUBTEXT_PATTERNS: Option[] = [
  AI,
  { value: "free_call", label: "Free Call" },
  { value: "no_obligation", label: "No Obligation" },
  { value: "limited_spots", label: "Limited Spots" },
  { value: "takes_only_x", label: "Takes Only X Minutes" },
  { value: "custom", label: "Custom" },
];

const BOTTOM_SOCIAL_PROOF_PATTERNS: Option[] = [
  AI,
  { value: "loved_by", label: "Loved by X Clients" },
  { value: "trusted_by", label: "Trusted by X Clients" },
  { value: "join_x", label: "Join X Members" },
  { value: "custom", label: "Custom" },
];

const TESTIMONIAL_SOURCES: Option[] = [
  AI,
  { value: "select_existing", label: "Select Existing Testimonial" },
  { value: "custom", label: "Custom Testimonial" },
];

const LOGO_LABEL_PATTERNS: Option[] = [
  AI,
  { value: "trusted_by", label: "Trusted By" },
  { value: "clients_include", label: "Clients Include" },
  { value: "featured_in", label: "Featured In" },
  { value: "used_by", label: "Used By" },
  { value: "custom", label: "Custom" },
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
  value,
  onChange,
  options,
  customValue,
  onCustomChange,
  customPlaceholder = "Write your own…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  customValue?: string;
  onCustomChange?: (v: string) => void;
  customPlaceholder?: string;
}) => (
  <>
    <RadioGroup
      value={value || "ai_recommended"}
      onValueChange={onChange}
      className="grid grid-cols-2 gap-2"
    >
      {options.map((p) => (
        <label
          key={p.value}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
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

const HeroSectionUI = ({
  aiActionSlug,
  componentInstructions,
  context,
  inputs,
  outputs,
  onInputsChange,
  onOutputsChange,
  onGenerated,
}: HeroSectionUIProps) => {
  const [generating, setGenerating] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const s = (key: string, value: any) => onInputsChange({ ...inputs, [key]: value });

  const handleGenerate = async () => {
    if (!aiActionSlug) {
      toast.error("No AI Action linked to this component");
      return;
    }
    setGenerating(true);
    try {
      const result = await executeAIAction({
        slug: aiActionSlug,
        inputs: { ...inputs, context },
        extraInstructions: componentInstructions || undefined,
      });
      onOutputsChange(result.output);
      onGenerated();
      toast.success("Hero section generated");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateField = async (fieldKey: string) => {
    if (!aiActionSlug) {
      toast.error("No AI Action linked to this component");
      return;
    }
    setRegeneratingField(fieldKey);
    try {
      const fieldLabel = fieldKey.replace(/_/g, " ");
      const existingOutputSummary = Object.entries(outputs)
        .filter(([k, v]) => k !== fieldKey && v)
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
        .join("\n");
      const focusInstruction = `IMPORTANT: Only regenerate the "${fieldLabel}" field. Keep all other fields consistent with the existing output below and return a fresh, different variation for "${fieldLabel}" only.\n\nEXISTING OUTPUT (keep these unchanged in your response):\n${existingOutputSummary}\n\n${componentInstructions || ""}`;
      const result = await executeAIAction({
        slug: aiActionSlug,
        inputs: { ...inputs, context },
        extraInstructions: focusInstruction,
      });
      if (result.output && result.output[fieldKey] !== undefined && result.output[fieldKey] !== "") {
        onOutputsChange({ ...outputs, [fieldKey]: result.output[fieldKey] });
        onGenerated();
        toast.success(`${fieldLabel} regenerated`);
      } else {
        toast.error(`No "${fieldLabel}" returned by AI`);
      }
    } catch (e: any) {
      toast.error(e.message || "Regeneration failed");
    } finally {
      setRegeneratingField(null);
    }
  };

  const OUTPUT_ORDER = [
    "announcement_bar",
    "proof_badge",
    "pre_headline",
    "headline",
    "subheadline",
    "video_intro",
    "cta_button_text",
    "cta_subtext",
    "scarcity_line",
    "bottom_social_proof",
    "testimonial_quote",
    "testimonial_author",
    "logo_label",
  ];
  const rawKeys = Object.keys(outputs);
  const outputKeys = [
    ...OUTPUT_ORDER.filter((k) => rawKeys.includes(k)),
    ...rawKeys.filter((k) => !OUTPUT_ORDER.includes(k)),
  ];
  const hasOutput = outputKeys.length > 0 && outputKeys.some((k) => outputs[k]);

  return (
    <div className="space-y-4">
      <SectionCard title="Announcement Bar">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.announcement_pattern || "ai_recommended"}
          onChange={(v) => s("announcement_pattern", v)}
          options={ANNOUNCEMENT_PATTERNS}
          customValue={inputs.announcement_custom}
          onCustomChange={(v) => s("announcement_custom", v)}
          customPlaceholder="Write your own announcement…"
        />
      </SectionCard>

      <SectionCard title="Proof Badge">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.proof_badge_pattern || "ai_recommended"}
          onChange={(v) => s("proof_badge_pattern", v)}
          options={PROOF_BADGE_PATTERNS}
          customValue={inputs.proof_badge_custom}
          onCustomChange={(v) => s("proof_badge_custom", v)}
          customPlaceholder="Write your own proof badge…"
        />
      </SectionCard>

      <SectionCard title="Pre-headline">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.pre_headline_pattern || "ai_recommended"}
          onChange={(v) => s("pre_headline_pattern", v)}
          options={PRE_HEADLINE_PATTERNS}
          customValue={inputs.pre_headline_custom}
          onCustomChange={(v) => s("pre_headline_custom", v)}
          customPlaceholder="Write your own pre-headline…"
        />
      </SectionCard>

      <SectionCard title="Main Headline">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.headline_pattern || "ai_recommended"}
          onChange={(v) => s("headline_pattern", v)}
          options={HEADLINE_PATTERNS}
          customValue={inputs.headline_custom}
          onCustomChange={(v) => s("headline_custom", v)}
          customPlaceholder="Write your own headline…"
        />
      </SectionCard>

      <SectionCard title="Subheadline">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.subheadline_pattern || "ai_recommended"}
          onChange={(v) => s("subheadline_pattern", v)}
          options={SUBHEADLINE_PATTERNS}
          customValue={inputs.subheadline_custom}
          onCustomChange={(v) => s("subheadline_custom", v)}
          customPlaceholder="Write your own subheadline direction…"
        />
      </SectionCard>

      <SectionCard title="Video">
        <div className="flex items-center gap-2">
          <Switch
            checked={inputs.include_video ?? false}
            onCheckedChange={(v) => s("include_video", v)}
          />
          <Label className="text-xs">Include Video</Label>
        </div>
        {inputs.include_video && (
          <>
            <Label className="text-xs text-muted-foreground">Video Intro Pattern</Label>
            <PatternPicker
              value={inputs.video_intro_pattern || "ai_recommended"}
              onChange={(v) => s("video_intro_pattern", v)}
              options={VIDEO_INTRO_PATTERNS}
              customValue={inputs.video_intro_custom}
              onCustomChange={(v) => s("video_intro_custom", v)}
              customPlaceholder="Write your own video intro…"
            />
          </>
        )}
      </SectionCard>

      <SectionCard title="CTA">
        <Label className="text-xs text-muted-foreground">Primary Goal</Label>
        <PatternPicker
          value={inputs.cta_goal || "ai_recommended"}
          onChange={(v) => s("cta_goal", v)}
          options={CTA_GOALS}
          customValue={inputs.cta_goal_custom}
          onCustomChange={(v) => s("cta_goal_custom", v)}
          customPlaceholder="Write your own CTA goal…"
        />
        <div className="space-y-1.5 pt-2">
          <Label className="text-xs">Tone</Label>
          <Select
            value={inputs.cta_tone || "strong"}
            onValueChange={(v) => s("cta_tone", v)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strong">Strong</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard title="CTA Subtext">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.cta_subtext_pattern || "ai_recommended"}
          onChange={(v) => s("cta_subtext_pattern", v)}
          options={CTA_SUBTEXT_PATTERNS}
          customValue={inputs.cta_subtext_custom}
          onCustomChange={(v) => s("cta_subtext_custom", v)}
          customPlaceholder="Write your own CTA subtext…"
        />
      </SectionCard>

      <SectionCard title="Bottom Social Proof Badge">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <PatternPicker
          value={inputs.bottom_social_proof_pattern || "ai_recommended"}
          onChange={(v) => s("bottom_social_proof_pattern", v)}
          options={BOTTOM_SOCIAL_PROOF_PATTERNS}
          customValue={inputs.bottom_social_proof_custom}
          onCustomChange={(v) => s("bottom_social_proof_custom", v)}
          customPlaceholder="Write your own social proof badge…"
        />
      </SectionCard>

      <SectionCard title="Featured Testimonial">
        <Label className="text-xs text-muted-foreground">Testimonial Source</Label>
        <PatternPicker
          value={inputs.testimonial_source || "ai_recommended"}
          onChange={(v) => s("testimonial_source", v)}
          options={TESTIMONIAL_SOURCES}
        />
        {inputs.testimonial_source === "custom" && (
          <Textarea
            value={inputs.testimonial_override || ""}
            onChange={(e) => s("testimonial_override", e.target.value)}
            placeholder="Paste your custom testimonial…"
            className="min-h-[60px] text-sm mt-2"
          />
        )}
      </SectionCard>

      <SectionCard title="Featured Logos">
        <Label className="text-xs text-muted-foreground">Label Pattern</Label>
        <PatternPicker
          value={inputs.logo_label_pattern || "ai_recommended"}
          onChange={(v) => s("logo_label_pattern", v)}
          options={LOGO_LABEL_PATTERNS}
          customValue={inputs.logo_label_custom}
          onCustomChange={(v) => s("logo_label_custom", v)}
          customPlaceholder="Write your own label…"
        />
      </SectionCard>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasOutput ? (
            <RotateCw className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Hero Section"}
        </Button>
      </div>

      {hasOutput && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-display font-bold text-foreground">Generated Output</h4>
          {outputKeys.map((key) =>
            outputs[key] ? (
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
                    {regeneratingField === key ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCw className="w-3 h-3" />
                    )}
                    Regenerate
                  </Button>
                </div>
                <Textarea
                  value={outputs[key] || ""}
                  onChange={(e) => onOutputsChange({ ...outputs, [key]: e.target.value })}
                  className="min-h-[60px] text-sm"
                />
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};

export default HeroSectionUI;
