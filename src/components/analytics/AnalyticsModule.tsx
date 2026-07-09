import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { subDays } from "date-fns";
import FunnelSelector from "./FunnelSelector";
import AnalyticsSummary from "./AnalyticsSummary";
import AnalyticsCharts, { type Granularity } from "./AnalyticsCharts";
import DailyDataEntry from "./DailyDataEntry";
import AnalyticsHistory from "./AnalyticsHistory";
import AnalyticsPeriodFilter, { type AnalyticsPeriod } from "./AnalyticsPeriodFilter";
import AnalyticsKPIs from "./AnalyticsKPIs";
import AnalyticsShareDialog from "./AnalyticsShareDialog";
import AnalyticsSavedViews, { loadDefaultView, type LoadedView } from "./AnalyticsSavedViews";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Share2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SelectedFunnel {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  shareToken?: string | null;
}

export interface EditingEntry {
  id: string;
  date: string;
  period_end: string;
  period_type: string;
}

export interface AnalyticsViewConfig {
  period: AnalyticsPeriod;
  granularity: Granularity;
  selectedMetrics: string[] | null;
  selectedKPIs: string[] | null;
  labelOverrides: Record<string, string> | null;
}

interface AnalyticsModuleProps {
  sharedFunnel?: SelectedFunnel | null;
  client?: SupabaseClient<any>;
  readOnly?: boolean;
  initialConfig?: Partial<AnalyticsViewConfig>;
  hideFunnelSelector?: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
}

