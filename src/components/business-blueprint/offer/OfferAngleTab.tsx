// =============================================================================
// OfferAngleTab — Tab 1 (redesigned)
// Every field has an AI Coach entry point, including the structured
// Framework and Core Promise builders. The Framework Pillars list also has
// a section-level Coach that can propose a full set of pillars at once.
// =============================================================================

import { Lightbulb, Sparkles, Shield, FileText, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import SectionShell from "./SectionShell";
import SectionHelpCoach from "../SectionHelpCoach";
import AngleField from "./AngleField";
import TimeframePicker from "./TimeframePicker";
import FrameworkSection from "./FrameworkSection";
import CoachIconButton from "./CoachIconButton";
import { useOfferCoach } from "./useOfferCoach";
import { useLatestRef } from "@/lib/coach/useLatestRef";
import {
  type OfferAngleData,
  type FrameworkPillar,
  buildPromisePreview,
  calcAngleProgress,
} from "../offerDesignTypes";
import { getBusinessType } from "../businessTypes";
import { offerEditorField } from "../registryUi";

/** Offer Angle simple fields — copy + Coach targets come from the registry. */
export const ANGLE_FIELD_PATHS = {
  main_offer_name: "offer_stack.angle.main_offer_name",
  short_description: "offer_stack.angle.short_description",
  core_outcome: "offer_stack.angle.core_outcome",
  angle_new_vehicle: "offer_stack.angle.angle_new_vehicle",
  angle_better_results: "offer_stack.angle.angle_better_results",
  angle_faster_outcome: "offer_stack.angle.angle_faster_outcome",
  angle_easier_process: "offer_stack.angle.angle_easier_process",
  desired_outcome: "offer_stack.angle.core_promise.desired_outcome",
  guarantee: "offer_stack.angle.core_promise.guarantee",
} as const;

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

const newId = () => crypto.randomUUID();

const OfferAngleTab = ({ data, onChange, saving, businessType, embedded }: Props) => {
  const bt = getBusinessType(businessType);
  const noun = bt.customerNoun;
  const progress = calcAngleProgress(data);
  const tokens = { noun };
  const F = Object.fromEntries(
    Object.entries(ANGLE_FIELD_PATHS).map(([k, p]) => [k, offerEditorField(p, tokens)]),
  ) as Record<keyof typeof ANGLE_FIELD_PATHS, ReturnType<typeof offerEditorField>>;
  const { openCoach, openListCoach, panel } = useOfferCoach(() => ({
    offer_stack: { angle: data },
  }));

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

  const framework = data.framework ?? { pillars: [] };
  const dataRef = useLatestRef(data);
  const onChangeRef = useLatestRef(onChange);
  const appendPillar = (item: Record<string, string>) => {
    const currentFramework = dataRef.current.framework ?? { pillars: [] };
    const nextPillar: FrameworkPillar = {
      id: newId(),
      name: (item.name ?? "").trim(),
      description: (item.description ?? "").trim(),
    };
    onChangeRef.current({
      framework: {
        ...currentFramework,
        pillars: [...(currentFramework.pillars ?? []), nextPillar],
      },
    });
  };
  const appendPillars = (items: Record<string, string>[]) => {
    const currentFramework = dataRef.current.framework ?? { pillars: [] };
    onChangeRef.current({
      framework: {
        ...currentFramework,
        pillars: [
          ...(currentFramework.pillars ?? []),
          ...items.map((item) => ({
            id: newId(),
            name: (item.name ?? "").trim(),
            description: (item.description ?? "").trim(),
          })),
        ],
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
      progress={progress}
      saving={saving}
      embedded={embedded}
      helpButton={<>
          <SectionHelpCoach sectionId="offer_design.angle" sectionLabel="Offer Design — Angle" />
          <SectionHelpCoach variant="walkthrough" sectionId="offer_design.angle" sectionLabel="Offer Design — Angle" />
        </>}
    >
      {/* 1. Main Offer Name */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <Label className="text-lg font-display font-bold text-foreground">{F.main_offer_name.label}</Label>
            <p className="text-xs text-muted-foreground mt-1">{F.main_offer_name.helper}</p>
          </div>
          <CoachIconButton
            onClick={() =>
              openCoach({
                ...F.main_offer_name.coach,
                currentValue: data.main_offer_name ?? "",
                apply: (value) => onChange({ main_offer_name: value }),
              })
            }
          />
        </div>
        <Input
          value={data.main_offer_name ?? ""}
          onChange={(e) => onChange({ main_offer_name: e.target.value })}
          placeholder={F.main_offer_name.placeholder}
          className="h-10"
        />
      </div>

      {/* 2. Short Offer Description + 3. Core Outcome */}
      <div className="space-y-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <Label className="text-lg font-display font-bold text-foreground">{F.short_description.label}</Label>
            </div>
            <CoachIconButton
              onClick={() =>
                openCoach({
                  ...F.short_description.coach,
                  currentValue: data.short_description ?? "",
                  apply: (value) => onChange({ short_description: value }),
                })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {F.short_description.helper}
          </p>
          <AutoTextarea
            value={data.short_description ?? ""}
            onChange={(e) => onChange({ short_description: e.target.value })}
            placeholder={F.short_description.placeholder}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <Label className="text-lg font-display font-bold text-foreground">{F.core_outcome.label}</Label>
            </div>
            <CoachIconButton
              onClick={() =>
                openCoach({
                  ...F.core_outcome.coach,
                  currentValue: data.core_outcome ?? "",
                  apply: (value) => onChange({ core_outcome: value }),
                })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {F.core_outcome.helper}
          </p>
          <AutoTextarea
            value={data.core_outcome ?? ""}
            onChange={(e) => onChange({ core_outcome: e.target.value })}
            placeholder={F.core_outcome.placeholder}
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
          label={F.angle_new_vehicle.label}
          helper={F.angle_new_vehicle.helper}
          placeholder={F.angle_new_vehicle.placeholder}
          value={data.angle_new_vehicle ?? ""}
          onChange={(v) => onChange({ angle_new_vehicle: v })}
          onCoach={() =>
            openCoach({
              ...F.angle_new_vehicle.coach,
              currentValue: data.angle_new_vehicle ?? "",
              apply: (v) => onChange({ angle_new_vehicle: v }),
            })
          }
        />
        <AngleField
          label={F.angle_better_results.label}
          helper={F.angle_better_results.helper}
          placeholder={F.angle_better_results.placeholder}
          value={data.angle_better_results ?? ""}
          onChange={(v) => onChange({ angle_better_results: v })}
          onCoach={() =>
            openCoach({
              ...F.angle_better_results.coach,
              currentValue: data.angle_better_results ?? "",
              apply: (v) => onChange({ angle_better_results: v }),
            })
          }
        />
        <AngleField
          label={F.angle_faster_outcome.label}
          helper={F.angle_faster_outcome.helper}
          placeholder={F.angle_faster_outcome.placeholder}
          value={data.angle_faster_outcome ?? ""}
          onChange={(v) => onChange({ angle_faster_outcome: v })}
          onCoach={() =>
            openCoach({
              ...F.angle_faster_outcome.coach,
              currentValue: data.angle_faster_outcome ?? "",
              apply: (v) => onChange({ angle_faster_outcome: v }),
            })
          }
        />
        <AngleField
          label={F.angle_easier_process.label}
          helper={F.angle_easier_process.helper}
          placeholder={F.angle_easier_process.placeholder}
          value={data.angle_easier_process ?? ""}
          onChange={(v) => onChange({ angle_easier_process: v })}
          onCoach={() =>
            openCoach({
              ...F.angle_easier_process.coach,
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
          onCoachPillars={() =>
            openListCoach({
              id: "framework_pillars",
              label: "Signature Framework — Pillars",
              helper:
                "Core pillars or steps of the signature method. Short, evocative names + 1–2 sentence descriptions.",
              basePath: "offer_stack.angle.framework.pillars",
              itemFields: [
                { key: "name", label: "Name", kind: "text", helper: "Short, evocative pillar name (2–5 words)." },
                { key: "description", label: "Description", kind: "textarea", helper: "What happens in this pillar — 1–2 sentences." },
              ],
              currentCount: framework.pillars?.length ?? 0,
              suggestedCount: [3, 5],
              appendItem: appendPillar,
              appendItems: appendPillars,
            })
          }
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
                {F.desired_outcome.label}
              </Label>
              <CoachIconButton
                compact
                onClick={() =>
                  openCoach({
                    ...F.desired_outcome.coach,
                    currentValue: promise?.desired_outcome ?? "",
                    apply: (v) => updatePromise({ desired_outcome: v }),
                  })
                }
              />
            </div>
            <Input
              value={promise?.desired_outcome ?? ""}
              onChange={(e) => updatePromise({ desired_outcome: e.target.value })}
              placeholder={F.desired_outcome.placeholder}
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
                {F.guarantee.label} <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <CoachIconButton
                compact
                onClick={() =>
                  openCoach({
                    ...F.guarantee.coach,
                    currentValue: promise?.guarantee ?? "",
                    apply: (v) => updatePromise({ guarantee: v }),
                  })
                }
              />
            </div>
            <Input
              value={promise?.guarantee ?? ""}
              onChange={(e) => updatePromise({ guarantee: e.target.value })}
              placeholder={F.guarantee.placeholder}
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

      {panel}
    </SectionShell>
  );
};

export default OfferAngleTab;
