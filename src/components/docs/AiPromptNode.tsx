import { useState } from "react";
import { Node, mergeAttributes, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Sparkles, Trash2 } from "lucide-react";

const PromptNodeView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const attrs = node.attrs as { title: string; prompt: string };

  const openEdit = () => { setTitle(attrs.title); setPrompt(attrs.prompt); setOpen(true); };

  return (
    <NodeViewWrapper contentEditable={false} data-drag-handle="" className="my-4">
      <div className={`rounded-xl border bg-primary/5 p-3 flex items-start gap-3 ${selected ? "border-primary ring-2 ring-primary/30" : "border-primary/25"}`}>
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">AI Prompt</p>
          <p className="font-semibold text-foreground truncate">{attrs.title || "Untitled prompt"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{attrs.prompt || "No prompt text yet — click Edit."}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={openEdit}><Pencil className="w-3.5 h-3.5" />Edit</Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove prompt" onClick={deleteNode}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit AI Prompt</DialogTitle>
            <DialogDescription>Readers see only the title with Copy and View buttons. The full text is copied exactly as written.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="space-y-1.5">
              <Label htmlFor="prompt-title">Title</Label>
              <Input id="prompt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Define the Transformation" />
            </div>
            <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
              <Label htmlFor="prompt-body">Prompt content</Label>
              <Textarea id="prompt-body" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="flex-1 min-h-[300px] font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { updateAttributes({ title: title.trim(), prompt }); setOpen(false); }}>Save prompt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  );
};

export const AiPromptNode = Node.create({
  name: "aiPrompt",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      title: { default: "", parseHTML: (el) => el.getAttribute("data-title") ?? "", renderHTML: (a) => ({ "data-title": a.title }) },
      prompt: { default: "", parseHTML: (el) => el.getAttribute("data-prompt") ?? "", renderHTML: (a) => ({ "data-prompt": a.prompt }) },
    };
  },
  parseHTML() { return [{ tag: "div[data-ai-prompt]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-ai-prompt": "" })]; },
  addNodeView() { return ReactNodeViewRenderer(PromptNodeView); },
});
