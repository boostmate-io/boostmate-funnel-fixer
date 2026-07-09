import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Bookmark, Check, Star, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { AnalyticsViewConfig } from "./AnalyticsModule";

interface SavedView {
  id: string;
  name: string;
  config: any;
  is_default: boolean;
}

export interface LoadedView {
  id: string;
  name: string;
  config: AnalyticsViewConfig;
}

interface Props {
  funnelId: string;
  currentConfig: AnalyticsViewConfig;
  activeViewId: string | null;
  activeViewName: string | null;
  onApply: (v: LoadedView) => void;
  onActiveViewChange: (id: string | null, name: string | null) => void;
}

const configToJSON = (c: AnalyticsViewConfig) => ({
  period: {
    start: c.period.start.toISOString(),
    end: c.period.end.toISOString(),
    label: c.period.label,
  },
  granularity: c.granularity,
  selectedMetrics: c.selectedMetrics,
  selectedKPIs: c.selectedKPIs,
  labelOverrides: c.labelOverrides,
});

const configFromJSON = (cfg: any, fallback: AnalyticsViewConfig): AnalyticsViewConfig => ({
  period: cfg.period
    ? { start: new Date(cfg.period.start), end: new Date(cfg.period.end), label: cfg.period.label }
    : fallback.period,
  granularity: cfg.granularity || fallback.granularity,
  selectedMetrics: cfg.selectedMetrics ?? null,
  selectedKPIs: cfg.selectedKPIs ?? null,
  labelOverrides: cfg.labelOverrides ?? null,
});

