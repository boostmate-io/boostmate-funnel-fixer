// =============================================================================
// StageLadder — the 5-stage strip with per-stage visual identity.
//
// Each stage renders as a card with its own icon + accent colour. Future stages
// render locked (non-activatable), but every stage exposes an info button that
// opens a short explanation: what the stage is, what a business in it looks
// like, and what must be achieved to unlock it.
// =============================================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, HelpCircle, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STAGE_META, STAGE_ORDER } from "@/lib/growth/engine";
import { STAGE_IDENTITY, stageState } from "@/lib/growth/stageIdentity";
import { useGrowthStageContent } from "@/lib/growth/useGrowthContent";
import type { GrowthStage } from "@/lib/growth/types";

interface Props {
  currentStage: GrowthStage;
  /** When true every stage renders as completed (terminal roadmap state). */
  allCompleted?: boolean;
}

export default function StageLadder({ currentStage, allCompleted = false }: Props) {
  const { t } = useTranslation();
  const { getStage } = useGrowthStageContent();
  const [openStage, setOpenStage] = useState<GrowthStage | null>(null);
  const currentIdx = STAGE_ORDER.indexOf(currentStage);


  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAGE_ORDER.map((s, i) => {
          const id = STAGE_IDENTITY[s];
          const state = stageState(i, currentIdx, allCompleted);
          const Icon = id.icon;

          const cardClass =
            state === "current"
              ? `border-2 ${id.border} ${id.softBg} ring-4 ${id.ring} shadow-card`
              : state === "completed"
                ? "border border-border bg-muted/30"
                : "border border-dashed border-border bg-muted/10";

          return (
            <div
              key={s}
              className={`relative rounded-xl p-4 transition-colors ${cardClass}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              <button
                type="button"
                onClick={() => setOpenStage(s)}
                aria-label={t("growth.ladder.about", "About this stage")}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                  state === "current"
                    ? `${id.bg} text-primary-foreground`
                    : state === "completed"
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/60 text-muted-foreground/60"
                }`}
              >
                {state === "locked" ? (
                  <Lock className="w-4 h-4" />
                ) : state === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-display font-bold ${
                    state === "current" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {getStage(s).label?.trim() || t(STAGE_META[s].labelKey)}
                </span>
              </div>


              <div
                className={`text-[11px] font-medium uppercase tracking-wide mt-1 ${
                  state === "current" ? id.text : "text-muted-foreground/70"
                }`}
              >
                {state === "current"
                  ? t("growth.ladder.current", "Current stage")
                  : state === "completed"
                    ? t("growth.ladder.completed", "Completed")
                    : t("growth.ladder.locked", "Locked")}
              </div>

              {/* Stage icon accent bar */}
              <div
                className={`h-1 rounded-full mt-3 ${
                  state === "current" ? id.bg : state === "completed" ? "bg-muted" : "bg-muted/50"
                }`}
              />
            </div>
          );
        })}
      </div>

      <StageInfoDialog
        stage={openStage}
        currentStage={currentStage}
        onClose={() => setOpenStage(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Info dialog
// ---------------------------------------------------------------------------

export function StageInfoDialog({
  stage,
  currentStage,
  onClose,
}: {
  stage: GrowthStage | null;
  currentStage: GrowthStage;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { getStage } = useGrowthStageContent();
  if (!stage) return null;
  const content = getStage(stage);
  const pick = (value: string, fallbackKey: string) => value?.trim() || t(fallbackKey);


  const id = STAGE_IDENTITY[stage];
  const meta = STAGE_META[stage];
  const Icon = id.icon;
  const idx = STAGE_ORDER.indexOf(stage);
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const state = stageState(idx, currentIdx);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${id.bg} text-primary-foreground`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-left">{pick(content.label, meta.labelKey)}</DialogTitle>
              <DialogDescription className="text-left">
                {state === "current"
                  ? t("growth.ladder.current", "Current stage")
                  : state === "completed"
                    ? t("growth.ladder.completed", "Completed")
                    : t("growth.ladder.lockedHint", "Unlocks after the previous stage")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <InfoBlock label={t("growth.ladder.whatIsIt", "What this stage is")}>
            {pick(content.summary, id.summaryKey)}
          </InfoBlock>
          <InfoBlock label={t("growth.ladder.typical", "What a business in this stage looks like")}>
            {pick(content.typical_profile, id.typicalKey)}
          </InfoBlock>
          <InfoBlock label={t("growth.ladder.unlock", "What must be achieved to unlock it")}>
            {pick(content.unlock_condition, id.unlockKey)}
          </InfoBlock>

        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <p className="text-foreground">{children}</p>
    </div>
  );
}
