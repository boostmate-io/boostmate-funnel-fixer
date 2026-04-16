import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCw, Loader2 } from "lucide-react";
import { executeAIAction } from "@/lib/api/aiActions";
import { toast } from "sonner";

interface GenericComponentUIProps {
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

/**
 * Generic/dummy component UI interface.
 * This is the fallback for any component that doesn't have a dedicated UI.
 */
const GenericComponentUI = ({
  componentSlug,
  aiActionSlug,
  componentInstructions,
  context,
  inputs,
  outputs,
  onInputsChange,
  onOutputsChange,
  onGenerated,
}: GenericComponentUIProps) => {
  const { t } = useTranslation();
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
        inputs: {
          ...inputs,
          context,
        },
        extraInstructions: componentInstructions || undefined,
      });
      onOutputsChange(result.output);
      onGenerated();
      toast.success("Content generated");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const outputKeys = Object.keys(outputs);
  const hasOutput = outputKeys.length > 0 && outputKeys.some(k => outputs[k]);

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

      {/* Generate buttons */}
      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasOutput ? (
            <RotateCw className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? "Generating..." : hasOutput ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {/* Output section */}
      {hasOutput && (
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
                      value={item}
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
                  value={outputs[key] || ""}
                  onChange={e => onOutputsChange({ ...outputs, [key]: e.target.value })}
                  className="min-h-[80px] text-sm"
                />
              )}
            </div>
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
