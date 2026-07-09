import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Copy, Share2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { AnalyticsViewConfig } from "./AnalyticsModule";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId: string;
  funnelName: string;
  shareToken: string | null;
  onShareTokenChange: (token: string | null) => void;
  config: AnalyticsViewConfig;
  activeViewId: string | null;
  activeViewName: string | null;
}

// Kept exported for backward compatibility with any imports; no longer used by SharedAnalytics
export function decodeAnalyticsConfig(_search: string): Partial<AnalyticsViewConfig> {
  return {};
}

const AnalyticsShareDialog = ({
  open, onOpenChange, funnelId, funnelName, shareToken, onShareTokenChange,
  activeViewId, activeViewName,
}: Props) => {
  const [generating, setGenerating] = useState(false);
  const [sharedViewId, setSharedViewId] = useState<string | null>(null);
  const [sharedViewName, setSharedViewName] = useState<string | null>(null);

  const loadShared = useCallback(async () => {
    if (!funnelId) return;
    const { data } = await supabase
      .from("funnels")
      .select("shared_view_id")
      .eq("id", funnelId)
      .maybeSingle();
    const svId = (data as any)?.shared_view_id ?? null;
    setSharedViewId(svId);
    if (svId) {
      const { data: v } = await supabase
        .from("analytics_saved_views")
        .select("name")
        .eq("id", svId)
        .maybeSingle();
      setSharedViewName((v as any)?.name ?? null);
    } else {
      setSharedViewName(null);
    }
  }, [funnelId]);

  useEffect(() => { if (open) loadShared(); }, [open, loadShared]);

  const generateLink = useCallback(async () => {
    if (!funnelId || !activeViewId) return;
    setGenerating(true);
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await supabase
      .from("funnels")
      .update({ share_token: token, shared_view_id: activeViewId } as any)
      .eq("id", funnelId);
    if (error) toast.error("Error creating share link");
    else {
      onShareTokenChange(token);
      setSharedViewId(activeViewId);
      setSharedViewName(activeViewName);
      toast.success("Share link created");
    }
    setGenerating(false);
  }, [funnelId, activeViewId, activeViewName, onShareTokenChange]);

  const updateSharedView = useCallback(async () => {
    if (!funnelId || !activeViewId) return;
    const { error } = await supabase
      .from("funnels")
      .update({ shared_view_id: activeViewId } as any)
      .eq("id", funnelId);
    if (error) toast.error("Error updating shared view");
    else {
      setSharedViewId(activeViewId);
      setSharedViewName(activeViewName);
      toast.success("Shared view updated");
    }
  }, [funnelId, activeViewId, activeViewName]);

  const removeLink = useCallback(async () => {
    if (!funnelId) return;
    const { error } = await supabase
      .from("funnels")
      .update({ share_token: null, shared_view_id: null } as any)
      .eq("id", funnelId);
    if (error) toast.error("Error removing share link");
    else {
      onShareTokenChange(null);
      setSharedViewId(null);
      setSharedViewName(null);
      toast.success("Share link removed");
    }
  }, [funnelId, onShareTokenChange]);

  const shareUrl = useMemo(() => {
    if (!shareToken) return null;
    return `${window.location.origin}/analytics/${shareToken}`;
  }, [shareToken]);

  const canShare = !!activeViewId;
  const mismatched = shareUrl && activeViewId && sharedViewId && activeViewId !== sharedViewId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Share Analytics</DialogTitle>
          <DialogDescription>
            Share a read-only analytics view for "{funnelName}". The link mirrors a saved view — any changes you save to that view are reflected live in the shared page.
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

              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Shared view:</span>{" "}
                  {sharedViewName ?? <em>none</em>}
                </div>
                {activeViewId && (
                  <div>
                    <span className="font-semibold text-foreground">Active view:</span> {activeViewName}
                  </div>
                )}
              </div>

              {mismatched && (
                <Button variant="secondary" size="sm" className="w-full h-8 text-xs" onClick={updateSharedView}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Set shared view to "{activeViewName}"
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground">
                Save changes to the shared view to update what viewers see. The shared page stays in sync automatically.
              </p>
              <Button variant="destructive" size="sm" className="w-full h-8 text-xs" onClick={removeLink}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove Share Link
              </Button>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              {canShare ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Share the currently active view <span className="font-semibold text-foreground">"{activeViewName}"</span>.
                  </p>
                  <Button onClick={generateLink} disabled={generating} className="h-9">
                    <Share2 className="w-4 h-4 mr-1.5" />
                    {generating ? "Generating..." : "Generate Share Link"}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save the current configuration as a view first, then activate it to share it.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalyticsShareDialog;
