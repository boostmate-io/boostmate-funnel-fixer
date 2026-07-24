import { useEffect, useState } from "react";
import { Users, Package, Workflow, Palette, Award, Loader2, Sparkles, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBlueprint } from "./useBlueprint";
import { useWorkspaceSettings } from "./useWorkspaceSettings";
import { useEcosystemOffers } from "./useEcosystemOffers";
import { useFunnelMappings } from "./useFunnelMappings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { calculateClarityProgress, type SectionId } from "./types";
import { calculateOfferDesignProgress } from "./offerDesignTypes";
import {
  normalizeGrowthSystem,
  type GrowthSystemData,
} from "./growthSystemTypes";
import { useGrowthArchitecture } from "@/lib/growth-architecture/hooks";
import { getBusinessType } from "./businessTypes";
import CustomerClaritySection from "./CustomerClaritySection";
import OfferDesignSection from "./OfferDesignSection";
import GrowthArchitectureSection from "./growth-architecture/GrowthArchitectureSection";
import BrandIdentitySection, { calcBrandIdentityProgress, type BrandIdentityData } from "./BrandIdentitySection";
import BlueprintOverview from "./BlueprintOverview";
import BlueprintSetupWizard from "./BlueprintSetupWizard";
import BlueprintViewMode from "./BlueprintViewMode";
import BlueprintShareDialog from "./BlueprintShareDialog";
import ProofAuthoritySection from "./ProofAuthoritySection";
import { calcProofAuthorityProgress } from "./proofAuthorityTypes";

const sections: { id: SectionId; label: string; icon: typeof Users }[] = [
  { id: "customer-clarity", label: "Customer Clarity", icon: Users },
  { id: "offer-design", label: "Offer Design", icon: Package },
  { id: "growth-system", label: "Growth Architecture", icon: Workflow },
  { id: "brand-strategy", label: "Brand Strategy", icon: Palette },
  { id: "proof-authority", label: "Authority & Content", icon: Award },
];

type Mode = "overview" | "edit" | "view";

