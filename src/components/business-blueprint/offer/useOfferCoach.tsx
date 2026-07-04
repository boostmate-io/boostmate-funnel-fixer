// =============================================================================
// useOfferCoach — shared Coach entry-point for Offer Design tabs.
//
// Two modes:
//   • openCoach(spec)       — coach a SINGLE field (existing behaviour).
//   • openListCoach(spec)   — coach a LIST section (Framework Pillars,
//                             Deliverables, Bonuses, …). Coach proposes
//                             multiple items at once via `blueprint_writes`
//                             with paths `<basePath>.new_<n>.<fieldKey>`,
//                             each item apply/dismiss-able in the standard
//                             Blueprint updates card.
// =============================================================================

import { useMemo, useState } from "react";
import CoachPanel from "@/components/coach/CoachPanel";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  buildBlueprintFieldContext,
  buildBlueprintListSectionContext,
} from "@/lib/coach/buildContext";
import type { BlueprintRow } from "../types";
import type { CoachBlueprintWrite } from "@/lib/coach/types";

export interface OfferCoachSpec {
  id: string;
  label: string;
  helper?: string;
  placeholder?: string;
  currentValue: string;
  apply: (value: string) => void;
}

export interface OfferListCoachSpec {
  /** Stable id for the section (drives conversation persistence). */
  id: string;
  /** Human label, e.g. "Framework Pillars", "Core Deliverables". */
  label: string;
  helper?: string;
  /** Blueprint dot-path of the LIST (e.g. "offer_stack.angle.framework.pillars"). */
  basePath: string;
  /** Text fields the Coach should fill for every proposed item. */
  itemFields: { key: string; label: string; kind?: "text" | "textarea"; helper?: string }[];
  /** Suggested item count [min,max] — hint for the model. */
  suggestedCount?: [number, number];
  /** Called once per Coach-proposed item that the user accepts. */
  appendItem: (item: Record<string, string>) => void | Promise<void>;
  /** Optional batch append so Apply all preserves every item in one state update. */
  appendItems?: (items: Record<string, string>[]) => void | Promise<void>;
  /** Optional: current list length, for prompting. Defaults to 0. */
  currentCount?: number;
}

export function useOfferCoach(buildSnapshot: () => Record<string, unknown>) {
  const [fieldSpec, setFieldSpec] = useState<OfferCoachSpec | null>(null);
  const [listSpec, setListSpec] = useState<OfferListCoachSpec | null>(null);
  const { activeSubAccountId } = useWorkspace();

  const openCoach = (s: OfferCoachSpec) => {
    setListSpec(null);
    setFieldSpec(s);
  };

  const openListCoach = (s: OfferListCoachSpec) => {
    setFieldSpec(null);
    setListSpec(s);
  };

  const context = useMemo(() => {
    if (!activeSubAccountId) return null;
    if (fieldSpec) {
      const snapshot = buildSnapshot() as unknown as BlueprintRow;
      return buildBlueprintFieldContext(
        {
          id: fieldSpec.id,
          label: fieldSpec.label,
          helper: fieldSpec.helper,
          placeholder: fieldSpec.placeholder,
          currentValue: fieldSpec.currentValue,
        },
        snapshot,
        activeSubAccountId,
      );
    }
    if (listSpec) {
      const snapshot = buildSnapshot() as unknown as BlueprintRow;
      return buildBlueprintListSectionContext(
        {
          id: listSpec.id,
          label: listSpec.label,
          helper: listSpec.helper,
          basePath: listSpec.basePath,
          itemFields: listSpec.itemFields,
          currentCount: listSpec.currentCount ?? 0,
          suggestedCount: listSpec.suggestedCount,
        },
        snapshot,
        activeSubAccountId,
      );
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldSpec, listSpec, activeSubAccountId]);

  const handleApplyBlueprintWrites = async (writes: CoachBlueprintWrite[]) => {
    if (!listSpec) return;
    // Group writes by their "new_<n>" segment so each item's fields land
    // together in a single appendItem call.
    const base = listSpec.basePath.endsWith(".")
      ? listSpec.basePath
      : `${listSpec.basePath}.`;
    const groups = new Map<string, Record<string, string>>();
    for (const w of writes) {
      if (!w.path?.startsWith(base)) continue;
      const rest = w.path.slice(base.length).split(".");
      if (rest.length < 2) continue;
      const [itemKey, ...fieldParts] = rest;
      const fieldKey = fieldParts.join(".");
      if (!listSpec.itemFields.some((f) => f.key === fieldKey)) continue;
      if (!groups.has(itemKey)) groups.set(itemKey, {});
      groups.get(itemKey)![fieldKey] = String(w.value ?? "");
    }
    const items = [...groups.values()];
    if (listSpec.appendItems) {
      await listSpec.appendItems(items);
      return;
    }
    for (const item of items) {
      await listSpec.appendItem(item);
    }
  };

  const panel = (
    <CoachPanel
      open={!!fieldSpec || !!listSpec}
      onOpenChange={(o) => {
        if (!o) {
          setFieldSpec(null);
          setListSpec(null);
        }
      }}
      context={context}
      onApply={(value) => {
        fieldSpec?.apply(value);
      }}
      onApplyBlueprintWrites={listSpec ? handleApplyBlueprintWrites : undefined}
    />
  );

  return { openCoach, openListCoach, panel };
}
