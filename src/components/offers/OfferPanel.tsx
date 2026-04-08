import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { X, ExternalLink, Link2, Unlink, Plus, Gem, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Offer, STATUS_LABELS, STATUS_COLORS, OfferStatus } from "./offerFramework";

interface OfferPanelProps {
  funnelId: string | null;
  linkedOfferId: string | null;
  onLinkedOfferChange: (offerId: string | null) => void;
  onNavigateToOffer: (offerId: string) => void;
  onClose: () => void;
}

const OfferPanel = ({ funnelId, linkedOfferId, onLinkedOfferChange, onNavigateToOffer, onClose }: OfferPanelProps) => {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [linkedOffer, setLinkedOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  // Load available offers
  useEffect(() => {
    if (!user?.id || !activeSubAccountId) return;
    (async () => {
      const { data } = await supabase
        .from("offers")
        .select("*")
        .eq("sub_account_id", activeSubAccountId)
        .order("updated_at", { ascending: false });
      if (data) setOffers(data as unknown as Offer[]);
    })();
  }, [user?.id, activeSubAccountId]);

  // Load linked offer
  useEffect(() => {
    if (!linkedOfferId) { setLinkedOffer(null); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("offers")
        .select("*")
        .eq("id", linkedOfferId)
        .single();
      if (data) setLinkedOffer(data as unknown as Offer);
      else setLinkedOffer(null);
      setLoading(false);
    })();
  }, [linkedOfferId]);

  const linkOffer = useCallback(async (offerId: string) => {
    if (!funnelId) { toast.error("Save the funnel first"); return; }
    const { error } = await supabase
      .from("funnels")
      .update({ linked_offer_id: offerId } as any)
      .eq("id", funnelId);
    if (error) toast.error("Error linking offer");
    else {
      onLinkedOfferChange(offerId);
      toast.success("Offer linked to funnel");
    }
  }, [funnelId, onLinkedOfferChange]);

  const unlinkOffer = useCallback(async () => {
    if (!funnelId) return;
    const { error } = await supabase
      .from("funnels")
      .update({ linked_offer_id: null } as any)
      .eq("id", funnelId);
    if (error) toast.error("Error unlinking offer");
    else {
      onLinkedOfferChange(null);
      setLinkedOffer(null);
      toast.success("Offer unlinked");
    }
  }, [funnelId, onLinkedOfferChange]);

  const quickCreateOffer = useCallback(async () => {
    if (!user?.id || !activeSubAccountId || !funnelId) return;
    const { data, error } = await supabase
      .from("offers")
      .insert({ user_id: user.id, sub_account_id: activeSubAccountId, name: "Untitled Offer" })
      .select()
      .single();
    if (error) toast.error("Error creating offer");
    else {
      const newOffer = data as unknown as Offer;
      await linkOffer(newOffer.id);
      toast.success("New offer created and linked");
    }
  }, [user?.id, activeSubAccountId, funnelId, linkOffer]);

  if (!funnelId) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-bold text-foreground">Offer</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">Save your funnel first to link an offer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-bold text-foreground">Offer</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {linkedOffer ? (
          <>
            {/* Linked offer summary */}
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-display font-bold text-foreground leading-tight">{linkedOffer.name}</h4>
                <Badge variant="secondary" className={`text-[10px] shrink-0 ml-2 ${STATUS_COLORS[linkedOffer.status as OfferStatus]}`}>
                  {STATUS_LABELS[linkedOffer.status as OfferStatus]}
                </Badge>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Completion</span>
                  <span className="text-[10px] font-medium">{linkedOffer.completion}%</span>
                </div>
                <Progress value={linkedOffer.completion} className="h-1.5" />
              </div>

              <div className="flex items-center gap-1.5">
                {linkedOffer.status === "approved" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  {linkedOffer.status === "approved" ? "Approved" : "Not yet approved"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5"
                onClick={() => onNavigateToOffer(linkedOffer.id)}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Offer Module
              </Button>
              <Button
                variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                onClick={unlinkOffer}
              >
                <Unlink className="w-3.5 h-3.5" /> Unlink Offer
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">No offer linked to this funnel. Link an existing offer or create a new one.</p>

            {/* Select existing offer */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Link Existing Offer</label>
              <Select onValueChange={linkOffer}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select an offer..." />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>{o.name}</span>
                        <Badge variant="secondary" className={`text-[8px] ${STATUS_COLORS[o.status as OfferStatus]}`}>
                          {o.completion}%
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <span className="relative bg-card px-2 text-[10px] text-muted-foreground">or</span>
            </div>

            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={quickCreateOffer}>
              <Plus className="w-3.5 h-3.5" /> Create New Offer
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default OfferPanel;
