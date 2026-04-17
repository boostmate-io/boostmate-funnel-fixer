import { useState } from "react";
import { Users, Package, Workflow, Palette, Award, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useBlueprint } from "./useBlueprint";
import { calculateClarityProgress, type SectionId } from "./types";
import CustomerClaritySection from "./CustomerClaritySection";
import PlaceholderSection from "./PlaceholderSection";

const sections: { id: SectionId; label: string; icon: typeof Users; description: string }[] = [
  { id: "customer-clarity", label: "Customer Clarity", icon: Users, description: "Understand the ideal customer, their pain, desires & transformation." },
  { id: "offer-stack", label: "Offer Stack", icon: Package, description: "Define free, low-ticket, core & premium offers." },
  { id: "growth-system", label: "Growth System", icon: Workflow, description: "Traffic, funnels, nurture, conversion & ascension." },
  { id: "brand-strategy", label: "Brand Strategy", icon: Palette, description: "Positioning, voice, personality & messaging." },
  { id: "proof-authority", label: "Proof & Authority", icon: Award, description: "Credibility, testimonials, case studies & founder story." },
];

const BusinessBlueprintModule = () => {
  const [activeSection, setActiveSection] = useState<SectionId>("customer-clarity");
  const { blueprint, loading, saving, updateCustomerClarity } = useBlueprint();

  const clarityProgress = blueprint ? calculateClarityProgress(blueprint.customer_clarity) : 0;

  const sectionProgress: Record<SectionId, number> = {
    "customer-clarity": clarityProgress,
    "offer-stack": 0,
    "growth-system": 0,
    "brand-strategy": 0,
    "proof-authority": 0,
  };

  if (loading || !blueprint) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
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
      {/* Section nav */}
      <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-display font-bold text-foreground">Business Blueprint</h1>
          </div>
          <p className="text-xs text-muted-foreground">Your strategic foundation</p>
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
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-foreground/85"}`}>
                        {s.label}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{prog}%</span>
                    </div>
                    <Progress value={prog} className="h-1 mt-2" />
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug line-clamp-2">
                      {s.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active section content */}
      <div className="flex-1 overflow-hidden">{renderActive()}</div>
    </div>
  );
};

export default BusinessBlueprintModule;
