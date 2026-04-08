import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Plus, Search, Copy, Trash2, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Offer, OfferStatus, STATUS_LABELS, STATUS_COLORS } from "./offerFramework";

interface OfferListProps {
  onEditOffer: (offerId: string) => void;
}

const OfferList = ({ onEditOffer }: OfferListProps) => {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    if (!user?.id || !activeSubAccountId) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .order("updated_at", { ascending: false });
    if (data) setOffers(data as unknown as Offer[]);
    else setOffers([]);
    setLoading(false);
  }, [user?.id, activeSubAccountId]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const createOffer = useCallback(async () => {
    if (!user?.id || !activeSubAccountId) return;
    const { data, error } = await supabase
      .from("offers")
      .insert({ user_id: user.id, sub_account_id: activeSubAccountId, name: "Untitled Offer" })
      .select()
      .single();
    if (error) toast.error("Error creating offer");
    else {
      toast.success("Offer created");
      onEditOffer((data as any).id);
    }
  }, [user?.id, activeSubAccountId, onEditOffer]);

  const duplicateOffer = useCallback(async (offer: Offer) => {
    if (!user?.id || !activeSubAccountId) return;
    const { data, error } = await supabase
      .from("offers")
      .insert({
        user_id: user.id,
        sub_account_id: activeSubAccountId,
        name: `${offer.name} (copy)`,
        data: offer.data as any,
        status: "draft",
        completion: offer.completion,
      })
      .select()
      .single();
    if (error) toast.error("Error duplicating offer");
    else { toast.success("Offer duplicated"); loadOffers(); }
  }, [user?.id, activeSubAccountId, loadOffers]);

  const deleteOffer = useCallback(async (id: string) => {
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) toast.error("Error deleting offer");
    else { toast.success("Offer deleted"); loadOffers(); }
    setDeletingId(null);
  }, [loadOffers]);

  const filtered = offers.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Offers</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage strategic offers for your funnels.</p>
        </div>
        <Button onClick={createOffer} className="gap-2">
          <Plus className="w-4 h-4" /> New Offer
        </Button>
      </div>

      {/* Search */}
      <div className="px-8 py-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Gem className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-foreground mb-1">
                {search ? "No offers found" : "No offers yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search ? "Try a different search term." : "Create your first offer to get started."}
              </p>
            </div>
            {!search && (
              <Button onClick={createOffer} className="gap-2">
                <Plus className="w-4 h-4" /> Create First Offer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((offer) => (
              <div
                key={offer.id}
                className="group bg-card border border-border rounded-xl p-5 hover:shadow-card-hover transition-all cursor-pointer"
                onClick={() => onEditOffer(offer.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-bold text-foreground text-sm leading-tight line-clamp-2 flex-1 mr-2">
                    {offer.name}
                  </h3>
                  <Badge variant="secondary" className={`text-[10px] shrink-0 ${STATUS_COLORS[offer.status as OfferStatus]}`}>
                    {STATUS_LABELS[offer.status as OfferStatus] || offer.status}
                  </Badge>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Completion</span>
                    <span className="text-[10px] font-medium text-foreground">{offer.completion}%</span>
                  </div>
                  <Progress value={offer.completion} className="h-1.5" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Updated {new Date(offer.updated_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); duplicateOffer(offer); }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(offer.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this offer and unlink it from any funnels.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteOffer(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OfferList;
