import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RotateCw, Loader2, ChevronDown } from "lucide-react";
import { executeAIAction } from "@/lib/api/aiActions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  { value: "frequently_asked_questions", label: "Frequently Asked Questions" },
  { value: "everything_you_might_be_wondering", label: "Everything you might be wondering" },
  { value: "before_you_apply", label: "Before you apply" },
  { value: "lets_answer_your_questions", label: "Let's answer your questions" },
  { value: "still_have_questions", label: "Still have questions?" },
  { value: "custom", label: "Custom" },
];

const SECTION_SUBHEADLINE: Option[] = [
  AI,
  { value: "transparency_focused", label: "Transparency-focused" },
  { value: "reassurance_focused", label: "Reassurance-focused" },
  { value: "decision_focused", label: "Decision-focused" },
  { value: "friendly", label: "Friendly" },
  { value: "custom", label: "Custom" },
];

const NUM_FAQS: Option[] = [
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "8", label: "8" },
];

const FAQ_FOCUS: Option[] = [
  AI,
  { value: "time_commitment", label: "Time commitment" },
  { value: "suitability", label: "Suitability" },
  { value: "results", label: "Results" },
  { value: "risk", label: "Risk" },
  { value: "pricing", label: "Pricing" },
  { value: "mixed", label: "Mixed" },
];

const ANSWER_STYLE: Option[] = [
  { value: "short", label: "Short" },
  { value: "detailed", label: "Detailed" },
  { value: "conversational", label: "Conversational" },
  { value: "reassuring", label: "Reassuring" },
];

const buildOutputOrder = (n: number) => {
  const arr = ["section_headline", "section_subheadline"];
  for (let i = 1; i <= n; i++) {
    arr.push(`faq_${i}_question`, `faq_${i}_answer`);
  }
  return arr;
};

const buildOutputStructure = (n: number) => {
  const arr: Array<{ key: string; label: string; type: string }> = [
    { key: "section_headline", label: "Section Headline", type: "text" },
    { key: "section_subheadline", label: "Section Subheadline", type: "text" },
  ];
  for (let i = 1; i <= n; i++) {
    arr.push({ key: `faq_${i}_question`, label: `FAQ ${i} - Question`, type: "text" });
    arr.push({ key: `faq_${i}_answer`, label: `FAQ ${i} - Answer`, type: "long_text" });
  }
  return arr;
};

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

const FAQObjectionsUI = ({
  aiActionSlug, componentInstructions, context, inputs, outputs, outputStructure,
  onInputsChange, onOutputsChange, onGenerated,
}: Props) => {
  const [generating, setGenerating] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const s = (key: string, value: any) => onInputsChange({ ...inputs, [key]: value });

  const numFaqs = parseInt(inputs.num_faqs || "5", 10);

  const runStructure = numFaqs === 5 ? outputStructure : buildOutputStructure(numFaqs);

  const handleGenerate = async () => {
    if (!aiActionSlug) { toast.error("No AI Action linked to this component"); return; }
    setGenerating(true);
    try {
      const result = await executeAIAction({
        slug: aiActionSlug,
        inputs: { ...inputs, context },
        extraInstructions: componentInstructions || undefined,
        outputStructure: runStructure,
      });
      onOutputsChange(result.output);
      onGenerated();
      toast.success("FAQ generated");
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
        outputStructure: runStructure,
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

  const OUTPUT_ORDER = buildOutputOrder(Math.max(numFaqs, 8));
  const rawKeys = Object.keys(outputs);
  const outputKeys = [
    ...OUTPUT_ORDER.filter(k => rawKeys.includes(k)),
    ...rawKeys.filter(k => !OUTPUT_ORDER.includes(k)),
  ];
  const hasOutput = outputKeys.some(k => outputs[k]);

  const generatedFaqs: Array<{ n: number; q: string; a: string }> = [];
  for (let i = 1; i <= 12; i++) {
    const q = outputs[`faq_${i}_question`];
    const a = outputs[`faq_${i}_answer`];
    if (q || a) generatedFaqs.push({ n: i, q: q || "", a: a || "" });
  }

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

      <SectionCard title="FAQ Generation">
        <div>
          <Label className="text-xs text-muted-foreground">Number of FAQs</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.num_faqs || "5"}
              onChange={(v) => s("num_faqs", v)}
              options={NUM_FAQS}
              cols={4}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Focus</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.faq_focus || "ai_recommended"}
              onChange={(v) => s("faq_focus", v)}
              options={FAQ_FOCUS}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Answer style</Label>
          <div className="mt-2">
            <PatternPicker
              value={inputs.answer_style || "short"}
              onChange={(v) => s("answer_style", v)}
              options={ANSWER_STYLE}
            />
          </div>
        </div>
      </SectionCard>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : hasOutput ? <RotateCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate FAQ"}
        </Button>
      </div>

      {hasOutput && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-display font-bold text-foreground">Generated Output</h4>

          {/* Headline / Subheadline */}
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
              <Textarea value={outputs[key] || ""} onChange={(e) => onOutputsChange({ ...outputs, [key]: e.target.value })} className="text-sm min-h-[70px]" />
            </div>
          ) : null)}

          {/* Accordion preview */}
          {generatedFaqs.length > 0 && (
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground mb-2 block">FAQ Accordion Preview</Label>
              <Accordion type="multiple" className="rounded-md border border-border/60 bg-background divide-y divide-border/60">
                {generatedFaqs.map(({ n, q, a }) => (
                  <AccordionItem key={n} value={`faq-${n}`} className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                      <span className="text-left">{q || `Question ${n}`}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">
                      {a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Editable per-field regenerate list */}
          <div className="space-y-3 pt-2">
            {generatedFaqs.map(({ n, q, a }) => (
              <Card key={n} className="border-border/50">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-display text-muted-foreground">FAQ {n}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Question</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                        onClick={() => handleRegenerateField(`faq_${n}_question`)}
                        disabled={regeneratingField !== null || generating}>
                        {regeneratingField === `faq_${n}_question` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                      </Button>
                    </div>
                    <Textarea value={q || ""} onChange={(e) => onOutputsChange({ ...outputs, [`faq_${n}_question`]: e.target.value })} className="text-sm min-h-[50px]" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Answer</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                        onClick={() => handleRegenerateField(`faq_${n}_answer`)}
                        disabled={regeneratingField !== null || generating}>
                        {regeneratingField === `faq_${n}_answer` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                      </Button>
                    </div>
                    <Textarea value={a || ""} onChange={(e) => onOutputsChange({ ...outputs, [`faq_${n}_answer`]: e.target.value })} className="text-sm min-h-[80px]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQObjectionsUI;
