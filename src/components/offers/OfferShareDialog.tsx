import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Copy, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface OfferShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  offerName: string;
  shareToken: string | null;
  onShareTokenChange: (token: string | null) => void;
}

const OfferShareDialog = ({
  open,
  onOpenChange,
  offerId,
  offerName,
  shareToken,
  onShareTokenChange,
}: OfferShareDialogProps) => {
  const [generating, setGenerating] = useState(false);

  const generateLink = useCallback(async () => {
    setGenerating(true);
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await supabase
      .from("offers")
      .update({ share_token: token } as any)
      .eq("id", offerId);
    if (error) toast.error("Error creating share link");
    else {
      onShareTokenChange(token);
      toast.success("Share link created");
    }
    setGenerating(false);
  }, [offerId, onShareTokenChange]);

  const removeLink = useCallback(async () => {
    const { error } = await supabase
      .from("offers")
      .update({ share_token: null } as any)
      .eq("id", offerId);
    if (error) toast.error("Error removing share link");
    else {
      onShareTokenChange(null);
      toast.success("Share link removed");
    }
  }, [offerId, onShareTokenChange]);

  const shareUrl = shareToken
    ? `${window.location.origin}/offer/${shareToken}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>Share Offer</DialogTitle>
          <DialogDescription>
            Share a link for "{offerName}" with clients or stakeholders.
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
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0"
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
                Anyone with this link can view the offer. If the offer is not yet approved, they can also edit it.
              </p>

              <Button variant="destructive" size="sm" className="w-full h-8 text-xs" onClick={removeLink}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove Share Link
              </Button>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                No share link exists yet for this offer.
              </p>
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

export default OfferShareDialog;