const BusinessBlueprintModule = () => {
  const [mode, setMode] = useState<Mode>("overview");
  const [activeSection, setActiveSection] = useState<SectionId>("customer-clarity");
  const [pendingOpenOfferId, setPendingOpenOfferId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { blueprint, offerDesign, proofAuthority, loading, saving, updateCustomerClarity, updateOfferDesign, updateGrowthSystem, updateProofAuthority, updateBrandStrategy, setShareToken } = useBlueprint();
  const { settings, loading: loadingSettings, update: updateSettings } = useWorkspaceSettings();
  const { activeSubAccount, activeSubAccountId } = useWorkspace() as any;

  const { offers, tierCounts } = useEcosystemOffers({
    blueprintId: blueprint?.id ?? null,
    offerDesign: offerDesign,
  });
  const { mappings } = useFunnelMappings(blueprint?.id ?? null);
  const { rows: growthRoutes } = useGrowthArchitecture(activeSubAccountId ?? null);

  useEffect(() => {
    if (!loadingSettings && settings && settings.setup_status === "pending") {
      setSetupOpen(true);
    }
  }, [loadingSettings, settings]);

  // Deep-link: open a specific offer in Offer Design > Ecosystem
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const offerId = detail?.offerId as string | undefined;
      if (!offerId) return;
      setMode("edit");
      setActiveSection("offer-design");
      setPendingOpenOfferId(offerId);
    };
    window.addEventListener("boostmate:open-offer-design", handler);
    return () => window.removeEventListener("boostmate:open-offer-design", handler);
  }, []);

  if (loading || loadingSettings || !blueprint || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const bt = getBusinessType(settings.business_type);
  const offerData = offerDesign;
  const growthData: GrowthSystemData = normalizeGrowthSystem(blueprint.growth_system);
  const brandIdentity = (blueprint.brand_strategy || {}) as BrandIdentityData;
  const clarityProgress = calculateClarityProgress(blueprint.customer_clarity);
  const offerProgress = calculateOfferDesignProgress(offerData, tierCounts);
  const growthProgress = growthRoutes.length >= 1 ? 100 : 0;
  const brandProgress = calcBrandIdentityProgress(brandIdentity);
  const proofProgress = calcProofAuthorityProgress(proofAuthority);
  const sectionProgress: Record<SectionId, number> = {
    "customer-clarity": clarityProgress,
    "offer-design": offerProgress,
    "growth-system": growthProgress,
    "brand-strategy": brandProgress,
    "proof-authority": proofProgress,
  };

  const handleEdit = (section?: SectionId) => {
    if (section) setActiveSection(section);
    setMode("edit");
  };

  if (mode === "view") {
    return (
      <>
        <BlueprintViewMode
          workspaceName={activeSubAccount?.name}
          workspace={{
            business_type: settings.business_type,
            currency: settings.currency,
            help_achieve: settings.help_achieve,
            who_help: settings.who_help,
            main_goal: settings.main_goal,
            biggest_challenge: settings.biggest_challenge,
          }}
          clarity={blueprint.customer_clarity}
          offer={offerData}
          growth={growthData}
          mappings={mappings}
          offers={offers}
          proofAuthority={proofAuthority}
          onBack={() => setMode("overview")}
          onShare={() => setShareOpen(true)}
        />
        <BlueprintShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          blueprintId={blueprint.id}
          shareToken={blueprint.share_token}
          onShareTokenChange={setShareToken}
        />
      </>
    );
  }

  const overallProgress = Math.round(
    (clarityProgress + offerProgress + growthProgress + brandProgress + proofProgress) / 5,
  );
  const isEmptyBlueprint = overallProgress === 0;

  if (mode === "overview") {
    return (
      <>
        <BlueprintOverview
          clarity={blueprint.customer_clarity}
          offer={offerData}
          growth={growthData}
          mappings={mappings}
          offers={offers}
          brandIdentity={brandIdentity}
          proofAuthority={proofAuthority}
          businessType={settings.business_type}
          onEdit={handleEdit}
          onView={() => setMode("view")}
          onShare={() => setShareOpen(true)}
          onOpenSetup={() => setSetupOpen(true)}
          setupCompleted={settings.setup_status === "completed"}
        />
        <BlueprintSetupWizard
          open={setupOpen}
          onOpenChange={setSetupOpen}
          isEdit={settings.setup_status === "completed"}
          initialValues={{
            business_type: settings.business_type,
          }}
          onComplete={(patch) => {
            const wasFirstTime = settings.setup_status !== "completed";
            updateSettings(patch, { immediate: true });
            setSetupOpen(false);
            if (wasFirstTime && isEmptyBlueprint) {
              setMode("edit");
            }
          }}
          onSkip={() => {
            if (settings.setup_status === "pending") {
              updateSettings({ setup_status: "skipped" }, { immediate: true, silent: true });
            }
            setSetupOpen(false);
            if (settings.setup_status !== "completed" && isEmptyBlueprint) {
              setMode("edit");
            }
          }}
        />
        <BlueprintShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          blueprintId={blueprint.id}
          shareToken={blueprint.share_token}
          onShareTokenChange={setShareToken}
        />
      </>
    );
  }

  const renderActive = () => {
    switch (activeSection) {
      case "customer-clarity":
        return (
          <CustomerClaritySection
            data={blueprint.customer_clarity}
            onChange={updateCustomerClarity}
            saving={saving}
            businessType={settings.business_type}
          />
        );
      case "offer-design":
        return (
          <OfferDesignSection
            blueprintId={blueprint.id}
            data={offerData}
            onChange={updateOfferDesign}
            saving={saving}
            businessType={settings.business_type}
            pendingOpenOfferId={pendingOpenOfferId}
            onOpenedOffer={() => setPendingOpenOfferId(null)}
          />
        );
      case "growth-system":
        return (
          <GrowthArchitectureSection
            offers={offers}
            saving={saving}
          />
        );
      case "brand-strategy":
        return (
          <BrandIdentitySection
            data={brandIdentity}
            onChange={updateBrandStrategy}
            saving={saving}
          />
        );
      case "proof-authority":
        return (
          <ProofAuthoritySection
            data={proofAuthority}
            onChange={updateProofAuthority}
            saving={saving}
          />
        );
    }
  };

  return (
    <div className="flex h-full bg-background-dashboard">
      <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("overview")}
            className="w-full justify-start gap-2 mb-3 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Overview
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-base font-display font-bold text-foreground">Business Blueprint</h1>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sections.map((s) => {
            const isActive = activeSection === s.id;
            const Icon = s.icon;
            const prog = sectionProgress[s.id];
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left rounded-lg p-3 transition-all border ${
                  isActive
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "border-transparent hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-semibold flex-1 ${isActive ? "text-foreground" : "text-foreground/85"}`}>
                    {s.label}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{prog}%</span>
                </div>
                <Progress value={prog} className="h-1" />
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("overview")}
            className="w-full gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderActive()}</div>
    </div>
  );
};

export default BusinessBlueprintModule;
