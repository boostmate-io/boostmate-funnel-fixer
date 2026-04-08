import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Plus, Search, Trash2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Funnel {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  is_template: boolean;
  created_at: string;
  updated_at: string;
  share_token?: string | null;
}

interface FunnelListProps {
  onOpenFunnel: (funnel: Funnel) => void;
  onCreateNew: () => void;
}

const FunnelList = ({ onOpenFunnel, onCreateNew }: FunnelListProps) => {
  const { user } = useAuth();
  const { activeSubAccountId } = useWorkspace();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFunnels = useCallback(async () => {
    if (!user?.id || !activeSubAccountId) {
      setFunnels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("funnels")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .eq("is_template", false)
      .order("updated_at", { ascending: false });
    if (data) setFunnels(data as unknown as Funnel[]);
    else setFunnels([]);
    setLoading(false);
  }, [user?.id, activeSubAccountId]);

  useEffect(() => { loadFunnels(); }, [loadFunnels]);

  const deleteFunnel = useCallback(async (id: string) => {
    const { error } = await supabase.from("funnels").delete().eq("id", id);
    if (error) toast.error("Error deleting funnel");
    else { toast.success("Funnel deleted"); loadFunnels(); }
    setDeletingId(null);
  }, [loadFunnels]);

  const filtered = funnels.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Funnels</h1>
          <p className="text-sm text-muted-foreground mt-1">Design and manage your marketing funnels.</p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="w-4 h-4" /> New Funnel
        </Button>
      </div>

      <div className="px-8 py-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search funnels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-foreground mb-1">
                {search ? "No funnels found" : "No funnels yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {search ? "Try a different search term." : "Create your first funnel to get started."}
              </p>
            </div>
            {!search && (
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="w-4 h-4" /> Create First Funnel
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((funnel) => (
              <div
                key={funnel.id}
                className="group bg-card border border-border rounded-xl p-5 hover:shadow-card-hover transition-all cursor-pointer"
                onClick={() => onOpenFunnel(funnel)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-bold text-foreground text-sm leading-tight line-clamp-2 flex-1 mr-2">
                    {funnel.name}
                  </h3>
                </div>

                <div className="mb-3">
                  <span className="text-[10px] text-muted-foreground">
                    {(funnel.nodes || []).length} elements · {(funnel.edges || []).length} connections
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Updated {new Date(funnel.updated_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(funnel.id); }}
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
            <AlertDialogTitle>Delete funnel?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this funnel.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteFunnel(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FunnelList;
