import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, Zap, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InputField {
  key: string;
  type: "text" | "select" | "boolean";
  label: string;
  options?: string[];
  required?: boolean;
}

interface OutputField {
  key: string;
  label: string;
  type: "text" | "array";
}

interface AIAction {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  prompt_template: string;
  model_settings: { model: string; temperature: number };
  input_structure: InputField[];
  output_structure: OutputField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InstructionBlock {
  id: string;
  name: string;
}

interface ActionBlock {
  id: string;
  instruction_block_id: string;
  sort_order: number;
}

const ACTION_TYPES = ["generation", "transformation", "analysis", "classification"];
const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5",
];

const emptyAction: Omit<AIAction, "id" | "created_at" | "updated_at"> = {
  name: "",
  slug: "",
  description: "",
  type: "generation",
  prompt_template: "",
  model_settings: { model: "google/gemini-3-flash-preview", temperature: 0.7 },
  input_structure: [],
  output_structure: [],
  is_active: true,
};

const AdminAIActions = () => {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [blocks, setBlocks] = useState<InstructionBlock[]>([]);
  const [editing, setEditing] = useState<Partial<AIAction> | null>(null);
  const [linkedBlocks, setLinkedBlocks] = useState<ActionBlock[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("ai_actions").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_instruction_blocks").select("id, name").order("name"),
    ]);
    if (a) setActions(a as unknown as AIAction[]);
    if (b) setBlocks(b as unknown as InstructionBlock[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadLinkedBlocks = async (actionId: string) => {
    const { data } = await supabase
      .from("ai_action_instruction_blocks")
      .select("id, instruction_block_id, sort_order")
      .eq("ai_action_id", actionId)
      .order("sort_order");
    if (data) setLinkedBlocks(data as unknown as ActionBlock[]);
  };

  const openNew = () => {
    setEditing({ ...emptyAction });
    setLinkedBlocks([]);
  };

  const openEdit = async (action: AIAction) => {
    setEditing({ ...action });
    await loadLinkedBlocks(action.id);
  };

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
        type: editing.type || "generation",
        prompt_template: editing.prompt_template || "",
        model_settings: editing.model_settings || emptyAction.model_settings,
        input_structure: editing.input_structure || [],
        output_structure: editing.output_structure || [],
        is_active: editing.is_active ?? true,
      };

      if (editing.id) {
        const { error } = await supabase.from("ai_actions").update(payload).eq("id", editing.id);
        if (error) throw error;

        // Sync linked blocks
        await supabase.from("ai_action_instruction_blocks").delete().eq("ai_action_id", editing.id);
        if (linkedBlocks.length > 0) {
          await supabase.from("ai_action_instruction_blocks").insert(
            linkedBlocks.map((lb, i) => ({
              ai_action_id: editing.id!,
              instruction_block_id: lb.instruction_block_id,
              sort_order: i,
            }))
          );
        }
        toast.success("AI Action updated");
      } else {
        const { data, error } = await supabase.from("ai_actions").insert(payload).select("id").single();
        if (error) throw error;
        if (data && linkedBlocks.length > 0) {
          await supabase.from("ai_action_instruction_blocks").insert(
            linkedBlocks.map((lb, i) => ({
              ai_action_id: (data as any).id,
              instruction_block_id: lb.instruction_block_id,
              sort_order: i,
            }))
          );
        }
        toast.success("AI Action created");
      }
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteAction = async (id: string) => {
    if (!confirm("Delete this AI Action?")) return;
    const { error } = await supabase.from("ai_actions").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); load(); }
  };

  const addInputField = () => {
    const current = (editing?.input_structure as InputField[]) || [];
    setEditing({ ...editing, input_structure: [...current, { key: "", type: "text", label: "" }] });
  };

  const updateInputField = (idx: number, updates: Partial<InputField>) => {
    const current = [...((editing?.input_structure as InputField[]) || [])];
    current[idx] = { ...current[idx], ...updates };
    setEditing({ ...editing, input_structure: current });
  };

  const removeInputField = (idx: number) => {
    const current = [...((editing?.input_structure as InputField[]) || [])];
    current.splice(idx, 1);
    setEditing({ ...editing, input_structure: current });
  };

  const addOutputField = () => {
    const current = (editing?.output_structure as OutputField[]) || [];
    setEditing({ ...editing, output_structure: [...current, { key: "", label: "", type: "text" }] });
  };

  const updateOutputField = (idx: number, updates: Partial<OutputField>) => {
    const current = [...((editing?.output_structure as OutputField[]) || [])];
    current[idx] = { ...current[idx], ...updates };
    setEditing({ ...editing, output_structure: current });
  };

  const removeOutputField = (idx: number) => {
    const current = [...((editing?.output_structure as OutputField[]) || [])];
    current.splice(idx, 1);
    setEditing({ ...editing, output_structure: current });
  };

  const addLinkedBlock = (blockId: string) => {
    if (linkedBlocks.find(b => b.instruction_block_id === blockId)) return;
    setLinkedBlocks([...linkedBlocks, { id: crypto.randomUUID(), instruction_block_id: blockId, sort_order: linkedBlocks.length }]);
  };

  const removeLinkedBlock = (blockId: string) => {
    setLinkedBlocks(linkedBlocks.filter(b => b.instruction_block_id !== blockId));
  };

  const modelSettings = (editing?.model_settings || emptyAction.model_settings) as { model: string; temperature: number };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">AI Actions</h2>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> New Action</Button>
      </div>

      <div className="space-y-2">
        {actions.map(action => (
          <div key={action.id} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{action.name}</span>
                  <Badge variant="secondary" className="text-xs">{action.type}</Badge>
                  {!action.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{action.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(action)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteAction(action.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {actions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No AI Actions yet. Create your first one.
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} AI Action</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={editing.name || ""} onChange={e => {
                    const name = e.target.value;
                    setEditing({ ...editing, name, slug: editing.id ? editing.slug : generateSlug(name) });
                  }} />
                </div>
                <div className="space-y-1.5">
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
                  <Label className="text-xs">Type</Label>
                  <Select value={editing.type || "generation"} onValueChange={v => setEditing({ ...editing, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                  <Label className="text-xs">Active</Label>
                </div>
              </div>

              {/* Model settings */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Model Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <Select value={modelSettings.model} onValueChange={v => setEditing({ ...editing, model_settings: { ...modelSettings, model: v } })}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODELS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Temperature ({modelSettings.temperature})</Label>
                    <Input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={modelSettings.temperature}
                      onChange={e => setEditing({ ...editing, model_settings: { ...modelSettings, temperature: parseFloat(e.target.value) } })}
                    />
                  </div>
                </div>
              </div>

              {/* Prompt template */}
              <div className="space-y-1.5">
                <Label className="text-xs">Prompt Template</Label>
                <p className="text-xs text-muted-foreground">Use {"{{variable}}"} syntax for dynamic values</p>
                <Textarea
                  value={editing.prompt_template || ""}
                  onChange={e => setEditing({ ...editing, prompt_template: e.target.value })}
                  className="min-h-[150px] font-mono text-xs"
                />
              </div>

              {/* Input structure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Input Structure</Label>
                  <Button variant="outline" size="sm" onClick={addInputField} className="text-xs h-7">
                    <Plus className="w-3 h-3 mr-1" /> Add Field
                  </Button>
                </div>
                {((editing.input_structure as InputField[]) || []).map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
                    <Input
                      value={field.key}
                      onChange={e => updateInputField(idx, { key: e.target.value })}
                      placeholder="key"
                      className="text-xs h-8 font-mono flex-1"
                    />
                    <Input
                      value={field.label}
                      onChange={e => updateInputField(idx, { label: e.target.value })}
                      placeholder="Label"
                      className="text-xs h-8 flex-1"
                    />
                    <Select value={field.type} onValueChange={v => updateInputField(idx, { type: v as any })}>
                      <SelectTrigger className="text-xs h-8 w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.type === "select" && (
                      <Input
                        value={(field.options || []).join(", ")}
                        onChange={e => updateInputField(idx, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                        placeholder="option1, option2"
                        className="text-xs h-8 flex-1"
                      />
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeInputField(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Output structure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Output Structure</Label>
                  <Button variant="outline" size="sm" onClick={addOutputField} className="text-xs h-7">
                    <Plus className="w-3 h-3 mr-1" /> Add Field
                  </Button>
                </div>
                {((editing.output_structure as OutputField[]) || []).map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
                    <Input
                      value={field.key}
                      onChange={e => updateOutputField(idx, { key: e.target.value })}
                      placeholder="key"
                      className="text-xs h-8 font-mono flex-1"
                    />
                    <Input
                      value={field.label}
                      onChange={e => updateOutputField(idx, { label: e.target.value })}
                      placeholder="Label"
                      className="text-xs h-8 flex-1"
                    />
                    <Select value={field.type} onValueChange={v => updateOutputField(idx, { type: v as any })}>
                      <SelectTrigger className="text-xs h-8 w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="array">Array</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOutputField(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Instruction Blocks */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Linked Instruction Blocks</Label>
                {linkedBlocks.map(lb => {
                  const block = blocks.find(b => b.id === lb.instruction_block_id);
                  return (
                    <div key={lb.instruction_block_id} className="flex items-center justify-between p-2 border border-border rounded-md bg-muted/30">
                      <span className="text-xs">{block?.name || "Unknown"}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLinkedBlock(lb.instruction_block_id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                {blocks.filter(b => !linkedBlocks.find(lb => lb.instruction_block_id === b.id)).length > 0 && (
                  <Select onValueChange={addLinkedBlock}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Add instruction block..." /></SelectTrigger>
                    <SelectContent>
                      {blocks
                        .filter(b => !linkedBlocks.find(lb => lb.instruction_block_id === b.id))
                        .map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
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

export default AdminAIActions;
