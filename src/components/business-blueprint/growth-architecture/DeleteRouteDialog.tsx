// =============================================================================
// DeleteRouteDialog — confirms removal of a growth route and optionally the
// linked funnel. Both actions run through the delete-growth-route edge function.
// =============================================================================

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string | null;
  routeLabel: string;
  hasFunnel: boolean;
  onDeleted?: () => void;
}

const DeleteRouteDialog = ({ open, onOpenChange, routeId, routeLabel, hasFunnel, onDeleted }: Props) => {
  const [alsoDeleteFunnel, setAlsoDeleteFunnel] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!routeId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-growth-route", {
        body: { route_id: routeId, delete_funnel: hasFunnel && alsoDeleteFunnel },
      });
      if (error) throw error;
      toast.success((data as any)?.deleted_funnel ? "Route and funnel deleted." : "Route deleted.");
      onDeleted?.();
      onOpenChange(false);
      setAlsoDeleteFunnel(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete route");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Delete growth route?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to delete: <strong className="text-foreground">{routeLabel}</strong>.
                Attached channels are removed automatically.
              </p>
              {hasFunnel && (
                <div className="flex items-start gap-2 rounded-md border border-border p-3 bg-muted/30">
                  <Checkbox
                    id="delete-funnel"
                    checked={alsoDeleteFunnel}
                    onCheckedChange={(v) => setAlsoDeleteFunnel(!!v)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="delete-funnel" className="text-sm cursor-pointer">
                    Also delete the linked funnel
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      All funnel steps, analytics, and build guide progress will be permanently removed.
                    </span>
                  </Label>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteRouteDialog;
