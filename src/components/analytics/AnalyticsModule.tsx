import { useState } from "react";
import { useTranslation } from "react-i18next";
import FunnelSelector from "./FunnelSelector";
import AnalyticsSummary from "./AnalyticsSummary";
import AnalyticsCharts from "./AnalyticsCharts";
import DailyDataEntry from "./DailyDataEntry";
import AnalyticsHistory from "./AnalyticsHistory";

interface SelectedFunnel {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
}

const AnalyticsModule = () => {
  const { t } = useTranslation();
  const [selectedFunnel, setSelectedFunnel] = useState<SelectedFunnel | null>(null);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t("analytics.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("analytics.subtitle")}</p>
          </div>
          <FunnelSelector selectedFunnelId={selectedFunnel?.id || null} onSelect={setSelectedFunnel} />
        </div>
      </div>

      {selectedFunnel ? (
        <div className="flex-1 overflow-auto p-6 space-y-8">
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t("analytics.summary.title")}</h2>
            <AnalyticsSummary funnelId={selectedFunnel.id} nodes={selectedFunnel.nodes} edges={selectedFunnel.edges} />
          </div>

          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t("analytics.charts.title")}</h2>
            <AnalyticsCharts funnelId={selectedFunnel.id} nodes={selectedFunnel.nodes} />
          </div>

          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t("analytics.dailyEntry")}</h2>
            <DailyDataEntry funnelId={selectedFunnel.id} nodes={selectedFunnel.nodes} edges={selectedFunnel.edges} />
          </div>

          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t("analytics.history")}</h2>
            <AnalyticsHistory funnelId={selectedFunnel.id} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {t("analytics.noFunnelSelected")}
        </div>
      )}
    </div>
  );
};

export default AnalyticsModule;
