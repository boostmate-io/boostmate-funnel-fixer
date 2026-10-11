// =============================================================================
// CoreOfferDialog — single popup that combines Offer Angle + Stack + Pricing
// fields for editing one core offer at a time.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { OfferCoachScopeProvider, type ScopedOfferCoach, type ScopedPersistResult } from "./OfferCoachScope";
import { fieldsForTier, OFFER_TIER_ECOSYSTEM_TAB } from "@shared/blueprintRegistry";
import OfferEditorShell, { type OfferSaveStatus, type OfferEditorTab } from "./OfferEditorShell";
import type { CoachBlueprintWrite } from "@/lib/coach/types";
import OfferAngleTab from "./OfferAngleTab";
import OfferStackTab from "./OfferStackTab";
import PricingTab from "./PricingTab";
import {
  emptyOfferDesign,
  type OfferDesignData,
  type OfferAngleData,
  type OfferStackData,
  type PricingData,
} from "../offerDesignTypes";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  /** Source data — read once when dialog opens. */
  initial: OfferDesignData;
  /** Called with the latest full data on every change (debounced upstream). */
  onChange: (next: OfferDesignData) => void;
  saving?: boolean;
  offerId?: string;
  isPrimary?: boolean;
  initialTab?: string;
  saveStatus?: OfferSaveStatus;
  flushChanges?: () => Promise<boolean>;
  businessType?: string;
  /** Set for additional Core Offers: scopes all Coach actions to this offer. */
  scopedOffer?: {
    id: string;
    name: string;
    /** Persist Coach writes to this offer by ID (independent of this dialog). */
    persistWrites: (writes: CoachBlueprintWrite[]) => Promise<ScopedPersistResult>;
  } | null;
  /** Bump to re-seed local state from `initial` (e.g. after a Coach write). */
  externalRevision?: number;
  /** Shared Ecosystem (relationships) section, appended to the Pricing tab. */
  ecosystemSection?: React.ReactNode;
}

export default function CoreOfferDialog({
  open,
  onOpenChange,
  title,
  initial,
  onChange,
  saving,
  offerId = "primary",
  isPrimary,
  initialTab,
  saveStatus,
  flushChanges,
  businessType,
  scopedOffer,
  externalRevision = 0,
  ecosystemSection,
}: Props) {
  const [data, setData] = useState<OfferDesignData>(initial ?? emptyOfferDesign());
  const dataRef = useRef(data);
  dataRef.current = data;

  // Re-seed when reopened with a different offer
  useEffect(() => {
    if (open) setData(initial ?? emptyOfferDesign());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Coach wrote to this offer (persisted by ID) — show it immediately.
  useEffect(() => {
    if (open && externalRevision) {
      const next = initial ?? emptyOfferDesign();
      dataRef.current = next;
      setData(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRevision]);

  // Primary Coach writes arrive via the Blueprint; optimistic manual edits do too.
  useEffect(() => {
    if (open && !scopedOffer) {
      dataRef.current = initial;
      setData(initial);
    }
  }, [initial, open, scopedOffer]);


  const update = (next: OfferDesignData) => {
    dataRef.current = next;
    setData(next);
    onChange(next);
  };
  const updateRef = useRef(update);
  updateRef.current = update;

  const coachScope = useMemo<ScopedOfferCoach | null>(
    () =>
      scopedOffer
        ? {
            mode: "scoped",
            offerId: scopedOffer.id,
            offerName: scopedOffer.name || "this offer",
            getDesign: () => dataRef.current,
            // Captured per offer ID: keeps working after this dialog closes.
            persistWrites: scopedOffer.persistWrites,
          }
        : null,
    [scopedOffer?.id, scopedOffer?.name, scopedOffer?.persistWrites],
  );

  const updateAngle = (patch: Partial<OfferAngleData>) =>
    update({ ...dataRef.current, angle: { ...dataRef.current.angle, ...patch } });
  const updateStack = (patch: Partial<OfferStackData>) =>
    update({ ...dataRef.current, stack: { ...dataRef.current.stack, ...patch } });
  const updatePricing = (patch: Partial<PricingData>) =>
    update({ ...dataRef.current, pricing: { ...dataRef.current.pricing, ...patch } });

  const content: Record<string, React.ReactNode> = {
    angle: <OfferAngleTab data={data.angle} onChange={updateAngle} saving={!!saving} businessType={businessType} embedded />,
    stack: <OfferStackTab data={data.stack} onChange={updateStack} saving={!!saving} businessType={businessType} embedded />,
    pricing: <PricingTab data={data.pricing} onChange={updatePricing} saving={!!saving} businessType={businessType} embedded />,
  };
  const ecoTab = OFFER_TIER_ECOSYSTEM_TAB.core;
  if (ecosystemSection && content[ecoTab]) content[ecoTab] = <div className="space-y-6">{content[ecoTab]}{ecosystemSection}</div>;
  const tabs: OfferEditorTab[] = fieldsForTier("core").subBlocks.filter((section) => content[section.id]).map((section) => ({ id: section.id, label: section.label, content: content[section.id] }));
  return <OfferCoachScopeProvider value={coachScope}>
    <OfferEditorShell open={open} onOpenChange={onOpenChange} offer={{ id: offerId, name: data.angle.main_offer_name || title, category: "Core Offer", primary: isPrimary ?? !scopedOffer }} tabs={tabs} initialTab={initialTab} saveStatus={saveStatus ?? (saving ? "saving" : "saved")} flushChanges={flushChanges} />
  </OfferCoachScopeProvider>;
}
