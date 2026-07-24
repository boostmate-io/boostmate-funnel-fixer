// =============================================================================
// BrandIdentitySection — Blueprint "Brand Strategy" section.
// Mirrors the Customer Clarity pattern: tabbed layout, per-tab progress,
// FieldCard-based fields with per-field AI Coach, and a section-level Coach
// help button in the header. No static "Why this matters" or feedback blocks.
// =============================================================================

import { useMemo, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CoachPanel from "@/components/coach/CoachPanel";
import FieldCard from "./FieldCard";
import SectionHelpCoach from "./SectionHelpCoach";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { buildBlueprintFieldContext } from "@/lib/coach/buildContext";
import type { BlueprintRow } from "./types";
import type { FieldDef } from "./clarityConfig";
import {
  BRAND_STRATEGY_TABS,
  calcBrandTabProgress,
  calcBrandIdentityProgress,
  type BrandTabId,
  type BrandIdentityData,
} from "./brandStrategyConfig";

export { calcBrandIdentityProgress };
export type { BrandIdentityData };

interface Props {
  data: BrandIdentityData;
  onChange: (patch: Partial<BrandIdentityData>) => void;
  saving?: boolean;
}

const BrandIdentitySection = ({ data, onChange, saving }: Props) => {
  const [active, setActive] = useState<BrandTabId>("positioning");
  const [coachField, setCoachField] = useState<{ key: string; label: string; helper?: string; placeholder?: string } | null>(null);
  const { activeSubAccountId } = useWorkspace();

  const tab = BRAND_STRATEGY_TABS.find((t) => t.id === active)!;
  const TabIcon = tab.icon;
  const progress = calcBrandTabProgress(data, active);

  const coachContext = useMemo(() => {
    if (!coachField || !activeSubAccountId) return null;
    const snapshot = { brand_strategy: data } as unknown as BlueprintRow;
    return buildBlueprintFieldContext(
      {
        id: `brand_strategy.${coachField.key}`,
        label: coachField.label,
        helper: coachField.helper,
        placeholder: coachField.placeholder,
        currentValue: (data?.[coachField.key] as string) || "",
        kind: "text",
      },
      snapshot,
      activeSubAccountId,
    );
  }, [coachField, activeSubAccountId, data]);

  return (
    <div className="h-full flex flex-col">
      {/* Sticky sub-tab navigation */}
      <div className="border-b border-border bg-card px-8 shrink-0">
        <div className="max-w-6xl mx-auto flex gap-1 -mb-px overflow-x-auto">
          {BRAND_STRATEGY_TABS.map((t) => {
            const tp = calcBrandTabProgress(data, t.id);
            const isActive = active === t.id;
            const TIcon = t.icon;
            const complete = tp === 100;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <TIcon className="w-4 h-4" />
                <span>{t.label}</span>
                {complete ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <span
                    className={`text-[10px] tabular-nums ${
                      isActive ? "text-primary/70" : "text-muted-foreground/70"
                    }`}
                  >
                    {tp}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TabIcon className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-display font-bold text-foreground">{tab.label}</h2>
                <SectionHelpCoach
                  sectionId={`brand_strategy.${tab.id}`}
                  sectionLabel={`Brand Strategy — ${tab.label}`}
                />
              </div>
              <p className="text-sm text-muted-foreground">{tab.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
            </div>
          </div>

          {/* Field cards */}
          <div className="space-y-4">
            {tab.fields.map((field) => (
              <FieldCard
                key={field.key}
                field={field as unknown as FieldDef}
                value={((data?.[field.key] as string) || "").toString()}
                onChange={(v) => onChange({ [field.key]: v })}
                onCoach={() =>
                  setCoachField({
                    key: field.key,
                    label: field.label,
                    helper: field.helper,
                    placeholder: field.placeholder,
                  })
                }
              />
            ))}
          </div>

          {/* Tab progress bar */}
          <div className="mt-6 px-1">
            <Progress value={progress} className="h-1" />
          </div>
        </div>
      </div>

      {/* Field-level AI Coach */}
      <CoachPanel
        open={!!coachField}
        onOpenChange={(o) => {
          if (!o) setCoachField(null);
        }}
        context={coachContext}
        onApply={(value) => {
          if (coachField) onChange({ [coachField.key]: value });
        }}
      />
    </div>
  );
};

// Re-export Palette icon for parity with older imports.
export { Palette };
export default BrandIdentitySection;
