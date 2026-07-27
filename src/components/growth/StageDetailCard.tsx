// =============================================================================
// StageDetailCard — the "Current stage" panel.
//
// Copy comes from the admin-managed `growth_stages` content table (Editable
// Product Content pattern). i18n keys remain as a fallback while content loads
// or when a field has not been filled in yet.
// =============================================================================

import { useTranslation } from "react-i18next";
import { Compass, Flag, Target } from "lucide-react";
import { STAGE_META } from "@/lib/growth/engine";
import { STAGE_IDENTITY } from "@/lib/growth/stageIdentity";
import { useGrowthStageContent } from "@/lib/growth/useGrowthContent";
import type { GrowthStage } from "@/lib/growth/types";

export default function StageDetailCard({ stage }: { stage: GrowthStage }) {
  const { t } = useTranslation();
  const { getStage } = useGrowthStageContent();
  const content = getStage(stage);
  const meta = STAGE_META[stage];
  const id = STAGE_IDENTITY[stage];
  const Icon = id.icon;

  const pick = (value: string, fallbackKey: string) => value?.trim() || t(fallbackKey);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className={`h-1 ${id.bg}`} />
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-lg shrink-0 flex items-center justify-center ${id.bg} text-primary-foreground`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("growth.yourStage")}
            </div>
            <h3 className="text-2xl font-display font-bold text-foreground">
              {pick(content.label, meta.labelKey)}
            </h3>
          </div>
        </div>

        {/* Narrative summary */}
        <div className={`mt-5 rounded-lg p-4 ${id.softBg} space-y-3`}>
          <SummaryRow
            icon={Compass}
            accent={id.text}
            label={t("growth.stageSummary.why", "Why you're here")}
            value={pick(content.summary, id.summaryKey)}
          />
          <SummaryRow
            icon={Target}
            accent={id.text}
            label={t("growth.stageSummary.focus", "Focus of this stage")}
            value={pick(content.focus, id.focusKey)}
          />
          <SummaryRow
            icon={Flag}
            accent={id.text}
            label={t("growth.stageSummary.success", "What success looks like")}
            value={pick(content.success_criteria, id.successKey)}
          />
        </div>

        {/* Existing triple */}
        <dl className="grid md:grid-cols-3 gap-4 text-sm mt-5">
          <div>
            <dt className="text-muted-foreground mb-1">{t("growth.bottleneck")}</dt>
            <dd className="text-foreground">{pick(content.bottleneck, meta.bottleneckKey)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">{t("growth.objective")}</dt>
            <dd className="text-foreground">{pick(content.objective, meta.objectiveKey)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">{t("growth.milestone")}</dt>
            <dd className="text-foreground">{pick(content.milestone, meta.milestoneKey)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  accent,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${accent}`} />
      <div className="text-sm">
        <span className="font-medium text-foreground">{label}: </span>
        <span className="text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}
