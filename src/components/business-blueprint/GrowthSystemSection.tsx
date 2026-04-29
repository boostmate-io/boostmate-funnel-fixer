// =============================================================================
// GrowthSystemSection — V2 redesign with 3 tabs:
//   1. Acquisition  → how strangers enter
//   2. Funnel Architecture → offer ↔ funnel mapping
//   3. Ascension → how buyers move deeper
// =============================================================================

import { useState } from "react";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  GROWTH_TABS,
  type GrowthSystemData,
  type GrowthTab,
  type AcquisitionData,
  type AscensionData,
  calcAcquisitionProgress,
  calcArchitectureProgress,
  calcAscensionProgress,
} from "./growthSystemTypes";
import { getBusinessType } from "./businessTypes";
import { useFunnelMappings } from "./useFunnelMappings";
import type { EcosystemOfferRow } from "./useEcosystemOffers";
import AcquisitionTab from "./growth/AcquisitionTab";
import FunnelArchitectureTab from "./growth/FunnelArchitectureTab";
import AscensionTab from "./growth/AscensionTab";

interface Props {
  blueprintId: string;
  data: GrowthSystemData;
  offers: EcosystemOfferRow[];
  onChange: (patch: Partial<GrowthSystemData>) => void;
  saving: boolean;
  businessType?: string;
}

const GrowthSystemSection = ({
  blueprintId,
  data,
  offers,
  onChange,
  saving,
  businessType,
}: Props) => {
  const [active, setActive] = useState<GrowthTab>("acquisition");
  const bt = getBusinessType(businessType);
  const { mappings, addMapping, updateMapping, deleteMapping } = useFunnelMappings(blueprintId);

  const tabConfig = GROWTH_TABS.find((t) => t.id === active)!;
  const Icon = tabConfig.icon;

  const tabProgress: Record<GrowthTab, number> = {
    acquisition: calcAcquisitionProgress(data.acquisition),
    architecture: calcArchitectureProgress(mappings),
    ascension: calcAscensionProgress(data.ascension),
  };

  const handleAcquisitionChange = (patch: Partial<AcquisitionData>) => {
    onChange({ acquisition: { ...data.acquisition, ...patch } });
  };

  const handleAscensionChange = (patch: Partial<AscensionData>) => {
    onChange({ ascension: { ...data.ascension, ...patch } });
  };

  const handleAiCoach = () => {
    toast.info("Growth coach — AI suggestions coming soon");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab navigation (sticky like Offer Design) */}
      <div className="border-b border-border bg-card px-8 shrink-0">
        <div className="max-w-6xl mx-auto flex gap-1 -mb-px overflow-x-auto">
          {GROWTH_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = active === tab.id;
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-display font-bold text-foreground">{tabConfig.label}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{tabConfig.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleAiCoach} className="gap-1.5 h-8">
                    <Wand2 className="w-3.5 h-3.5" />
                    Coach
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI growth coach coming soon</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Sequencing hint */}
          <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-4 flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">
                Why this matters
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {active === "acquisition" &&
                  "Acquisition defines how strangers enter your ecosystem. Without a clear traffic source + entry offer, the rest of your growth system has no fuel."}
                {active === "architecture" &&
                  "Funnel Architecture is where strategy becomes execution. Map every offer to its selling funnel — this becomes the blueprint your Funnel Builder will load."}
                {active === "ascension" &&
                  "Ascension turns one-time buyers into long-term clients. The biggest LTV gains come from systematic upgrades, retention and reactivation."}
              </p>
            </div>
          </div>

          {/* Active tab content */}
          {active === "acquisition" && (
            <AcquisitionTab
              data={data.acquisition}
              onChange={handleAcquisitionChange}
              offers={offers}
            />
          )}
          {active === "architecture" && (
            <FunnelArchitectureTab
              mappings={mappings}
              offers={offers}
              trafficSources={data.acquisition.traffic_sources}
              onAdd={addMapping}
              onUpdate={updateMapping}
              onDelete={deleteMapping}
            />
          )}
          {active === "ascension" && (
            <AscensionTab
              data={data.ascension}
              onChange={handleAscensionChange}
              offers={offers}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GrowthSystemSection;
