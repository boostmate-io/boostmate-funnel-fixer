import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Plus, Search, Trash2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, PAGE_CONTAINER } from "@/components/layout/PageLayout";

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
  status?: string;
  created_at: string;
  updated_at: string;
  share_token?: string | null;
}

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  building: { label: "Building", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10" },
  live:     { label: "Live",     dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10" },
  paused:   { label: "Paused",   dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
  archived: { label: "Archived", dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
};

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
      <PageHeader
        title="Funnels"
        subtitle="Design and manage your marketing funnels."
        actions={
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="w-4 h-4" /> New Funnel
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className={`${PAGE_CONTAINER} py-8 space-y-6`}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search funnels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

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
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h3 className="font-display font-bold text-foreground text-sm leading-tight line-clamp-2 flex-1">
                    {funnel.name}
                  </h3>
                  {(() => {
                    const s = STATUS_STYLES[funnel.status ?? "building"] ?? STATUS_STYLES.building;
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium shrink-0 ${s.bg} ${s.text}`}>
                        <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    );
                  })()}
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
