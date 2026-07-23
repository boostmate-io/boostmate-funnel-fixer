import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Channel {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminAcquisitionChannels = () => {
  const [rows, setRows] = useState<Channel[]>([]);
  const [editing, setEditing] = useState<Partial<Channel> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("acquisition_channels")
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
      category: editing.category ?? null,
      icon: editing.icon ?? null,
      sort_order: editing.sort_order ?? 100,
      is_active: editing.is_active ?? true,
    };
    const q = editing.id
      ? supabase.from("acquisition_channels").update(payload).eq("id", editing.id)
      : supabase.from("acquisition_channels").insert(payload);
    const { error } = await q;
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this channel?")) return;
    const { error } = await supabase.from("acquisition_channels").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold flex items-center gap-2">
          <Radio className="w-4 h-4" /> Acquisition Channels
        </h2>
        <Button size="sm" onClick={() => setEditing({ is_active: true, sort_order: rows.length * 10 })}>
          <Plus className="w-4 h-4 mr-1" /> New Channel
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{r.label}</span>
                <Badge variant="secondary" className="text-[10px]">{r.key}</Badge>
                {r.category && <Badge variant="outline" className="text-[10px]">{r.category}</Badge>}
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
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Channel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Key</Label><Input value={editing?.key ?? ""} onChange={(e) => setEditing({ ...editing!, key: e.target.value })} placeholder="paid_meta" /></div>
            <div><Label>Label</Label><Input value={editing?.label ?? ""} onChange={(e) => setEditing({ ...editing!, label: e.target.value })} placeholder="Paid Meta Ads" /></div>
            <div><Label>Category</Label><Input value={editing?.category ?? ""} onChange={(e) => setEditing({ ...editing!, category: e.target.value })} placeholder="Paid / Organic / Outbound / Partnership" /></div>
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

export default AdminAcquisitionChannels;
