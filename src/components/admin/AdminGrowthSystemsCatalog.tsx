import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface System {
  id: string;
  key: string;
  label: string;
  description: string | null;
  system_type: "acquisition" | "ascension" | "retention" | "referral" | "other";
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminGrowthSystemsCatalog = () => {
  const [rows, setRows] = useState<System[]>([]);
  const [editing, setEditing] = useState<Partial<System> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("growth_systems_catalog")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setRows(data as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.key || !editing?.label) { toast.error("Key and label required"); return; }
    setLoading(true);
    const payload: any = {
      key: editing.key,
      label: editing.label,
      description: editing.description ?? null,
      system_type: editing.system_type ?? "acquisition",
      icon: editing.icon ?? null,
      sort_order: editing.sort_order ?? 100,
      is_active: editing.is_active ?? true,
    };
    const q = editing.id
      ? supabase.from("growth_systems_catalog").update(payload).eq("id", editing.id)
      : supabase.from("growth_systems_catalog").insert(payload);
    const { error } = await q;
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this system?")) return;
    const { error } = await supabase.from("growth_systems_catalog").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold flex items-center gap-2">
          <Workflow className="w-4 h-4" /> Growth Systems Catalog
        </h2>
        <Button size="sm" onClick={() => setEditing({ is_active: true, sort_order: rows.length * 10, system_type: "acquisition" })}>
          <Plus className="w-4 h-4 mr-1" /> New System
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{r.label}</span>
                <Badge variant="secondary" className="text-[10px]">{r.key}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.system_type}</Badge>
                {!r.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
              </div>
              {r.description && <div className="text-xs text-muted-foreground mt-1">{r.description}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} System</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Key</Label><Input value={editing?.key ?? ""} onChange={(e) => setEditing({ ...editing!, key: e.target.value })} placeholder="paid_acquisition_funnel" /></div>
            <div><Label>Label</Label><Input value={editing?.label ?? ""} onChange={(e) => setEditing({ ...editing!, label: e.target.value })} placeholder="Paid Acquisition Funnel" /></div>
            <div>
              <Label>Type</Label>
              <Select value={editing?.system_type ?? "acquisition"} onValueChange={(v) => setEditing({ ...editing!, system_type: v as System["system_type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acquisition">Acquisition</SelectItem>
                  <SelectItem value="ascension">Ascension</SelectItem>
                  <SelectItem value="retention">Retention</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} rows={3} /></div>
            <div><Label>Sort order</Label><Input type="number" value={editing?.sort_order ?? 0} onChange={(e) => setEditing({ ...editing!, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-3"><Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })} /><Label>Active</Label></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={loading}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGrowthSystemsCatalog;
