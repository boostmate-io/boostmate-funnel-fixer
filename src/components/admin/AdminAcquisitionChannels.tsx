import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Radio, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

interface Channel {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

interface GuideRow { id: string; name: string; }
interface ChannelGuideRow { acquisition_channel_id: string; build_guide_id: string; }

const AdminAcquisitionChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [channelGuides, setChannelGuides] = useState<ChannelGuideRow[]>([]);
  const [editing, setEditing] = useState<Partial<Channel> | null>(null);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [chRes, catRes, gRes, cgRes] = await Promise.all([
      supabase.from("acquisition_channels").select("*").order("sort_order", { ascending: true }),
      supabase.from("acquisition_channel_categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("build_guides").select("id,name").eq("is_active", true).order("sort_order"),
      supabase.from("acquisition_channel_build_guides").select("acquisition_channel_id,build_guide_id"),
    ]);
    if (chRes.data) setChannels(chRes.data as any);
    if (catRes.data) setCategories(catRes.data as any);
    if (gRes.data) setGuides(gRes.data as any);
    if (cgRes.data) setChannelGuides(cgRes.data as any);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.key || !editing?.label) { toast.error("Key and label required"); return; }
    setLoading(true);
    const payload: any = {
      key: editing.key,
      label: editing.label,
      description: editing.description ?? null,
      category_id: editing.category_id ?? null,
      icon: editing.icon ?? null,
      color: editing.color ?? null,
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

  const saveCat = async () => {
    if (!editingCat?.key || !editingCat?.label) { toast.error("Key and label required"); return; }
    const payload: any = {
      key: editingCat.key,
      label: editingCat.label,
      sort_order: editingCat.sort_order ?? 100,
      is_active: editingCat.is_active ?? true,
    };
    const q = editingCat.id
      ? supabase.from("acquisition_channel_categories").update(payload).eq("id", editingCat.id)
      : supabase.from("acquisition_channel_categories").insert(payload);
    const { error } = await q;
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setEditingCat(null); load(); }
  };

  const delCat = async (id: string) => {
    if (!confirm("Delete this category? Channels using it will be unlinked.")) return;
    const { error } = await supabase.from("acquisition_channel_categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const catLabel = (id: string | null) => categories.find((c) => c.id === id)?.label ?? "—";

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <FolderTree className="w-4 h-4" /> Channel Categories
          </h2>
          <Button size="sm" variant="outline" onClick={() => setEditingCat({ is_active: true, sort_order: categories.length * 10 })}>
            <Plus className="w-4 h-4 mr-1" /> New Category
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm">
              <span className="font-medium">{c.label}</span>
              <Badge variant="secondary" className="text-[10px]">{c.key}</Badge>
              {!c.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
              <button onClick={() => setEditingCat(c)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => delCat(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Radio className="w-4 h-4" /> Acquisition Channels
          </h2>
          <Button size="sm" onClick={() => setEditing({ is_active: true, sort_order: channels.length * 10 })}>
            <Plus className="w-4 h-4 mr-1" /> New Channel
          </Button>
        </div>
        <div className="space-y-2">
          {channels.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              {r.color && <div className="w-4 h-4 rounded-full shrink-0" style={{ background: r.color }} />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{r.label}</span>
                  <Badge variant="secondary" className="text-[10px]">{r.key}</Badge>
                  <Badge variant="outline" className="text-[10px]">{catLabel(r.category_id)}</Badge>
                  {r.icon && <Badge variant="outline" className="text-[10px]">icon: {r.icon}</Badge>}
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
      </div>

      {/* Channel dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Channel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Key</Label><Input value={editing?.key ?? ""} onChange={(e) => setEditing({ ...editing!, key: e.target.value })} placeholder="meta-ads" /></div>
              <div><Label>Label</Label><Input value={editing?.label ?? ""} onChange={(e) => setEditing({ ...editing!, label: e.target.value })} placeholder="Meta Ads" /></div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editing?.category_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, category_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Uncategorised" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorised</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Icon (lucide name)</Label><Input value={editing?.icon ?? ""} onChange={(e) => setEditing({ ...editing!, icon: e.target.value })} placeholder="Facebook" /></div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 items-center">
                  <Input type="color" value={editing?.color ?? "#6246ff"} onChange={(e) => setEditing({ ...editing!, color: e.target.value })} className="w-14 h-9 p-1" />
                  <Input value={editing?.color ?? ""} onChange={(e) => setEditing({ ...editing!, color: e.target.value })} placeholder="#0866FF" />
                </div>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort order</Label><Input type="number" value={editing?.sort_order ?? 0} onChange={(e) => setEditing({ ...editing!, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-3"><Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })} /><Label>Active</Label></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={loading}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={!!editingCat} onOpenChange={(o) => !o && setEditingCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat?.id ? "Edit" : "New"} Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Key</Label><Input value={editingCat?.key ?? ""} onChange={(e) => setEditingCat({ ...editingCat!, key: e.target.value })} placeholder="paid" /></div>
            <div><Label>Label</Label><Input value={editingCat?.label ?? ""} onChange={(e) => setEditingCat({ ...editingCat!, label: e.target.value })} placeholder="Paid Traffic" /></div>
            <div><Label>Sort order</Label><Input type="number" value={editingCat?.sort_order ?? 0} onChange={(e) => setEditingCat({ ...editingCat!, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-3"><Switch checked={editingCat?.is_active ?? true} onCheckedChange={(v) => setEditingCat({ ...editingCat!, is_active: v })} /><Label>Active</Label></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingCat(null)}>Cancel</Button>
              <Button onClick={saveCat}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAcquisitionChannels;
