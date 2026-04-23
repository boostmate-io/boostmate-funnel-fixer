// =============================================================================
// OfferDesignSection — orchestrator with tab navigation across the 4 tabs.
// =============================================================================

import { useState } from "react";
import { Check } from "lucide-react";
import {
  OFFER_TABS,
  type OfferTab,
  type OfferDesignData,
  type OfferAngleData,
  type OfferStackData,
  type PricingData,
  calcAngleProgress,
  calcStackProgress,
  calcPricingProgress,
  calcEcosystemProgress,
} from "./offerDesignTypes";
import { useEcosystemOffers } from "./useEcosystemOffers";
import OfferAngleTab from "./offer/OfferAngleTab";
import OfferStackTab from "./offer/OfferStackTab";
import PricingTab from "./offer/PricingTab";
import OfferEcosystemTab from "./offer/OfferEcosystemTab";

interface Props {
  blueprintId: string | null;
  data: OfferDesignData;
  onChange: (patch: Partial<OfferDesignData>) => void;
  saving: boolean;
  businessType?: string;
}

const OfferDesignSection = ({ blueprintId, data, onChange, saving, businessType }: Props) => {
  const [active, setActive] = useState<OfferTab>("angle");

  // We piggyback on useEcosystemOffers here so the sub-tab nav can show ecosystem
  // progress even when the user is not on the ecosystem tab.
  const { tierCounts } = useEcosystemOffers({ blueprintId, offerDesign: data });

  const tabProgress: Record<OfferTab, number> = {
    angle: calcAngleProgress(data.angle),
    stack: calcStackProgress(data.stack),
    pricing: calcPricingProgress(data.pricing),
    ecosystem: calcEcosystemProgress(tierCounts),
  };

  const updateAngle = (patch: Partial<OfferAngleData>) =>
    onChange({ angle: { ...data.angle, ...patch } });
  const updateStack = (patch: Partial<OfferStackData>) =>
    onChange({ stack: { ...data.stack, ...patch } });
  const updatePricing = (patch: Partial<PricingData>) =>
    onChange({ pricing: { ...data.pricing, ...patch } });

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab navigation */}
      <div className="border-b border-border bg-card px-8">
        <div className="max-w-6xl mx-auto flex gap-1 -mb-px overflow-x-auto">
          {OFFER_TABS.map((tab) => {
            const isActive = active === tab.id;
            const TabIcon = tab.icon;
            const prog = tabProgress[tab.id];
            const isComplete = prog === 100;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <span
                    className={`text-[10px] tabular-nums ${
                      isActive ? "text-primary/70" : "text-muted-foreground/70"
                    }`}
                  >
                    {prog}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab */}
      <div className="flex-1 overflow-hidden">
        {active === "angle" && (
          <OfferAngleTab
            data={data.angle}
            onChange={updateAngle}
            saving={saving}
            businessType={businessType}
          />
        )}
        {active === "stack" && (
          <OfferStackTab
            data={data.stack}
            onChange={updateStack}
            saving={saving}
            businessType={businessType}
          />
        )}
        {active === "pricing" && (
          <PricingTab
            data={data.pricing}
            onChange={updatePricing}
            saving={saving}
            businessType={businessType}
          />
        )}
        {active === "ecosystem" && (
          <OfferEcosystemTab
            blueprintId={blueprintId}
            offerDesign={data}
            saving={saving}
            businessType={businessType}
          />
        )}
      </div>
    </div>
  );
};

export default OfferDesignSection;
