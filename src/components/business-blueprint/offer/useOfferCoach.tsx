// =============================================================================
// useOfferCoach — shared Coach entry-point for Offer Design tabs.
// Manages the CoachSpec state, builds a scoped snapshot and renders the panel.
// Keeps every tab consistent with the AI Coach pattern used in OfferAngleTab.
// =============================================================================

import { useMemo, useState } from "react";
import CoachPanel from "@/components/coach/CoachPanel";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { buildBlueprintFieldContext } from "@/lib/coach/buildContext";
import type { BlueprintRow } from "../types";

export interface OfferCoachSpec {
  id: string;
  label: string;
  helper?: string;
  placeholder?: string;
  currentValue: string;
  apply: (value: string) => void;
}

/**
 * @param buildSnapshot returns whatever shape best represents the tab's data
 *                     for the Coach engine (nested under offer_stack.*).
 */
export function useOfferCoach(buildSnapshot: () => Record<string, unknown>) {
  const [spec, setSpec] = useState<OfferCoachSpec | null>(null);
  const { activeSubAccountId } = useWorkspace();

  const openCoach = (s: OfferCoachSpec) => setSpec(s);

  const context = useMemo(() => {
    if (!spec || !activeSubAccountId) return null;
    const snapshot = buildSnapshot() as unknown as BlueprintRow;
    return buildBlueprintFieldContext(
      {
        id: spec.id,
        label: spec.label,
        helper: spec.helper,
        placeholder: spec.placeholder,
        currentValue: spec.currentValue,
      },
      snapshot,
      activeSubAccountId,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, activeSubAccountId]);

  const panel = (
    <CoachPanel
      open={!!spec}
      onOpenChange={(o) => {
        if (!o) setSpec(null);
      }}
      context={context}
      onApply={(value) => {
        spec?.apply(value);
      }}
    />
  );

  return { openCoach, panel };
}
