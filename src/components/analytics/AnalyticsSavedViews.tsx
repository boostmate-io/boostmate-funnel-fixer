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

interface Props {
  funnelId: string;
  currentConfig: AnalyticsViewConfig;
  onApply: (config: AnalyticsViewConfig) => void;
}

const AnalyticsSavedViews = ({ funnelId, currentConfig, onApply }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [views, setViews] = useState<SavedView[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

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

  const serializedConfig = (): any => ({
    period: {
      start: currentConfig.period.start.toISOString(),
      end: currentConfig.period.end.toISOString(),
      label: currentConfig.period.label,
    },
    granularity: currentConfig.granularity,
    selectedMetrics: currentConfig.selectedMetrics,
    selectedKPIs: currentConfig.selectedKPIs,
  });

  const handleSave = async () => {
    if (!user || !activeSubAccountId || !name.trim()) return;
    const { error } = await supabase.from("analytics_saved_views").insert({
      funnel_id: funnelId,
      user_id: user.id,
      sub_account_id: activeSubAccountId,
      name: name.trim(),
      config: serializedConfig(),
      is_default: false,
    });
    if (error) toast.error(t("analytics.savedViews.saveError") || "Failed to save view");
    else {
      toast.success(t("analytics.savedViews.saved") || "View saved");
      setName("");
      setSaveOpen(false);
      load();
    }
  };

  const handleApply = (v: SavedView) => {
    const cfg = v.config || {};
    onApply({
      period: cfg.period
        ? { start: new Date(cfg.period.start), end: new Date(cfg.period.end), label: cfg.period.label }
        : currentConfig.period,
      granularity: cfg.granularity || currentConfig.granularity,
      selectedMetrics: cfg.selectedMetrics ?? null,
      selectedKPIs: cfg.selectedKPIs ?? null,
    });
  };

  const handleSetDefault = async (v: SavedView) => {
    // clear existing defaults on this funnel, then set this one
    await supabase
      .from("analytics_saved_views")
      .update({ is_default: false })
      .eq("funnel_id", funnelId)
      .eq("is_default", true);
    const { error } = await supabase
      .from("analytics_saved_views")
      .update({ is_default: true })
      .eq("id", v.id);
    if (error) toast.error(t("analytics.savedViews.saveError") || "Failed to update");
    else {
      toast.success(t("analytics.savedViews.defaultSet") || "Set as default");
      load();
    }
  };

  const handleClearDefault = async (v: SavedView) => {
    const { error } = await supabase
      .from("analytics_saved_views")
      .update({ is_default: false })
      .eq("id", v.id);
    if (error) toast.error(t("analytics.savedViews.saveError") || "Failed to update");
    else load();
  };

  const handleDelete = async (v: SavedView) => {
    const { error } = await supabase.from("analytics_saved_views").delete().eq("id", v.id);
    if (error) toast.error(t("analytics.savedViews.saveError") || "Failed to delete");
    else {
      toast.success(t("analytics.savedViews.deleted") || "View deleted");
      load();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="w-4 h-4" />
            {t("analytics.savedViews.title") || "Views"}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onClick={() => setSaveOpen(true)}>
            <Bookmark className="w-4 h-4 mr-2" />
            {t("analytics.savedViews.saveCurrent") || "Save current view..."}
          </DropdownMenuItem>
          {views.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("analytics.savedViews.saved") || "Saved views"}
              </DropdownMenuLabel>
              {views.map((v) => (
                <div key={v.id} className="flex items-center px-1 py-0.5 gap-1 hover:bg-accent rounded-sm">
                  <button
                    onClick={() => handleApply(v)}
                    className="flex-1 text-left text-sm px-2 py-1.5 truncate flex items-center gap-2"
                    title={v.name}
                  >
                    {v.is_default && <Star className="w-3 h-3 fill-primary text-primary shrink-0" />}
                    <span className="truncate">{v.name}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); v.is_default ? handleClearDefault(v) : handleSetDefault(v); }}
                    className="p-1 hover:bg-muted rounded"
                    title={v.is_default ? (t("analytics.savedViews.unsetDefault") || "Unset default") : (t("analytics.savedViews.setDefault") || "Set as default")}
                  >
                    {v.is_default ? <Check className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                    className="p-1 hover:bg-muted rounded text-destructive"
                    title={t("common.delete") || "Delete"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("analytics.savedViews.saveCurrent") || "Save current view"}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("analytics.savedViews.namePlaceholder") || "View name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {t("common.save") || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const loadDefaultView = async (funnelId: string): Promise<AnalyticsViewConfig | null> => {
  const { data } = await supabase
    .from("analytics_saved_views")
    .select("config")
    .eq("funnel_id", funnelId)
    .eq("is_default", true)
    .maybeSingle();
  if (!data) return null;
  const cfg: any = (data as any).config || {};
  if (!cfg.period) return null;
  return {
    period: { start: new Date(cfg.period.start), end: new Date(cfg.period.end), label: cfg.period.label },
    granularity: cfg.granularity || "day",
    selectedMetrics: cfg.selectedMetrics ?? null,
    selectedKPIs: cfg.selectedKPIs ?? null,
  };
};

export default AnalyticsSavedViews;
