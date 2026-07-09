import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Copy, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import type { AnalyticsViewConfig } from "./AnalyticsModule";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId: string;
  funnelName: string;
  shareToken: string | null;
  onShareTokenChange: (token: string | null) => void;
  config: AnalyticsViewConfig;
}

export function encodeAnalyticsConfig(config: AnalyticsViewConfig): string {
  const params = new URLSearchParams();
  params.set("p", config.period.label || "last30");
  params.set("s", format(config.period.start, "yyyy-MM-dd"));
  params.set("e", format(config.period.end, "yyyy-MM-dd"));
  params.set("g", config.granularity);
  if (config.selectedMetrics && config.selectedMetrics.length) {
    params.set("m", config.selectedMetrics.join(","));
  }
  if (config.selectedKPIs && config.selectedKPIs.length) {
    params.set("k", config.selectedKPIs.join(","));
  }
  return params.toString();
}

export function decodeAnalyticsConfig(search: string): Partial<AnalyticsViewConfig> {
  const params = new URLSearchParams(search);
  const out: Partial<AnalyticsViewConfig> = {};
  const p = params.get("p");
  const s = params.get("s");
  const e = params.get("e");
  if (p && s && e) {
    const sd = new Date(s), ed = new Date(e);
    if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
      out.period = { start: sd, end: ed, label: p };
    }
  }
  const g = params.get("g");
  if (g === "day" || g === "week" || g === "month" || g === "quarter") out.granularity = g;
  const m = params.get("m");
  if (m !== null) out.selectedMetrics = m ? m.split(",").filter(Boolean) : [];
  const k = params.get("k");
  if (k !== null) out.selectedKPIs = k ? k.split(",").filter(Boolean) : [];
  return out;
}

const AnalyticsShareDialog = ({
  open, onOpenChange, funnelId, funnelName, shareToken, onShareTokenChange, config,
}: Props) => {
  const [generating, setGenerating] = useState(false);

  const generateLink = useCallback(async () => {
    if (!funnelId) return;
    setGenerating(true);
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await supabase.from("funnels").update({ share_token: token } as any).eq("id", funnelId);
    if (error) toast.error("Error creating share link");
    else { onShareTokenChange(token); toast.success("Share link created"); }
    setGenerating(false);
  }, [funnelId, onShareTokenChange]);

  const removeLink = useCallback(async () => {
    if (!funnelId) return;
    const { error } = await supabase.from("funnels").update({ share_token: null } as any).eq("id", funnelId);
    if (error) toast.error("Error removing share link");
    else { onShareTokenChange(null); toast.success("Share link removed"); }
  }, [funnelId, onShareTokenChange]);

  const shareUrl = useMemo(() => {
    if (!shareToken) return null;
    const qs = encodeAnalyticsConfig(config);
    return `${window.location.origin}/analytics/${shareToken}?${qs}`;
  }, [shareToken, config]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Share Analytics</DialogTitle>
          <DialogDescription>
            Share a read-only analytics view for "{funnelName}". The current period, granularity, and selected metrics are saved into the link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {shareUrl ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Share Link</label>
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
                  <Link2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground flex-1 font-mono break-all">{shareUrl}</span>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied to clipboard"); }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Viewers can browse and adjust the analytics view, but cannot add or edit data entries.
              </p>
              <Button variant="destructive" size="sm" className="w-full h-8 text-xs" onClick={removeLink}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove Share Link
              </Button>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">No share link exists yet for this funnel.</p>
              <Button onClick={generateLink} disabled={generating} className="h-9">
                <Share2 className="w-4 h-4 mr-1.5" />
                {generating ? "Generating..." : "Generate Share Link"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalyticsShareDialog;
