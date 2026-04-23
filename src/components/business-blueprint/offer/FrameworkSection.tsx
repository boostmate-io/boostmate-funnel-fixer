// =============================================================================
// FrameworkSection — Tab 1 builder for Signature Mechanism / Framework.
// Method name + brief description + dynamic pillar cards.
// =============================================================================

import { Layers3, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SignatureFramework, FrameworkPillar } from "../offerDesignTypes";

const newId = () => crypto.randomUUID();

interface Props {
  value: SignatureFramework | undefined;
  onChange: (next: SignatureFramework) => void;
}

const FrameworkSection = ({ value, onChange }: Props) => {
  const framework: SignatureFramework = value ?? { pillars: [] };
  const pillars = framework.pillars ?? [];

  const update = (patch: Partial<SignatureFramework>) =>
    onChange({ ...framework, pillars: pillars, ...patch });

  const addPillar = () =>
    update({
      pillars: [
        ...pillars,
        { id: newId(), name: "", description: "" },
      ],
    });

  const updatePillar = (id: string, patch: Partial<FrameworkPillar>) =>
    update({ pillars: pillars.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const removePillar = (id: string) =>
    update({ pillars: pillars.filter((p) => p.id !== id) });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Layers3 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Signature Mechanism / Framework</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Give your method a name and structure. This is what makes your offer ownable.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Framework / Method Name
            </Label>
            <Input
              value={framework.name ?? ""}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. The Confidence Reset Method"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Brief Description
            </Label>
            <Input
              value={framework.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="What makes it unique and why it works"
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">
              Core Pillars / Steps
            </Label>
            <Button size="sm" variant="outline" onClick={addPillar} className="h-7 gap-1 text-xs">
              <Plus className="w-3 h-3" />
              Add Pillar
            </Button>
          </div>

          {pillars.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Map the core pillars or steps of your method.
              </p>
              <Button size="sm" variant="ghost" onClick={addPillar} className="gap-1.5 text-primary hover:bg-primary/5">
                <Plus className="w-3.5 h-3.5" />
                Add First Pillar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pillars.map((p, idx) => (
                <div key={p.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <Input
                          value={p.name}
                          onChange={(e) => updatePillar(p.id, { name: e.target.value })}
                          placeholder={`Pillar ${idx + 1} name`}
                          className="h-9 font-medium"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removePillar(p.id)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={p.description ?? ""}
                        onChange={(e) => updatePillar(p.id, { description: e.target.value })}
                        placeholder="What happens in this pillar?"
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrameworkSection;
