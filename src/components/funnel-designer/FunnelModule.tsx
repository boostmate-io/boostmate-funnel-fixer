import { useState } from "react";
import FunnelList from "./FunnelList";
import FunnelDesigner from "./FunnelDesigner";

interface FunnelModuleProps {
  onNavigateToOffer?: (offerId: string) => void;
}

const FunnelModule = ({ onNavigateToOffer }: FunnelModuleProps) => {
  const [editingFunnel, setEditingFunnel] = useState<any | null>(null);
  const [showDesigner, setShowDesigner] = useState(false);

  if (showDesigner || editingFunnel) {
    return (
      <FunnelDesigner
        onNavigateToOffer={onNavigateToOffer}
        initialFunnel={editingFunnel}
        onBackToList={() => { setEditingFunnel(null); setShowDesigner(false); }}
      />
    );
  }

  return (
    <FunnelList
      onOpenFunnel={(funnel) => setEditingFunnel(funnel)}
      onCreateNew={() => setShowDesigner(true)}
    />
  );
};

export default FunnelModule;
