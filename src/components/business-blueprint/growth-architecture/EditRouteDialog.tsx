// =============================================================================
// EditRouteDialog — lightweight editor for a route's notes.
// Frontend-only wrapper around the existing update() mutation.
// =============================================================================

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string | null;
  routeLabel: string;
  initialNotes: string | null;
  onSave: (id: string, patch: { notes: string | null }) => Promise<unknown>;
}

const EditRouteDialog = ({ open, onOpenChange, routeId, routeLabel, initialNotes, onSave }: Props) => {
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setNotes(initialNotes ?? ""); }, [open, initialNotes]);

  const handleSave = async () => {
    if (!routeId) return;
    setSaving(true);
    try {
      await onSave(routeId, { notes: notes.trim() ? notes.trim() : null });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit route</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground truncate">{routeLabel}</div>
          <div className="space-y-1.5">
            <Label htmlFor="route-notes" className="text-xs">Notes</Label>
            <Textarea
              id="route-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this route…"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRouteDialog;