const AnalyticsSavedViews = ({
  funnelId, currentConfig, activeViewId, activeViewName, onApply, onActiveViewChange,
}: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [views, setViews] = useState<SavedView[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  const load = useCallback(async () => {
    if (!funnelId) return;
    const { data } = await supabase
      .from("analytics_saved_views")
      .select("id, name, config, is_default")
      .eq("funnel_id", funnelId)
      .order("created_at", { ascending: true });
    setViews((data as SavedView[]) || []);
  }, [funnelId]);

  useEffect(() => { load(); }, [load]);

  const insertNew = async () => {
    if (!user || !activeSubAccountId || !name.trim()) return;
    const { data, error } = await supabase.from("analytics_saved_views").insert({
      funnel_id: funnelId,
      user_id: user.id,
      sub_account_id: activeSubAccountId,
      name: name.trim(),
      config: configToJSON(currentConfig),
      is_default: false,
    }).select("id, name").maybeSingle();
    if (error) toast.error(t("analytics.savedViews.saveError"));
    else {
      toast.success(t("analytics.savedViews.saved"));
      setName("");
      setSaveOpen(false);
      if (data) onActiveViewChange((data as any).id, (data as any).name);
      load();
    }
  };

  const overwriteActive = async () => {
    if (!activeViewId) return;
    const { error } = await supabase
      .from("analytics_saved_views")
      .update({ config: configToJSON(currentConfig) })
      .eq("id", activeViewId);
    if (error) toast.error(t("analytics.savedViews.saveError"));
    else {
      toast.success(t("analytics.savedViews.overwritten"));
      setChoiceOpen(false);
      load();
    }
  };

  const handleSaveClick = () => {
    if (activeViewId) setChoiceOpen(true);
    else setSaveOpen(true);
  };

  const handleApply = (v: SavedView) => {
    onApply({ id: v.id, name: v.name, config: configFromJSON(v.config || {}, currentConfig) });
  };

  const handleSetDefault = async (v: SavedView) => {
    await supabase
      .from("analytics_saved_views")
      .update({ is_default: false })
      .eq("funnel_id", funnelId)
      .eq("is_default", true);
    const { error } = await supabase
      .from("analytics_saved_views")
      .update({ is_default: true })
      .eq("id", v.id);
    if (error) toast.error(t("analytics.savedViews.saveError"));
    else {
      toast.success(t("analytics.savedViews.defaultSet"));
      load();
    }
  };

  const handleClearDefault = async (v: SavedView) => {
    const { error } = await supabase
      .from("analytics_saved_views")
      .update({ is_default: false })
      .eq("id", v.id);
    if (error) toast.error(t("analytics.savedViews.saveError"));
    else load();
  };

  const handleDelete = async (v: SavedView) => {
    const { error } = await supabase.from("analytics_saved_views").delete().eq("id", v.id);
    if (error) toast.error(t("analytics.savedViews.saveError"));
    else {
      toast.success(t("analytics.savedViews.deleted"));
      if (v.id === activeViewId) onActiveViewChange(null, null);
      load();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="w-4 h-4" />
            {activeViewName || t("analytics.savedViews.title")}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onClick={handleSaveClick}>
            <Bookmark className="w-4 h-4 mr-2" />
            {activeViewId
              ? t("analytics.savedViews.saveChanges")
              : t("analytics.savedViews.saveCurrent")}
          </DropdownMenuItem>
          {activeViewId && (
            <DropdownMenuItem onClick={() => onActiveViewChange(null, null)}>
              {t("analytics.savedViews.clearActive")}
            </DropdownMenuItem>
          )}
          {views.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("analytics.savedViews.saved")}
              </DropdownMenuLabel>
              {views.map((v) => (
                <div key={v.id} className="flex items-center px-1 py-0.5 gap-1 hover:bg-accent rounded-sm">
                  <button
                    onClick={() => handleApply(v)}
                    className="flex-1 text-left text-sm px-2 py-1.5 truncate flex items-center gap-2"
                    title={v.name}
                  >
                    {v.is_default && <Star className="w-3 h-3 fill-primary text-primary shrink-0" />}
                    <span className="truncate">
                      {v.name}
                      {v.id === activeViewId && (
                        <span className="ml-1 text-[10px] text-primary">
                          · {t("analytics.savedViews.active")}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); v.is_default ? handleClearDefault(v) : handleSetDefault(v); }}
                    className="p-1 hover:bg-muted rounded"
                    title={v.is_default ? t("analytics.savedViews.unsetDefault") : t("analytics.savedViews.setDefault")}
                  >
                    {v.is_default ? <Check className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                    className="p-1 hover:bg-muted rounded text-destructive"
                    title={t("analytics.savedViews.deleteView")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Overwrite / Save-as choice */}
      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("analytics.savedViews.saveChoiceTitle")}</DialogTitle>
            <DialogDescription>
              {t("analytics.savedViews.saveChoiceDesc", { name: activeViewName ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setChoiceOpen(false)}>
              {t("analytics.savedViews.cancel")}
            </Button>
            <Button variant="secondary" onClick={() => { setChoiceOpen(false); setSaveOpen(true); }}>
              {t("analytics.savedViews.saveAsNew")}
            </Button>
            <Button onClick={overwriteActive}>
              {t("analytics.savedViews.overwrite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save-new dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("analytics.savedViews.saveCurrent")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("analytics.savedViews.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") insertNew(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              {t("analytics.savedViews.cancel")}
            </Button>
            <Button onClick={insertNew} disabled={!name.trim()}>
              {t("analytics.savedViews.saveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const loadDefaultView = async (funnelId: string): Promise<LoadedView | null> => {
  const { data } = await supabase
    .from("analytics_saved_views")
    .select("id, name, config")
    .eq("funnel_id", funnelId)
    .eq("is_default", true)
    .maybeSingle();
  if (!data) return null;
  const cfg: any = (data as any).config || {};
  if (!cfg.period) return null;
  return {
    id: (data as any).id,
    name: (data as any).name,
    config: {
      period: { start: new Date(cfg.period.start), end: new Date(cfg.period.end), label: cfg.period.label },
      granularity: cfg.granularity || "day",
      selectedMetrics: cfg.selectedMetrics ?? null,
      selectedKPIs: cfg.selectedKPIs ?? null,
      labelOverrides: cfg.labelOverrides ?? null,
    },
  };
};

export default AnalyticsSavedViews;
