// =============================================================================
// BlueprintShareDialog — generate/copy/revoke a public read-only share link
// for a Business Blueprint, mirroring FunnelShareDialog's UX.
// =============================================================================

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Copy, Share2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blueprintId: string | null;
  shareToken: string | null;
  onShareTokenChange: (token: string | null) => void;
}

const newToken = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

const BlueprintShareDialog = ({
  open,
  onOpenChange,
  blueprintId,
  shareToken,
  onShareTokenChange,
}: Props) => {
  const [busy, setBusy] = useState(false);

  const setToken = useCallback(
    async (token: string | null) => {
      if (!blueprintId) return;
      setBusy(true);
      const { error } = await supabase
        .from("business_blueprints")
        .update({ share_token: token } as any)
        .eq("id", blueprintId);
      setBusy(false);
      if (error) {
        toast.error("Could not update share link");
        return;
      }
      onShareTokenChange(token);
      toast.success(token ? "Share link ready" : "Share link removed");
    },
    [blueprintId, onShareTokenChange],
  );

  const shareUrl = shareToken
    ? `${window.location.origin}/blueprint/${shareToken}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Share Blueprint</DialogTitle>
          <DialogDescription>
            Share a read-only strategic document of your Business Blueprint.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {shareUrl ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Share Link</label>
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-border">
                  <Link2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground flex-1 font-mono break-all">
                    {shareUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success("Link copied to clipboard");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Anyone with this link can view your blueprint as a read-only strategic document. They cannot edit anything.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setToken(newToken())}
                  disabled={busy}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setToken(null)}
                  disabled={busy}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                No share link exists yet for this blueprint.
              </p>
              <Button
                onClick={() => setToken(newToken())}
                disabled={busy || !blueprintId}
                className="h-9"
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                {busy ? "Generating..." : "Generate Share Link"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintShareDialog;
