// =============================================================================
// OfferDesignSection — Offer Design opens directly on the Offer Ecosystem.
// Individual offers (incl. the Primary Core Offer's Angle/Stack/Pricing) are
// edited in the Universal Offer Editor launched from the ecosystem cards.
// Progress for all four former tabs is still computed by the Blueprint module.
// =============================================================================

import type { OfferDesignData } from "./offerDesignTypes";
import OfferEcosystemTab from "./offer/OfferEcosystemTab";
import type { OfferSaveStatus } from "./offer/OfferEditorShell";

interface Props {
  blueprintId: string | null;
  data: OfferDesignData;
  onChange: (patch: Partial<OfferDesignData>) => void;
  saving: boolean;
  primarySaveStatus?: OfferSaveStatus;
  flushPrimary?: () => Promise<boolean>;
  businessType?: string;
  pendingOpenOfferId?: string | null;
  onOpenedOffer?: () => void;
}

const OfferDesignSection = ({ blueprintId, data, onChange, saving, primarySaveStatus, flushPrimary, businessType, pendingOpenOfferId, onOpenedOffer }: Props) => (
  <div className="h-full flex flex-col">
    <div className="flex-1 overflow-hidden">
      <OfferEcosystemTab
        blueprintId={blueprintId}
        offerDesign={data}
        onChangeOfferDesign={onChange}
        primarySaveStatus={primarySaveStatus}
        flushPrimary={flushPrimary}
        saving={saving}
        businessType={businessType}
        pendingOpenOfferId={pendingOpenOfferId ?? null}
        onOpenedOffer={onOpenedOffer}
      />
    </div>
  </div>
);

export default OfferDesignSection;
