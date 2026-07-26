import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InstructionBlock {
  id: string;
  name: string;
  content: string;
  blueprint_scopes: string[] | null;
  created_at: string;
  updated_at: string;
}

/** Business Blueprint scopes a knowledge block can be assigned to. A block with
 *  no scopes stays global (loaded in every Coach context). */
const BLUEPRINT_SCOPES: { value: string; label: string }[] = [
  { value: "global", label: "Business Blueprint (global)" },
  { value: "customer_clarity", label: "Customer Clarity" },
  { value: "offer_design", label: "Offer Design" },
  { value: "brand_strategy", label: "Brand Strategy" },
  { value: "proof_authority", label: "Authority & Content" },
  { value: "offer_tier:free", label: "Offer tier — Free" },
  { value: "offer_tier:low_mid", label: "Offer tier — Low / Mid ticket" },
  { value: "offer_tier:high", label: "Offer tier — High ticket" },
];

interface AdminInstructionBlocksProps {
  filterActionId?: string | null;
  onFilterActionChange?: (actionId: string | null) => void;
}

const AdminInstructionBlocks = ({ filterActionId = null, onFilterActionChange }: AdminInstructionBlocksProps) => {
  const [blocks, setBlocks] = useState<InstructionBlock[]>([]);
  const [actions, setActions] = useState<{ id: string; name: string }[]>([]);
  const [links, setLinks] = useState<{ ai_action_id: string; instruction_block_id: string }[]>([]);
  const [editing, setEditing] = useState<Partial<InstructionBlock> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, { data: a }, { data: l }] = await Promise.all([
      supabase.from("ai_instruction_blocks").select("*").order("name"),
      supabase.from("ai_actions").select("id, name").order("name"),
      supabase.from("ai_action_instruction_blocks").select("ai_action_id, instruction_block_id"),
    ]);
    if (data) setBlocks(data as unknown as InstructionBlock[]);
    if (a) setActions(a as unknown as { id: string; name: string }[]);
    if (l) setLinks(l as unknown as { ai_action_id: string; instruction_block_id: string }[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing?.name) {
      toast.error("Name is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: editing.name,
        content: editing.content || "",
        blueprint_scopes: editing.blueprint_scopes ?? [],
      };
      if (editing.id) {
        const { error } = await supabase.from("ai_instruction_blocks").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Block updated");
      } else {
        const { error } = await supabase.from("ai_instruction_blocks").insert(payload);
        if (error) throw error;
        toast.success("Block created");
      }
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteBlock = async (id: string) => {
    if (!confirm("Delete this Instruction Block?")) return;
    const { error } = await supabase.from("ai_instruction_blocks").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); load(); }
  };

  const linkedIds = filterActionId
    ? links.filter(l => l.ai_action_id === filterActionId).map(l => l.instruction_block_id)
    : null;
  const visibleBlocks = linkedIds ? blocks.filter(b => linkedIds.includes(b.id)) : blocks;
  const activeActionName = actions.find(a => a.id === filterActionId)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">Instruction Blocks</h2>
        <Button onClick={() => setEditing({ name: "", content: "", blueprint_scopes: [] })} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Block
        </Button>
      </div>

      {onFilterActionChange && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">AI Action</Label>
          <Select
            value={filterActionId ?? "all"}
            onValueChange={v => onFilterActionChange(v === "all" ? null : v)}
          >
            <SelectTrigger className="text-xs h-8 w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All AI Actions</SelectItem>
              {actions.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterActionId && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => onFilterActionChange(null)}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear filter
            </Button>
          )}
          {filterActionId && (
            <span className="text-xs text-muted-foreground">
              Showing {visibleBlocks.length} block{visibleBlocks.length === 1 ? "" : "s"} linked to {activeActionName}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {visibleBlocks.map(block => (
          <div key={block.id} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <div>
                <span className="text-sm font-medium">{block.name}</span>
                <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                  {block.content.slice(0, 100)}{block.content.length > 100 ? "..." : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing({ ...block })}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteBlock(block.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {visibleBlocks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filterActionId
              ? "No Instruction Blocks linked to this AI Action."
              : "No Instruction Blocks yet. Create your first one."}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Instruction Block</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Content</Label>
                <p className="text-xs text-muted-foreground">Guidelines, frameworks, tone instructions, etc.</p>
                <Textarea
                  value={editing.content || ""}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  className="min-h-[250px] text-sm"
                />
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

export default AdminInstructionBlocks;
