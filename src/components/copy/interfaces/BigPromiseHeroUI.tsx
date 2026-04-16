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

interface BigPromiseHeroUIProps {
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

const PRE_HEADLINE_PATTERNS = [
  { value: "for_audience", label: "For [target audience]" },
  { value: "the_solution", label: "The [solution] for [target audience]" },
  { value: "finally", label: "Finally, a [solution] that works" },
  { value: "new_system", label: "New: [system name]" },
  { value: "attention", label: "Attention [audience]" },
  { value: "custom", label: "Custom" },
];

const HEADLINE_PATTERNS = [
  { value: "outcome_emotion", label: "Get [desired outcome] and [emotional result]" },
  { value: "how_to_timeframe", label: "How to get [result] in [timeframe]" },
  { value: "discover_mechanism", label: "Discover the [mechanism] to [outcome]" },
  { value: "benefit_without", label: "Get [benefit] without [obstacle]" },
  { value: "stop_start", label: "Stop [pain] and start [pleasure]" },
  { value: "custom", label: "Custom" },
];

const set = (
  inputs: Record<string, any>,
  key: string,
  value: any,
  onChange: (i: Record<string, any>) => void
) => onChange({ ...inputs, [key]: value });

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="border-border/50">
    <CardHeader className="pb-3 pt-4 px-4">
      <CardTitle className="text-sm font-display">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4 space-y-3">{children}</CardContent>
  </Card>
);

