// =============================================================================
// OfferAngleTab — Tab 1 (redesigned)
// Order: Main Offer Name → Short Description → Core Outcome →
//        New/Better/Faster/Easier → Signature Framework → Core Promise
// =============================================================================

import { useState } from "react";
import { Lightbulb, Wand2, Loader2, Sparkles, Shield, FileText, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SectionShell from "./SectionShell";
import AngleField from "./AngleField";
import TimeframePicker from "./TimeframePicker";
import FrameworkSection from "./FrameworkSection";
import {
  type OfferAngleData,
  buildPromisePreview,
  calcAngleProgress,
} from "../offerDesignTypes";
import { getBusinessType } from "../businessTypes";
import CoachPanel from "../CoachPanel";

interface Props {
  data: OfferAngleData;
  onChange: (patch: Partial<OfferAngleData>) => void;
  saving: boolean;
  businessType?: string;
}

const OfferAngleTab = ({ data, onChange, saving, businessType }: Props) => {
  const bt = getBusinessType(businessType);
  const noun = bt.customerNoun;
  const progress = calcAngleProgress(data);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachField, setCoachField] = useState<string | null>(null);
  const [genNamesBusy, setGenNamesBusy] = useState(false);

  const openCoach = (label: string) => {
    setCoachField(label);
    setCoachOpen(true);
  };

  const handleGenerateNames = () => {
    setGenNamesBusy(true);
    setTimeout(() => {
      setGenNamesBusy(false);
      toast.info("Generate Names — AI suggestions coming soon");
    }, 400);
  };

  const promisePreview = buildPromisePreview(data.core_promise);

  const updatePromise = (patch: Partial<NonNullable<OfferAngleData["core_promise"]>>) => {
    onChange({
      core_promise: {
        desired_outcome: data.core_promise?.desired_outcome ?? "",
        timeframe: data.core_promise?.timeframe ?? "90_days",
        timeframe_custom: data.core_promise?.timeframe_custom,
        guarantee: data.core_promise?.guarantee,
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
      rightBadge={
        <Badge variant="outline" className="gap-1.5 text-xs">
          <bt.icon className="w-3 h-3 text-primary" />
          {bt.label} mode
        </Badge>
      }
    >
      {/* 1. Main Offer Name */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <Label className="text-sm font-semibold text-foreground">Main Offer Name</Label>
            <p className="text-xs text-muted-foreground mt-1">What is your flagship offer called?</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateNames}
            disabled={genNamesBusy}
            className="gap-1.5 h-8"
          >
            {genNamesBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Generate Names
          </Button>
        </div>
        <Input
          value={data.main_offer_name ?? ""}
          onChange={(e) => onChange({ main_offer_name: e.target.value })}
          placeholder="e.g. The Confidence Reset, Lead Engine 90, Scale Sprint…"
          className="h-10"
        />
      </div>

      {/* 2. Short Offer Description + 3. Core Outcome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">Short Offer Description</Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            1–2 sentences explaining what the offer actually is.
          </p>
          <Textarea
            value={data.short_description ?? ""}
            onChange={(e) => onChange({ short_description: e.target.value })}
            placeholder={`e.g. A 90-day coaching program that helps ${noun} rebuild confidence after toxic relationships.`}
            rows={3}
            className="resize-none text-sm"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">Core Outcome</Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            The primary transformation result.
          </p>
          <Textarea
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <AngleField
          label="New Vehicle"
          helper="What makes your method genuinely new compared to what they already tried?"
          placeholder="e.g. The first 90-day program that combines somatic work with strategic positioning…"
          value={data.angle_new_vehicle ?? ""}
          onChange={(v) => onChange({ angle_new_vehicle: v })}
          onCoach={() => openCoach("New Vehicle")}
        />
        <AngleField
          label="Better Results"
          helper="Why does your method produce better results?"
          placeholder="e.g. Because we combine strategy with implementation in the same week…"
          value={data.angle_better_results ?? ""}
          onChange={(v) => onChange({ angle_better_results: v })}
          onCoach={() => openCoach("Better Results")}
        />
        <AngleField
          label="Faster Outcome"
          helper="How do clients get results faster?"
          placeholder="e.g. We compress 6 months of trial-and-error into 30 days of guided execution…"
          value={data.angle_faster_outcome ?? ""}
          onChange={(v) => onChange({ angle_faster_outcome: v })}
          onCoach={() => openCoach("Faster Outcome")}
        />
        <AngleField
          label="Easier Process"
          helper="How do you make the process feel easier?"
          placeholder="e.g. Done-with-you templates, weekly accountability, no guesswork…"
          value={data.angle_easier_process ?? ""}
          onChange={(v) => onChange({ angle_easier_process: v })}
          onCoach={() => openCoach("Easier Process")}
        />
      </div>

      {/* 5. Signature Framework */}
      <div className="mb-6">
        <FrameworkSection
          value={data.framework}
          onChange={(framework) => onChange({ framework })}
        />
      </div>

      {/* 6. Core Transformation Promise builder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">Core Transformation Promise</Label>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Build a precise outcome promise. The preview below is what {noun} will see.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Desired Outcome
            </Label>
            <Input
              value={data.core_promise?.desired_outcome ?? ""}
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
              value={data.core_promise?.timeframe ?? ""}
              customValue={data.core_promise?.timeframe_custom}
              onChange={(timeframe, custom) =>
                updatePromise({
                  timeframe: (timeframe || "90_days") as NonNullable<OfferAngleData["core_promise"]>["timeframe"],
                  timeframe_custom: custom,
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Guarantee / Risk Reversal <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              value={data.core_promise?.guarantee ?? ""}
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
              {data.core_promise?.guarantee?.trim() && (
                <span className="block text-xs font-normal text-muted-foreground mt-2">
                  Guarantee: {data.core_promise.guarantee}
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
        open={coachOpen}
        onOpenChange={(o) => {
          setCoachOpen(o);
          if (!o) setCoachField(null);
        }}
        title={coachField ?? "Offer Angle"}
        questions={[
          "What's the #1 thing that makes your method different?",
          `Why do ${noun} get better results with you than with alternatives?`,
          "How is the timeline meaningfully faster?",
          "What friction or complexity have you removed?",
          "What outcome do you confidently promise?",
        ]}
        onSubmit={() => toast.info("Coach mode — AI suggestions coming soon")}
      />
    </SectionShell>
  );
};

export default OfferAngleTab;
