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

import { useCoach } from "@/contexts/CoachContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  buildBlueprintFieldContext,
  buildBlueprintListSectionContext,
} from "@/lib/coach/buildContext";
import type { BlueprintRow } from "../types";
import type { CoachBlueprintWrite } from "@/lib/coach/types";
import { toast } from "sonner";
import { applyScopedOfferWrites } from "@/lib/coach/scopedOfferWrites";
import { useOfferCoachScope, type ScopedOfferCoach } from "./OfferCoachScope";

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
  const { activeSubAccountId } = useWorkspace();
  const { openCoach } = useCoach();
  const scope = useOfferCoachScope();
  const scoped = scope.mode === "scoped" ? scope : null;

  // Scoped (additional Core Offer): context = that offer's full design.
  const snapshotFor = (): BlueprintRow =>
    (scoped ? { offer_stack: scoped.getDesign() } : buildSnapshot()) as unknown as BlueprintRow;
  const keyFor = (base: string) => (scoped ? `${base}@offer:${scoped.offerId}` : base);

  const openCoachField = (spec: OfferCoachSpec) => {
    if (!activeSubAccountId) return;
    const snapshot = snapshotFor();
    const ctx = buildBlueprintFieldContext(
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
    openCoach({
      key: keyFor(`offer-field:${spec.id}`),
      label: scoped ? `${spec.label} — ${scoped.offerName}` : spec.label,
      scope: ctx.scope,
      intent: ctx.intent,
      mode: "field",
      target: ctx.target,
      blueprintSnapshot: snapshot,
      onApply: spec.apply,
      // Scoped: an explicit handler so the global Blueprint fallback can never run.
      ...(scoped ? { onApplyBlueprintWrites: (writes: CoachBlueprintWrite[]) => { applyScopedWrites(scoped, writes); } } : {}),
    });
  };

  const openListCoach = (spec: OfferListCoachSpec) => {
    if (!activeSubAccountId) return;
    const snapshot = snapshotFor();
    const ctx = buildBlueprintListSectionContext(
      {
        id: spec.id,
        label: spec.label,
        helper: spec.helper,
        basePath: spec.basePath,
        itemFields: spec.itemFields,
        currentCount: spec.currentCount ?? 0,
        suggestedCount: spec.suggestedCount,
      },
      snapshot,
      activeSubAccountId,
    );
    openCoach({
      key: keyFor(`offer-list:${spec.id}`),
      label: scoped ? `${spec.label} — ${scoped.offerName}` : spec.label,
      scope: ctx.scope,
      intent: ctx.intent,
      mode: "section",
      target: ctx.target,
      blueprintSnapshot: snapshot,
      onApplyBlueprintWrites: (writes) => applyListWrites(spec, writes),
    });
  };

  return { openCoach: openCoachField, openListCoach, panel: null };
}

/** Apply Coach writes to the scoped offer only; reject everything else. */
export function applyScopedWrites(scoped: ScopedOfferCoach, writes: CoachBlueprintWrite[]) {
  const { next, applied, rejected } = applyScopedOfferWrites(scoped.getDesign(), writes);
  if (applied.length) scoped.applyDesign(next);
  if (rejected.length) {
    toast.error(
      `${rejected.length} suggestion(s) not applied — they don't belong to "${scoped.offerName}".`,
    );
  }
  return { applied: applied.length, rejected: rejected.length };
}

/** Group `<basePath>.new_<n>.<field>` writes back into whole items. */
async function applyListWrites(spec: OfferListCoachSpec, writes: CoachBlueprintWrite[]) {
  const base = spec.basePath.endsWith(".") ? spec.basePath : `${spec.basePath}.`;
  const groups = new Map<string, Record<string, string>>();
  for (const w of writes) {
    if (!w.path?.startsWith(base)) continue;
    const rest = w.path.slice(base.length).split(".");
    if (rest.length < 2) continue;
    const [itemKey, ...fieldParts] = rest;
    const fieldKey = fieldParts.join(".");
    if (!spec.itemFields.some((f) => f.key === fieldKey)) continue;
    if (!groups.has(itemKey)) groups.set(itemKey, {});
    groups.get(itemKey)![fieldKey] = String(w.value ?? "");
  }
  const items = [...groups.values()];
  if (spec.appendItems) {
    await spec.appendItems(items);
    return;
  }
  for (const item of items) {
    await spec.appendItem(item);
  }
}