const BigPromiseHeroUI = ({
  componentSlug,
  aiActionSlug,
  componentInstructions,
  context,
  inputs,
  outputs,
  onInputsChange,
  onOutputsChange,
  onGenerated,
}: BigPromiseHeroUIProps) => {
  const [generating, setGenerating] = useState(false);

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

  const outputKeys = Object.keys(outputs);
  const hasOutput = outputKeys.length > 0 && outputKeys.some((k) => outputs[k]);
  const s = (key: string, value: any) => set(inputs, key, value, onInputsChange);

  return (
    <div className="space-y-4">
      {/* ── Pre-headline ── */}
      <SectionCard title="Pre-headline">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <RadioGroup
          value={inputs.pre_headline_pattern || "for_audience"}
          onValueChange={(v) => s("pre_headline_pattern", v)}
          className="grid grid-cols-2 gap-2"
        >
          {PRE_HEADLINE_PATTERNS.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem value={p.value} className="shrink-0" />
              <span>{p.label}</span>
            </label>
          ))}
        </RadioGroup>
        {inputs.pre_headline_pattern === "custom" && (
          <Input
            value={inputs.pre_headline_custom || ""}
            onChange={(e) => s("pre_headline_custom", e.target.value)}
            placeholder="Write your own pre-headline…"
            className="text-sm"
          />
        )}
      </SectionCard>

      {/* ── Main Headline ── */}
      <SectionCard title="Main Headline">
        <Label className="text-xs text-muted-foreground">Pattern</Label>
        <RadioGroup
          value={inputs.headline_pattern || "outcome_emotion"}
          onValueChange={(v) => s("headline_pattern", v)}
          className="grid grid-cols-2 gap-2"
        >
          {HEADLINE_PATTERNS.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem value={p.value} className="shrink-0" />
              <span>{p.label}</span>
            </label>
          ))}
        </RadioGroup>
        {inputs.headline_pattern === "custom" && (
          <Input
            value={inputs.headline_custom || ""}
            onChange={(e) => s("headline_custom", e.target.value)}
            placeholder="Write your own headline…"
            className="text-sm"
          />
        )}
      </SectionCard>

      {/* ── Subheadline / Objection handling ── */}
      <SectionCard title="Subheadline / Objection Handling">
        <div className="space-y-1.5">
          <Label className="text-xs">Common objection</Label>
          <Input
            value={inputs.objection || ""}
            onChange={(e) => s("objection", e.target.value)}
            placeholder={"e.g. \"I don't have time\""}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hesitation</Label>
          <Input
            value={inputs.hesitation || ""}
            onChange={(e) => s("hesitation", e.target.value)}
            placeholder={"e.g. \"I've tried everything\""}
            className="text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={inputs.include_even_if ?? true}
            onCheckedChange={(v) => s("include_even_if", v)}
          />
          <Label className="text-xs">Include "even if…" phrasing</Label>
        </div>
      </SectionCard>

      {/* ── CTA Section ── */}
      <SectionCard title="CTA Section">
        <div className="space-y-1.5">
          <Label className="text-xs">Desired action</Label>
          <Input
            value={inputs.cta_action || ""}
            onChange={(e) => s("cta_action", e.target.value)}
            placeholder='e.g. "Start your free trial"'
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tone</Label>
          <Select
            value={inputs.cta_tone || "strong"}
            onValueChange={(v) => s("cta_tone", v)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">Soft</SelectItem>
              <SelectItem value="strong">Strong</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* ── Guarantee ── */}
      <SectionCard title="Guarantee">
        <div className="space-y-1.5">
          <Label className="text-xs">Guarantee type</Label>
          <Input
            value={inputs.guarantee_type || ""}
            onChange={(e) => s("guarantee_type", e.target.value)}
            placeholder='e.g. "Money-back guarantee"'
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Duration</Label>
          <Input
            value={inputs.guarantee_duration || ""}
            onChange={(e) => s("guarantee_duration", e.target.value)}
            placeholder="e.g. 14 days, 30 days"
            className="text-sm"
          />
        </div>
      </SectionCard>

      {/* ── Testimonial snippet ── */}
      <SectionCard title="Testimonial Snippet">
        <div className="space-y-1.5">
          <Label className="text-xs">Desired result to highlight</Label>
          <Input
            value={inputs.testimonial_result || ""}
            onChange={(e) => s("testimonial_result", e.target.value)}
            placeholder='e.g. "Doubled their revenue in 3 months"'
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Proof angle</Label>
          <Input
            value={inputs.testimonial_proof_angle || ""}
            onChange={(e) => s("testimonial_proof_angle", e.target.value)}
            placeholder='e.g. "Before/after", "Specific numbers"'
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Manual override (optional)</Label>
          <Textarea
            value={inputs.testimonial_override || ""}
            onChange={(e) => s("testimonial_override", e.target.value)}
            placeholder="Paste an exact testimonial to use…"
            className="min-h-[60px] text-sm"
          />
        </div>
      </SectionCard>

      {/* ── Social proof ── */}
      <SectionCard title="Social Proof">
        <div className="flex items-center gap-2">
          <Switch
            checked={inputs.include_rating ?? false}
            onCheckedChange={(v) => s("include_rating", v)}
          />
          <Label className="text-xs">Include rating</Label>
        </div>
        {inputs.include_rating && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Rating</Label>
              <Input
                value={inputs.rating || ""}
                onChange={(e) => s("rating", e.target.value)}
                placeholder="e.g. 4.9/5"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Number of customers</Label>
              <Input
                value={inputs.customer_count || ""}
                onChange={(e) => s("customer_count", e.target.value)}
                placeholder="e.g. 2,500+"
                className="text-sm"
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Logos / credibility label ── */}
      <SectionCard title="Logos / Credibility Label">
        <div className="space-y-1.5">
          <Label className="text-xs">Label text</Label>
          <Input
            value={inputs.credibility_label || ""}
            onChange={(e) => s("credibility_label", e.target.value)}
            placeholder='e.g. "Trusted by", "Featured in"'
            className="text-sm"
          />
        </div>
      </SectionCard>

      {/* ── Generate ── */}
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

      {/* ── Output ── */}
      {hasOutput && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-display font-bold text-foreground">Generated Output</h4>
          {outputKeys.map((key) =>
            outputs[key] ? (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
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

export default BigPromiseHeroUI;
