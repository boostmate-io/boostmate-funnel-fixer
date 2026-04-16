import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CopyFramework {
  id: string;
  name: string;
  description: string;
  component_slugs: string[];
  type: string;
  is_active: boolean;
}

interface ComponentOption {
  slug: string;
  name: string;
}

const DOCUMENT_TYPES = [
  { value: "sales_copy", label: "Sales Copy" },
  { value: "email_sequence", label: "Email Sequence" },
  { value: "vsl_script", label: "VSL Script" },
  { value: "ad_creative", label: "Ad Creative" },
];

const AdminCopyFrameworks = () => {
  const [frameworks, setFrameworks] = useState<CopyFramework[]>([]);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [editing, setEditing] = useState<Partial<CopyFramework> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [{ data: f }, { data: c }] = await Promise.all([
      supabase.from("copy_frameworks").select("*").order("name"),
      supabase.from("copy_components").select("slug, name").eq("is_active", true).order("sort_order"),
    ]);
    if (f) setFrameworks(f as unknown as CopyFramework[]);
    if (c) setComponents(c as unknown as ComponentOption[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.name) { toast.error("Name is required"); return; }
    setLoading(true);
    try {
      const payload = {
        name: editing.name,
        description: editing.description || "",
        component_slugs: (editing.component_slugs || []) as any,
        type: editing.type || "sales_copy",
        is_active: editing.is_active ?? true,
      };
      if (editing.id) {
        const { error } = await supabase.from("copy_frameworks").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Framework updated");
      } else {
        const { error } = await supabase.from("copy_frameworks").insert(payload);
        if (error) throw error;
        toast.success("Framework created");
      }
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteFramework = async (id: string) => {
    if (!confirm("Delete this framework?")) return;
    const { error } = await supabase.from("copy_frameworks").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); load(); }
  };

  const slugs = (editing?.component_slugs || []) as string[];

  const addSlug = (slug: string) => {
    setEditing({ ...editing, component_slugs: [...slugs, slug] });
  };

  const removeSlug = (idx: number) => {
    const updated = [...slugs];
    updated.splice(idx, 1);
    setEditing({ ...editing, component_slugs: updated });
  };

  const moveSlug = (idx: number, dir: -1 | 1) => {
    const updated = [...slugs];
    const target = idx + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setEditing({ ...editing, component_slugs: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">Copy Frameworks</h2>
        <Button onClick={() => setEditing({ name: "", type: "sales_copy", component_slugs: [], is_active: true })} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Framework
        </Button>
      </div>

      <div className="space-y-2">
        {frameworks.map(fw => (
          <div key={fw.id} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <LayoutList className="w-4 h-4 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{fw.name}</span>
                  <Badge variant="secondary" className="text-xs">{fw.type}</Badge>
                  <Badge variant="outline" className="text-xs">{fw.component_slugs.length} components</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{fw.description.slice(0, 80)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing({ ...fw })}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteFramework(fw.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {frameworks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No Copy Frameworks yet.</div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Copy Framework</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={editing.type || "sales_copy"} onValueChange={v => setEditing({ ...editing, type: v })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="min-h-[60px] text-sm" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Components (ordered)</Label>
                {slugs.map((slug, idx) => {
                  const comp = components.find(c => c.slug === slug);
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
                      <span className="text-xs text-muted-foreground w-6 text-center">{idx + 1}</span>
                      <span className="text-xs font-medium flex-1">{comp?.name || slug}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSlug(idx, -1)} disabled={idx === 0}>↑</Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSlug(idx, 1)} disabled={idx === slugs.length - 1}>↓</Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSlug(idx)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                <Select onValueChange={addSlug}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Add component..." /></SelectTrigger>
                  <SelectContent>
                    {components.map(c => <SelectItem key={c.slug} value={c.slug} className="text-xs">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label className="text-xs">Active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCopyFrameworks;
