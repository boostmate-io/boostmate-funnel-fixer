import { useState } from "react";
import OfferList from "./OfferList";
import OfferEditor from "./OfferEditor";

const OfferModule = () => {
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  if (editingOfferId) {
    return (
      <OfferEditor
        offerId={editingOfferId}
        onBack={() => setEditingOfferId(null)}
      />
    );
  }

  return <OfferList onEditOffer={setEditingOfferId} />;
};

export default OfferModule;