const AnalyticsModule = ({
  sharedFunnel,
  client,
  readOnly = false,
  initialConfig,
  hideFunnelSelector = false,
  titleOverride,
  subtitleOverride,
}: AnalyticsModuleProps = {}) => {
  const { t } = useTranslation();
  const activeClient = client || supabase;

  const [selectedFunnel, setSelectedFunnel] = useState<SelectedFunnel | null>(sharedFunnel ?? null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(sharedFunnel?.shareToken || null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewName, setActiveViewName] = useState<string | null>(null);

  const [period, setPeriod] = useState<AnalyticsPeriod>(
    initialConfig?.period ?? { start: subDays(new Date(), 30), end: new Date(), label: "last30" }
  );
  const [granularity, setGranularity] = useState<Granularity>(initialConfig?.granularity ?? "day");
  const [selectedMetrics, setSelectedMetrics] = useState<string[] | null>(initialConfig?.selectedMetrics ?? null);
  const [selectedKPIs, setSelectedKPIs] = useState<string[] | null>(initialConfig?.selectedKPIs ?? null);
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>(
    initialConfig?.labelOverrides ?? {}
  );

  // Fullscreen image viewer for funnel-node thumbnails
  useEffect(() => {
    const handler = (e: Event) => {
      const src = (e as CustomEvent).detail?.src;
      if (src) setFullscreenImage(src);
    };
    window.addEventListener("funnel-node-image-view", handler);
    return () => window.removeEventListener("funnel-node-image-view", handler);
  }, []);

  // Load share_token for currently-selected funnel (private mode)
  useEffect(() => {
    if (readOnly || !selectedFunnel?.id) return;
    (async () => {
      const { data } = await supabase.from("funnels").select("share_token").eq("id", selectedFunnel.id).maybeSingle();
      setShareToken((data as any)?.share_token || null);
    })();
  }, [selectedFunnel?.id, readOnly]);

  // Load default saved view on funnel change (private mode only)
  useEffect(() => {
    if (readOnly || !selectedFunnel?.id) return;
    (async () => {
      const def = await loadDefaultView(selectedFunnel.id);
      if (def) {
        setPeriod(def.config.period);
        setGranularity(def.config.granularity);
        setSelectedMetrics(def.config.selectedMetrics);
        setSelectedKPIs(def.config.selectedKPIs);
        setLabelOverrides(def.config.labelOverrides ?? {});
        setActiveViewId(def.id);
        setActiveViewName(def.name);
      } else {
        setActiveViewId(null);
        setActiveViewName(null);
      }
    })();
  }, [selectedFunnel?.id, readOnly]);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
    setEditingEntry(null);
    setEntryOpen(false);
  };

  const openEdit = (e: EditingEntry) => {
    setEditingEntry(e);
    setEntryOpen(true);
  };

  const currentConfig: AnalyticsViewConfig = useMemo(() => ({
    period, granularity, selectedMetrics, selectedKPIs,
    labelOverrides: Object.keys(labelOverrides).length ? labelOverrides : null,
  }), [period, granularity, selectedMetrics, selectedKPIs, labelOverrides]);

  const applyLoadedView = useCallback((v: LoadedView) => {
    setPeriod(v.config.period);
    setGranularity(v.config.granularity);
    setSelectedMetrics(v.config.selectedMetrics);
    setSelectedKPIs(v.config.selectedKPIs);
    setLabelOverrides(v.config.labelOverrides ?? {});
    setActiveViewId(v.id);
    setActiveViewName(v.name);
  }, []);

  const setLabelOverride = useCallback((key: string, label: string | null) => {
    setLabelOverrides((prev) => {
      const next = { ...prev };
      if (label && label.trim()) next[key] = label.trim();
      else delete next[key];
      return next;
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{titleOverride ?? t("analytics.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{subtitleOverride ?? t("analytics.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {readOnly && selectedFunnel && (
              <AnalyticsPeriodFilter value={period} onChange={setPeriod} />
            )}
            {!hideFunnelSelector && (
              <FunnelSelector
                selectedFunnelId={selectedFunnel?.id || null}
                onSelect={(f) => setSelectedFunnel(f as SelectedFunnel)}
              />
            )}
            {!readOnly && selectedFunnel && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5">
                <Share2 className="w-4 h-4" />
                {t("analytics.share") || "Share"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {selectedFunnel ? (
        <div className="flex-1 overflow-auto p-6 space-y-8">
          {!readOnly && (
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <AnalyticsPeriodFilter value={period} onChange={setPeriod} />
              <AnalyticsSavedViews
                funnelId={selectedFunnel.id}
                currentConfig={currentConfig}
                activeViewId={activeViewId}
                activeViewName={activeViewName}
                onApply={applyLoadedView}
                onActiveViewChange={(id, name) => { setActiveViewId(id); setActiveViewName(name); }}
              />
              <Button size="sm" className="gap-1.5" onClick={() => { setEditingEntry(null); setEntryOpen(true); }}>
                <Plus className="w-4 h-4" />
                {t("analytics.addEntry") || "Add data entry"}
              </Button>
            </div>
          )}

          <AnalyticsSummary
            funnelId={selectedFunnel.id}
            nodes={selectedFunnel.nodes}
            edges={selectedFunnel.edges}
            periodStart={period.start}
            periodEnd={period.end}
            refreshKey={refreshKey}
            client={activeClient}
          />

          <AnalyticsKPIs
            funnelId={selectedFunnel.id}
            nodes={selectedFunnel.nodes}
            edges={selectedFunnel.edges}
            periodStart={period.start}
            periodEnd={period.end}
            refreshKey={refreshKey}
            client={activeClient}
            selectedKPIs={selectedKPIs}
            onSelectedKPIsChange={setSelectedKPIs}
            labelOverrides={labelOverrides}
            onLabelOverride={readOnly ? undefined : setLabelOverride}
            readOnly={readOnly}
            title={t("analytics.summary.title")}
          />

          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t("analytics.charts.title")}</h2>
            <AnalyticsCharts
              funnelId={selectedFunnel.id}
              nodes={selectedFunnel.nodes}
              periodStart={period.start}
              periodEnd={period.end}
              refreshKey={refreshKey}
              client={activeClient}
              granularity={granularity}
              onGranularityChange={setGranularity}
              selectedMetrics={selectedMetrics}
              onSelectedMetricsChange={setSelectedMetrics}
              labelOverrides={labelOverrides}
              onLabelOverride={readOnly ? undefined : setLabelOverride}
            />
          </div>

          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t("analytics.dataEntries") || "Data entries"}</h2>
            <AnalyticsHistory
              funnelId={selectedFunnel.id}
              nodes={selectedFunnel.nodes}
              refreshKey={refreshKey}
              onEdit={readOnly ? undefined : openEdit}
              client={activeClient}
              readOnly={readOnly}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {t("analytics.noFunnelSelected")}
        </div>
      )}

      {!readOnly && selectedFunnel && (
        <>
          <Dialog open={entryOpen} onOpenChange={(o) => { setEntryOpen(o); if (!o) setEditingEntry(null); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? (t("analytics.editEntry") || "Edit data entry") : (t("analytics.dailyEntry") || "Data entry")}
                </DialogTitle>
              </DialogHeader>
              <DailyDataEntry
                funnelId={selectedFunnel.id}
                nodes={selectedFunnel.nodes}
                edges={selectedFunnel.edges}
                editingEntry={editingEntry}
                onSaved={handleSaved}
                onCancelEdit={() => { setEditingEntry(null); setEntryOpen(false); }}
              />
            </DialogContent>
          </Dialog>

          <AnalyticsShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            funnelId={selectedFunnel.id}
            funnelName={selectedFunnel.name}
            shareToken={shareToken}
            onShareTokenChange={setShareToken}
            config={currentConfig}
            activeViewId={activeViewId}
            activeViewName={activeViewName}
          />
        </>
      )}

      <Dialog open={!!fullscreenImage} onOpenChange={(open) => { if (!open) setFullscreenImage(null); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden">
          <div className="w-full h-full overflow-auto bg-black">
            {fullscreenImage && (
              <img src={fullscreenImage} alt="Screenshot" className="w-full h-auto block" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsModule;
