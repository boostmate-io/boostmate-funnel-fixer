import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCw, Loader2 } from "lucide-react";
import { executeAIAction } from "@/lib/api/aiActions";
import { toast } from "sonner";
import ImageOutputField from "./ImageOutputField";

interface OutputFieldDef {
  key: string;
  label: string;
  type: string;
  item_schema?: any[];
  is_primary?: boolean;
}

interface GenericComponentUIProps {
  componentSlug: string;
  aiActionSlug: string;
  componentInstructions: string;
  context: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  outputStructure?: OutputFieldDef[];
  documentId?: string | null;
  subAccountId?: string | null;
  onInputsChange: (inputs: Record<string, any>) => void;
  onOutputsChange: (outputs: Record<string, any>) => void;
  onGenerated: () => void;
}

/**
 * Generic/dummy component UI interface.
 * This is the fallback for any component that doesn't have a dedicated UI.
 */
const GenericComponentUI = ({
  aiActionSlug,
  componentInstructions,
  context,
  inputs,
  outputs,
  outputStructure,
  documentId,
  subAccountId,
  onInputsChange,
  onOutputsChange,
  onGenerated,
}: GenericComponentUIProps) => {
  const { t: _t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  const structure: OutputFieldDef[] = outputStructure || [];
  const imageFields = structure.filter((f) => f.type === "image");
  const nonImageStructure = structure.filter((f) => f.type !== "image");

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
        // Strip image fields from what the LLM sees — they are user-uploaded.
        outputStructure: nonImageStructure,
      });
      // Merge with existing outputs so user-uploaded image fields survive regeneration.
      onOutputsChange({ ...outputs, ...result.output });
      onGenerated();
      toast.success("Content generated");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Determine which non-image keys exist in outputs (for display fallback when no structure defined).
  const outputKeys = Object.keys(outputs).filter((k) => !imageFields.some((f) => f.key === k));
  const hasTextOutput = outputKeys.length > 0 && outputKeys.some((k) => outputs[k]);

  return (
    <div className="space-y-6">
      {/* Input section */}
      <div className="space-y-4">
        <h4 className="text-sm font-display font-bold text-foreground">Inputs</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Custom Input</Label>
            <Textarea
              value={inputs.custom_input || ""}
              onChange={e => onInputsChange({ ...inputs, custom_input: e.target.value })}
              placeholder="Enter any specific instructions or input for this component..."
              className="min-h-[80px] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Target Audience</Label>
            <Input
              value={inputs.target_audience || ""}
              onChange={e => onInputsChange({ ...inputs, target_audience: e.target.value })}
              placeholder="Who is this for?"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tone of Voice</Label>
            <Input
              value={inputs.tone || ""}
              onChange={e => onInputsChange({ ...inputs, tone: e.target.value })}
              placeholder="e.g. Professional, casual, bold..."
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Generate button */}
      {nonImageStructure.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : hasTextOutput ? <RotateCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating..." : hasTextOutput ? "Regenerate" : "Generate"}
          </Button>
        </div>
      )}

      {/* Text output section */}
      {hasTextOutput && (
        <div className="space-y-4">
          <h4 className="text-sm font-display font-bold text-foreground">Output</h4>
          {outputKeys.map(key => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
              {Array.isArray(outputs[key]) ? (
                <div className="space-y-1">
                  {(outputs[key] as string[]).map((item, i) => (
                    <Textarea
                      key={i}
                      value={typeof item === "string" ? item : JSON.stringify(item)}
                      onChange={e => {
                        const updated = [...outputs[key]];
                        updated[i] = e.target.value;
                        onOutputsChange({ ...outputs, [key]: updated });
                      }}
                      className="min-h-[40px] text-sm"
                    />
                  ))}
                </div>
              ) : (
                <Textarea
                  value={typeof outputs[key] === "string" ? outputs[key] : ""}
                  onChange={e => onOutputsChange({ ...outputs, [key]: e.target.value })}
                  className="min-h-[80px] text-sm"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image fields (never LLM-generated) */}
      {imageFields.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-display font-bold text-foreground">Images</h4>
          {imageFields.map((f) => (
            <ImageOutputField
              key={f.key}
              label={f.label || f.key}
              value={outputs[f.key]}
              documentId={documentId ?? null}
              subAccountId={subAccountId ?? null}
              onChange={(v) => onOutputsChange({ ...outputs, [f.key]: v })}
            />
          ))}
        </div>
      )}

      {/* Raw output fallback */}
      {outputs.raw && !outputKeys.filter(k => k !== "raw").length && (
        <div className="space-y-1.5">
          <Label className="text-xs">Generated Content</Label>
          <Textarea
            value={outputs.raw || ""}
            onChange={e => onOutputsChange({ ...outputs, raw: e.target.value })}
            className="min-h-[200px] text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default GenericComponentUI;
