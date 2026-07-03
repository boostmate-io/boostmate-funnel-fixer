// =============================================================================
// FrameworkSection — Tab 1 builder for Signature Mechanism / Framework.
// Method name + brief description + dynamic pillar cards.
// Every field (framework meta + each pillar) has an AI Coach entry point.
// =============================================================================

import { Layers3, Trash2, Plus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import CoachIconButton from "./CoachIconButton";
import type { SignatureFramework, FrameworkPillar } from "../offerDesignTypes";
import type { AngleCoachSpec } from "./OfferAngleTab";

const newId = () => crypto.randomUUID();

interface Props {
  value: SignatureFramework | undefined;
  onChange: (next: SignatureFramework) => void;
  onCoach?: (spec: AngleCoachSpec) => void;
  /** Section-level Coach for the whole Pillars list. */
  onCoachPillars?: () => void;
}

const FrameworkSection = ({ value, onChange, onCoach, onCoachPillars }: Props) => {
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
          <h3 className="text-lg font-display font-bold text-foreground">Signature Mechanism / Framework</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Give your method a name and structure. This is what makes your offer ownable.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">
                Framework / Method Name
              </Label>
              {onCoach && (
                <CoachIconButton
                  compact
                  onClick={() =>
                    onCoach({
                      id: "offer_stack.angle.framework.name",
                      label: "Framework / Method Name",
                      helper: "A memorable name for your signature method. 2–5 words. Ownable.",
                      placeholder: "e.g. The Confidence Reset Method",
                      currentValue: framework.name ?? "",
                      apply: (v) => update({ name: v }),
                    })
                  }
                />
              )}
            </div>
            <Input
              value={framework.name ?? ""}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. The Confidence Reset Method"
              className="h-9"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">
                Brief Description
              </Label>
              {onCoach && (
                <CoachIconButton
                  compact
                  onClick={() =>
                    onCoach({
                      id: "offer_stack.angle.framework.description",
                      label: "Framework — Brief Description",
                      helper: "One line describing what makes the framework unique and why it works.",
                      placeholder: "What makes it unique and why it works",
                      currentValue: framework.description ?? "",
                      apply: (v) => update({ description: v }),
                    })
                  }
                />
              )}
            </div>
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
            <div className="flex items-center gap-1.5">
              {onCoachPillars && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCoachPillars}
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
                >
                  <MessageSquare className="w-3 h-3" />
                  Coach
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={addPillar} className="h-7 gap-1 text-xs">
                <Plus className="w-3 h-3" />
                Add Pillar
              </Button>
            </div>
          </div>

          {pillars.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Map the core pillars or steps of your method.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={addPillar} className="gap-1.5 text-primary hover:bg-primary/5">
                  <Plus className="w-3.5 h-3.5" />
                  Add First Pillar
                </Button>
                {onCoachPillars && (
                  <Button size="sm" variant="ghost" onClick={onCoachPillars} className="gap-1.5 text-primary hover:bg-primary/5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask Coach to suggest
                  </Button>
                )}
              </div>
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
                        {onCoach && (
                          <CoachIconButton
                            compact
                            onClick={() =>
                              onCoach({
                                id: `offer_stack.angle.framework.pillars.${p.id}.name`,
                                label: `Pillar ${idx + 1} — Name`,
                                helper: `The name of pillar ${idx + 1} in your framework. Short and evocative.`,
                                placeholder: `Pillar ${idx + 1} name`,
                                currentValue: p.name ?? "",
                                apply: (v) => updatePillar(p.id, { name: v }),
                              })
                            }
                          />
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removePillar(p.id)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="relative">
                        <AutoTextarea
                          value={p.description ?? ""}
                          onChange={(e) => updatePillar(p.id, { description: e.target.value })}
                          placeholder="What happens in this pillar?"
                          rows={2}
                          className="resize-none text-sm pr-10"
                        />
                        {onCoach && (
                          <div className="absolute top-1.5 right-1.5">
                            <CoachIconButton
                              compact
                              onClick={() =>
                                onCoach({
                                  id: `offer_stack.angle.framework.pillars.${p.id}.description`,
                                  label: `Pillar ${idx + 1} — Description`,
                                  helper: `What actually happens inside pillar ${idx + 1}? 1–2 sentences.`,
                                  placeholder: "What happens in this pillar?",
                                  currentValue: p.description ?? "",
                                  apply: (v) => updatePillar(p.id, { description: v }),
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
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
