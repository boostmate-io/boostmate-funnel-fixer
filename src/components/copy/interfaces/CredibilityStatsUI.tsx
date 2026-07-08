import { isCtaFieldHidden } from "@/lib/copy/outputFilters";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, RotateCw, Loader2, Check } from "lucide-react";
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

const PROOF_TYPES = [
  { value: "years_experience", label: "Years Experience" },
  { value: "clients_helped", label: "Clients Helped" },
  { value: "results_achieved", label: "Results Achieved" },
  { value: "revenue_generated", label: "Revenue Generated" },
  { value: "success_rate", label: "Success Rate" },
  { value: "certifications", label: "Certifications" },
  { value: "awards", label: "Awards" },
  { value: "media_features", label: "Media Features" },
  { value: "other", label: "Other" },
];

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="border-border/50">
    <CardHeader className="pb-3 pt-4 px-4">
      <CardTitle className="text-sm font-display">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4 space-y-3">{children}</CardContent>
  </Card>
);

const OUTPUT_ORDER = [
  "stat_1_number", "stat_1_description",
  "stat_2_number", "stat_2_description",
  "stat_3_number", "stat_3_description",
  "stat_4_number", "stat_4_description",
];

const CredibilityStatsUI = ({
  aiActionSlug,
  componentInstructions, headlineInstructions,
  context,
  inputs,
  outputs,
  outputStructure,
  onInputsChange,
  onOutputsChange,
  onGenerated,
}: Props) => {
  const [generating, setGenerating] = useState(false);
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const s = (key: string, value: any) => onInputsChange({ ...inputs, [key]: value });

  const proofTypes: string[] = inputs.preferred_proof_types || [];
  const toggleProofType = (v: string) => {
    const next = proofTypes.includes(v) ? proofTypes.filter(x => x !== v) : [...proofTypes, v];
    s("preferred_proof_types", next);
  };

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
      toast.success("Credibility Stats generated");
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

  const numStats = inputs.number_of_stats || "ai_recommended";

  return (
    <div className="space-y-4">
      <SectionCard title="Number of Stats">
        <RadioGroup
          value={numStats}
          onValueChange={(v) => s("number_of_stats", v)}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { value: "ai_recommended", label: "AI Recommended" },
            { value: "3", label: "3 Stats" },
            { value: "4", label: "4 Stats" },
          ].map(o => (
            <label key={o.value} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value={o.value} className="shrink-0" />
              <span>{o.label}</span>
            </label>
          ))}
        </RadioGroup>
      </SectionCard>

      <SectionCard title="Preferred Proof Types">
        <p className="text-xs text-muted-foreground">AI Recommended is used when nothing is selected.</p>
        <div className="flex flex-wrap gap-2">
          {PROOF_TYPES.map(p => {
            const active = proofTypes.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => toggleProofType(p.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/50"
                }`}
              >
                {active && <Check className="w-3 h-3" />}
                {p.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Manual Overrides">
        <p className="text-xs text-muted-foreground">
          Leave empty for AI to auto-pick from the Business Blueprint. Filled fields are used as instructions.
        </p>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2 pt-1">
            <Label className="text-xs font-semibold">Stat {i}</Label>
            <Input
              value={inputs[`manual_stat_${i}_metric`] || ""}
              onChange={(e) => s(`manual_stat_${i}_metric`, e.target.value)}
              placeholder="Metric (optional)"
              className="text-sm"
            />
            <Input
              value={inputs[`manual_stat_${i}_description`] || ""}
              onChange={(e) => s(`manual_stat_${i}_description`, e.target.value)}
              placeholder="Description (optional)"
              className="text-sm"
            />
          </div>
        ))}
      </SectionCard>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : hasOutput ? <RotateCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating…" : hasOutput ? "Regenerate" : "Generate Credibility Stats"}
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
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
};

export default CredibilityStatsUI;
