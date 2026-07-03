// =============================================================================
// OfferAngleTab — Tab 1 (redesigned)
// Every field has an AI Coach entry point, including the structured
// Framework and Core Promise builders.
// =============================================================================

import { useMemo, useState } from "react";
import { Lightbulb, Sparkles, Shield, FileText, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import SectionShell from "./SectionShell";
import AngleField from "./AngleField";
import TimeframePicker from "./TimeframePicker";
import FrameworkSection from "./FrameworkSection";
import CoachIconButton from "./CoachIconButton";
import {
  type OfferAngleData,
  buildPromisePreview,
  calcAngleProgress,
} from "../offerDesignTypes";
import { getBusinessType } from "../businessTypes";
import CoachPanel from "@/components/coach/CoachPanel";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { buildBlueprintFieldContext } from "@/lib/coach/buildContext";
import type { BlueprintRow } from "../types";

interface Props {
  data: OfferAngleData;
  onChange: (patch: Partial<OfferAngleData>) => void;
  saving: boolean;
  businessType?: string;
  embedded?: boolean;
}

/**
 * A CoachSpec describes any field the Coach can help with — flat, nested, or
 * inside a dynamic sub-item (e.g. a specific framework pillar). The `apply`
 * callback lets each caller decide how to route the returned draft back into
 * the OfferAngleData shape.
 */
export interface AngleCoachSpec {
  id: string; // stable identifier used by the coach engine
  label: string;
  helper?: string;
  placeholder?: string;
  currentValue: string;
  apply: (value: string) => void;
}

const OfferAngleTab = ({ data, onChange, saving, businessType, embedded }: Props) => {
  const bt = getBusinessType(businessType);
  const noun = bt.customerNoun;
  const progress = calcAngleProgress(data);
  const [coachSpec, setCoachSpec] = useState<AngleCoachSpec | null>(null);
  const { activeSubAccountId } = useWorkspace();

  const openCoach = (spec: AngleCoachSpec) => setCoachSpec(spec);

  const coachContext = useMemo(() => {
    if (!coachSpec || !activeSubAccountId) return null;
    const snapshot = { offer_stack: { angle: data } } as unknown as BlueprintRow;
    return buildBlueprintFieldContext(
      {
        id: coachSpec.id,
        label: coachSpec.label,
        helper: coachSpec.helper,
        placeholder: coachSpec.placeholder,
        currentValue: coachSpec.currentValue,
      },
      snapshot,
      activeSubAccountId,
    );
  }, [coachSpec, data, activeSubAccountId]);

  const promisePreview = buildPromisePreview(data.core_promise);

  const promise = data.core_promise;
  const updatePromise = (patch: Partial<NonNullable<OfferAngleData["core_promise"]>>) => {
    onChange({
      core_promise: {
        desired_outcome: promise?.desired_outcome ?? "",
        timeframe: promise?.timeframe ?? "90_days",
        timeframe_custom: promise?.timeframe_custom,
        guarantee: promise?.guarantee,
        ...patch,
      },
    });
  };

  const feedback =
    progress >= 100
      ? "World-class positioning. Your offer is the obvious choice."
      : progress >= 80
      ? "Strong angle — almost there."
      : progress >= 50
      ? "Good start. Keep sharpening what makes your method genuinely new."
      : null;

  return (
    <SectionShell
      icon={Lightbulb}
      title="Offer Angle"
      description={`Craft a compelling angle that makes your offer impossible to ignore for ${noun}.`}
      insight={`${noun.charAt(0).toUpperCase() + noun.slice(1)} buy from the offer that feels uniquely built for their problem. A strong angle = a stronger close.`}
      progress={progress}
      saving={saving}
      feedback={feedback}
      embedded={embedded}
    >
      {/* 1. Main Offer Name */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <Label className="text-lg font-display font-bold text-foreground">Main Offer Name</Label>
            <p className="text-xs text-muted-foreground mt-1">What is your flagship offer called?</p>
          </div>
          <CoachIconButton
            onClick={() =>
              openCoach({
                id: "offer_stack.angle.main_offer_name",
                label: "Main Offer Name",
                helper: "Short, 3–6 words. Just the name of your flagship offer.",
                placeholder: "e.g. The Confidence Reset, Lead Engine 90…",
                currentValue: data.main_offer_name ?? "",
                apply: (value) => onChange({ main_offer_name: value }),
              })
            }
          />
        </div>
        <Input
          value={data.main_offer_name ?? ""}
          onChange={(e) => onChange({ main_offer_name: e.target.value })}
          placeholder="e.g. The Confidence Reset, Lead Engine 90, Scale Sprint…"
          className="h-10"
        />
      </div>

      {/* 2. Short Offer Description + 3. Core Outcome */}
      <div className="space-y-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <Label className="text-lg font-display font-bold text-foreground">Short Offer Description</Label>
            </div>
            <CoachIconButton
              onClick={() =>
                openCoach({
                  id: "offer_stack.angle.short_description",
                  label: "Short Offer Description",
                  helper: "1–2 sentences explaining what the offer actually is.",
                  placeholder: `e.g. A 90-day coaching program that helps ${noun}…`,
                  currentValue: data.short_description ?? "",
                  apply: (value) => onChange({ short_description: value }),
                })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            1–2 sentences explaining what the offer actually is.
          </p>
          <AutoTextarea
            value={data.short_description ?? ""}
            onChange={(e) => onChange({ short_description: e.target.value })}
            placeholder={`e.g. A 90-day coaching program that helps ${noun} rebuild confidence after toxic relationships.`}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <Label className="text-lg font-display font-bold text-foreground">Core Outcome</Label>
            </div>
            <CoachIconButton
              onClick={() =>
                openCoach({
                  id: "offer_stack.angle.core_outcome",
                  label: "Core Outcome",
                  helper: "The primary transformation result in 1 sentence.",
                  placeholder: "e.g. Rebuild self-trust and confidently attract healthy relationships.",
                  currentValue: data.core_outcome ?? "",
                  apply: (value) => onChange({ core_outcome: value }),
                })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            The primary transformation result.
          </p>
          <AutoTextarea
            value={data.core_outcome ?? ""}
            onChange={(e) => onChange({ core_outcome: e.target.value })}
            placeholder="e.g. Rebuild self-trust and confidently attract healthy relationships."
            rows={3}
            className="resize-none text-sm"
          />
        </div>
      </div>

      {/* 4. Gusten 4-part differentiation grid */}
      <div className="mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Differentiation — what makes your method different
        </h3>
      </div>
      <div className="space-y-4 mb-6">
        <AngleField
          label="New Vehicle"
          helper="What makes your method genuinely new compared to what they already tried?"
          placeholder="e.g. The first 90-day program that combines somatic work with strategic positioning…"
          value={data.angle_new_vehicle ?? ""}
          onChange={(v) => onChange({ angle_new_vehicle: v })}
          onCoach={() =>
            openCoach({
              id: "offer_stack.angle.angle_new_vehicle",
              label: "New Vehicle",
              helper: "What makes your method genuinely new compared to what they already tried?",
              currentValue: data.angle_new_vehicle ?? "",
              apply: (v) => onChange({ angle_new_vehicle: v }),
            })
          }
        />
        <AngleField
          label="Better Results"
          helper="Why does your method produce better results?"
          placeholder="e.g. Because we combine strategy with implementation in the same week…"
          value={data.angle_better_results ?? ""}
          onChange={(v) => onChange({ angle_better_results: v })}
          onCoach={() =>
            openCoach({
              id: "offer_stack.angle.angle_better_results",
              label: "Better Results",
              helper: "Why does your method produce better results?",
              currentValue: data.angle_better_results ?? "",
              apply: (v) => onChange({ angle_better_results: v }),
            })
          }
        />
        <AngleField
          label="Faster Outcome"
          helper="How do clients get results faster?"
          placeholder="e.g. We compress 6 months of trial-and-error into 30 days of guided execution…"
          value={data.angle_faster_outcome ?? ""}
          onChange={(v) => onChange({ angle_faster_outcome: v })}
          onCoach={() =>
            openCoach({
              id: "offer_stack.angle.angle_faster_outcome",
              label: "Faster Outcome",
              helper: "How do clients get results faster?",
              currentValue: data.angle_faster_outcome ?? "",
              apply: (v) => onChange({ angle_faster_outcome: v }),
            })
          }
        />
        <AngleField
          label="Easier Process"
          helper="How do you make the process feel easier?"
          placeholder="e.g. Done-with-you templates, weekly accountability, no guesswork…"
          value={data.angle_easier_process ?? ""}
          onChange={(v) => onChange({ angle_easier_process: v })}
          onCoach={() =>
            openCoach({
              id: "offer_stack.angle.angle_easier_process",
              label: "Easier Process",
              helper: "How do you make the process feel easier?",
              currentValue: data.angle_easier_process ?? "",
              apply: (v) => onChange({ angle_easier_process: v }),
            })
          }
        />
      </div>

      {/* 5. Signature Framework */}
      <div className="mb-6">
        <FrameworkSection
          value={data.framework}
          onChange={(framework) => onChange({ framework })}
          onCoach={openCoach}
        />
      </div>

      {/* 6. Core Transformation Promise builder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-lg font-display font-bold text-foreground">Core Transformation Promise</Label>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Build a precise outcome promise. The preview below is what {noun} will see.
        </p>

        <div className="space-y-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">
                Desired Outcome
              </Label>
              <CoachIconButton
                compact
                onClick={() =>
                  openCoach({
                    id: "offer_stack.angle.core_promise.desired_outcome",
                    label: "Desired Outcome (Core Promise)",
                    helper: "The specific transformation the client walks away with. Short and concrete.",
                    placeholder: "e.g. Rebuild confidence and self-trust",
                    currentValue: promise?.desired_outcome ?? "",
                    apply: (v) => updatePromise({ desired_outcome: v }),
                  })
                }
              />
            </div>
            <Input
              value={promise?.desired_outcome ?? ""}
              onChange={(e) => updatePromise({ desired_outcome: e.target.value })}
              placeholder="e.g. Rebuild confidence and self-trust"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Timeframe
            </Label>
            <TimeframePicker
              value={promise?.timeframe ?? ""}
              customValue={promise?.timeframe_custom}
              onChange={(timeframe, custom) =>
                updatePromise({
                  timeframe: (timeframe || "90_days") as NonNullable<OfferAngleData["core_promise"]>["timeframe"],
                  timeframe_custom: custom,
                })
              }
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground block flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Guarantee / Risk Reversal <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <CoachIconButton
                compact
                onClick={() =>
                  openCoach({
                    id: "offer_stack.angle.core_promise.guarantee",
                    label: "Guarantee / Risk Reversal",
                    helper: "A concrete promise that removes the buyer's risk. One sentence.",
                    placeholder: "e.g. Final payment waived if no progress",
                    currentValue: promise?.guarantee ?? "",
                    apply: (v) => updatePromise({ guarantee: v }),
                  })
                }
              />
            </div>
            <Input
              value={promise?.guarantee ?? ""}
              onChange={(e) => updatePromise({ guarantee: e.target.value })}
              placeholder="e.g. Final payment waived if no progress"
              className="h-9"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mt-5 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
            Promise preview
          </div>
          {promisePreview ? (
            <p className="text-base font-display font-semibold text-foreground leading-snug">
              "{promisePreview}"
              {promise?.guarantee?.trim() && (
                <span className="block text-xs font-normal text-muted-foreground mt-2">
                  Guarantee: {promise.guarantee}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Fill in the desired outcome to preview your promise.
            </p>
          )}
        </div>
      </div>

      <CoachPanel
        open={!!coachSpec}
        onOpenChange={(o) => {
          if (!o) setCoachSpec(null);
        }}
        context={coachContext}
        onApply={(value) => {
          coachSpec?.apply(value);
        }}
      />
    </SectionShell>
  );
};

export default OfferAngleTab;
