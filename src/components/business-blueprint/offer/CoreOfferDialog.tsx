// =============================================================================
// CoreOfferDialog — single popup that combines Offer Angle + Stack + Pricing
// fields for editing one core offer at a time.
// =============================================================================

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  businessType?: string;
}

export default function CoreOfferDialog({
  open,
  onOpenChange,
  title,
  initial,
  onChange,
  saving,
  businessType,
}: Props) {
  const [data, setData] = useState<OfferDesignData>(initial ?? emptyOfferDesign());

  // Re-seed when reopened with a different offer
  useEffect(() => {
    if (open) setData(initial ?? emptyOfferDesign());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const update = (next: OfferDesignData) => {
    setData(next);
    onChange(next);
  };

  const updateAngle = (patch: Partial<OfferAngleData>) =>
    update({ ...data, angle: { ...data.angle, ...patch } });
  const updateStack = (patch: Partial<OfferStackData>) =>
    update({ ...data, stack: { ...data.stack, ...patch } });
  const updatePricing = (patch: Partial<PricingData>) =>
    update({ ...data, pricing: { ...data.pricing, ...patch } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl p-0 gap-0 max-h-[92vh] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-xl font-display">{title}</DialogTitle>
        </DialogHeader>

        <div key={open ? "open" : "closed"} className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-6">
            <OfferAngleTab
              data={data.angle}
              onChange={updateAngle}
              saving={!!saving}
              businessType={businessType}
              embedded
            />
            <OfferStackTab
              data={data.stack}
              onChange={updateStack}
              saving={!!saving}
              businessType={businessType}
              embedded
            />
            <PricingTab
              data={data.pricing}
              onChange={updatePricing}
              saving={!!saving}
              businessType={businessType}
              embedded
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border shrink-0">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
