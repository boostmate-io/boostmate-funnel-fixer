import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InstructionBlock {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const AdminInstructionBlocks = () => {
  const [blocks, setBlocks] = useState<InstructionBlock[]>([]);
  const [editing, setEditing] = useState<Partial<InstructionBlock> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ai_instruction_blocks")
      .select("*")
      .order("name");
    if (data) setBlocks(data as unknown as InstructionBlock[]);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">Instruction Blocks</h2>
        <Button onClick={() => setEditing({ name: "", content: "" })} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Block
        </Button>
      </div>

      <div className="space-y-2">
        {blocks.map(block => (
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
        {blocks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No Instruction Blocks yet. Create your first one.
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
