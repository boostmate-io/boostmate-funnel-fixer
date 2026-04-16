import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Puzzle, icons, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ICON_OPTIONS = [
  "Gem", "Star", "AlertTriangle", "Lightbulb", "Package", "TrendingUp", "Award",
  "DollarSign", "Shield", "HelpCircle", "Zap", "Target", "Heart", "Eye", "Megaphone",
  "Users", "MessageSquare", "CheckCircle2", "Gift", "Flame", "Crown", "Rocket",
  "ThumbsUp", "Lock", "Unlock", "ArrowRight", "Sparkles", "FileText", "Globe",
  "BarChart3", "PieChart", "Layers", "Layout", "BookOpen", "Compass", "Flag",
  "Trophy", "Percent", "CircleDot", "Crosshair", "Puzzle", "Brain", "Cpu",
  "Handshake", "Scale", "Timer", "Calendar", "Mail", "Phone", "Video",
  "Camera", "Image", "Headphones", "Mic", "Play", "Volume2", "Radio",
  "Wifi", "Cloud", "Download", "Upload", "Share2", "Link", "Bookmark",
  "Tag", "Hash", "AtSign", "Search", "Filter", "SlidersHorizontal",
];

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const IconComp = (icons as any)[name];
  if (!IconComp) return <Gem className={className} />;
  return <IconComp className={className} />;
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = search
    ? ICON_OPTIONS.filter(name => name.toLowerCase().includes(search.toLowerCase()))
    : ICON_OPTIONS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0 border border-border">
          <LucideIcon name={value} className="w-4 h-4 text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="h-7 text-xs mb-2"
        />
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {filtered.map(name => (
            <button
              key={name}
              onClick={() => { onChange(name); setOpen(false); setSearch(""); }}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                value === name ? "bg-primary/20 text-primary" : "hover:bg-muted text-foreground"
              }`}
              title={name}
            >
              <LucideIcon name={name} className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface CopyComponent {
  id: string;
  name: string;
  slug: string;
  description: string;
  ai_action_slug: string;
  instructions: string;
  ui_interface_slug: string;
  icon: string;
  config: any;
  is_active: boolean;
  sort_order: number;
}

interface AIAction {
  slug: string;
  name: string;
}

const AdminCopyComponents = () => {
  const [components, setComponents] = useState<CopyComponent[]>([]);
  const [aiActions, setAIActions] = useState<AIAction[]>([]);
  const [editing, setEditing] = useState<Partial<CopyComponent> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("copy_components").select("*").order("sort_order"),
      supabase.from("ai_actions").select("slug, name").eq("is_active", true).order("name"),
    ]);
    if (c) setComponents(c as unknown as CopyComponent[]);
    if (a) setAIActions(a as unknown as AIAction[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const save = async () => {
    if (!editing?.name || !editing?.slug) {
      toast.error("Name and slug are required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: editing.name,
        slug: editing.slug,
        description: editing.description || "",
        ai_action_slug: editing.ai_action_slug || "",
        instructions: editing.instructions || "",
        ui_interface_slug: editing.ui_interface_slug || "generic_ui",
        icon: editing.icon || "Gem",
        config: editing.config || {},
        is_active: editing.is_active ?? true,
        sort_order: editing.sort_order ?? 0,
      };

      if (editing.id) {
        const { error } = await supabase.from("copy_components").update(payload as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Component updated");
      } else {
        const { error } = await supabase.from("copy_components").insert(payload as any);
        if (error) throw error;
        toast.success("Component created");
      }
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteComponent = async (id: string) => {
    if (!confirm("Delete this component?")) return;
    const { error } = await supabase.from("copy_components").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">Copy Components</h2>
        <Button onClick={() => setEditing({ name: "", slug: "", icon: "Gem", ui_interface_slug: "generic_ui", is_active: true, sort_order: components.length })} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Component
        </Button>
      </div>

      <div className="space-y-2">
        {components.map(comp => (
          <div key={comp.id} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <LucideIcon name={comp.icon || "Gem"} className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comp.name}</span>
                  <Badge variant="secondary" className="text-xs font-mono">{comp.ui_interface_slug}</Badge>
                  {!comp.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{comp.description.slice(0, 80)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing({ ...comp })}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteComponent(comp.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {components.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No Copy Components yet.</div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Copy Component</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Icon</Label>
                  <IconPicker value={editing.icon || "Gem"} onChange={icon => setEditing({ ...editing, icon })} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={editing.name || ""} onChange={e => {
                    const name = e.target.value;
                    setEditing({ ...editing, name, slug: editing.id ? editing.slug : generateSlug(name) });
                  }} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Slug</Label>
                  <Input value={editing.slug || ""} onChange={e => setEditing({ ...editing, slug: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Linked AI Action</Label>
                  <Select value={editing.ai_action_slug || ""} onValueChange={v => setEditing({ ...editing, ai_action_slug: v })}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select AI Action..." /></SelectTrigger>
                    <SelectContent>
                      {aiActions.map(a => <SelectItem key={a.slug} value={a.slug} className="text-xs">{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UI Interface Slug</Label>
                  <Input value={editing.ui_interface_slug || "generic_ui"} onChange={e => setEditing({ ...editing, ui_interface_slug: e.target.value })} className="font-mono text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Component Instructions</Label>
                <p className="text-xs text-muted-foreground">Additional prompt guidance on top of the AI Action</p>
                <Textarea
                  value={editing.instructions || ""}
                  onChange={e => setEditing({ ...editing, instructions: e.target.value })}
                  className="min-h-[120px] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sort Order</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} className="text-xs" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                  <Label className="text-xs">Active</Label>
                </div>
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

export default AdminCopyComponents;
