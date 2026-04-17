import { useState } from "react";
import { Users, Package, Workflow, Palette, Award, Loader2, Sparkles, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBlueprint } from "./useBlueprint";
import { calculateClarityProgress, type SectionId } from "./types";
import CustomerClaritySection from "./CustomerClaritySection";
import PlaceholderSection from "./PlaceholderSection";
import BlueprintOverview from "./BlueprintOverview";

const sections: { id: SectionId; label: string; icon: typeof Users }[] = [
  { id: "customer-clarity", label: "Customer Clarity", icon: Users },
  { id: "offer-stack", label: "Offer Stack", icon: Package },
  { id: "growth-system", label: "Growth System", icon: Workflow },
  { id: "brand-strategy", label: "Brand Strategy", icon: Palette },
  { id: "proof-authority", label: "Proof & Authority", icon: Award },
];

type Mode = "overview" | "edit";

const BusinessBlueprintModule = () => {
  const [mode, setMode] = useState<Mode>("overview");
  const [activeSection, setActiveSection] = useState<SectionId>("customer-clarity");
  const { blueprint, loading, saving, updateCustomerClarity } = useBlueprint();

  if (loading || !blueprint) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const clarityProgress = calculateClarityProgress(blueprint.customer_clarity);
  const sectionProgress: Record<SectionId, number> = {
    "customer-clarity": clarityProgress,
    "offer-stack": 0,
    "growth-system": 0,
    "brand-strategy": 0,
    "proof-authority": 0,
  };

  const handleEdit = (section?: SectionId) => {
    if (section) setActiveSection(section);
    setMode("edit");
  };

  if (mode === "overview") {
    return (
      <BlueprintOverview
        clarity={blueprint.customer_clarity}
        onEdit={handleEdit}
      />
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
          />
        );
      case "offer-stack":
        return <PlaceholderSection title="Offer Stack" description="Define your full value ladder — from lead magnet to premium core offer." icon={Package} comingNext={["Free / lead magnet offer", "Low-ticket entry offer", "Core offer & signature method", "Premium / high-ticket offer", "Value ladder & ascension flow"]} />;
      case "growth-system":
        return <PlaceholderSection title="Growth System" description="Map traffic, funnels, nurture and conversion into one coherent system." icon={Workflow} comingNext={["Traffic sources & channels", "Funnel mapping", "Nurture sequences", "Conversion mechanics", "Ascension & delivery flow"]} />;
      case "brand-strategy":
        return <PlaceholderSection title="Brand Strategy" description="Make your brand unmistakable — positioning, voice and visual direction." icon={Palette} comingNext={["Positioning & differentiation", "Brand voice & personality", "Perception & messaging themes", "Visual direction", "Tagline & manifesto"]} />;
      case "proof-authority":
        return <PlaceholderSection title="Proof & Authority" description="Build the credibility stack that makes prospects trust you instantly." icon={Award} comingNext={["Testimonials & social proof", "Case studies & metrics", "Trust assets (logos, awards)", "Founder story & expertise", "Authority positioning"]} />;
    }
  };

  return (
    <div className="flex h-full bg-background-dashboard">
      {/* Top-level section nav */}
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

      {/* Active section content */}
      <div className="flex-1 overflow-hidden">{renderActive()}</div>
    </div>
  );
};

export default BusinessBlueprintModule;
