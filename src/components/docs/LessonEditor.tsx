import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bold, Italic, Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, Link as LinkIcon, Quote, Minus, Sparkles, FileDown, Undo2, Redo2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AiPromptNode } from "./AiPromptNode";
import { markdownToEditorHtml } from "@/lib/docs/markdown";
import type { DocNode } from "@/lib/docs/docContent";

const ToolBtn = ({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button type="button" size="icon" variant={active ? "secondary" : "ghost"} className="h-8 w-8" aria-label={label} aria-pressed={active} onClick={onClick}>
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const Toolbar = ({ editor, onImport }: { editor: Editor; onImport: () => void }) => {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    editor.on("transaction", f);
    return () => { editor.off("transaction", f); };
  }, [editor]);
  const c = () => editor.chain().focus();

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) { c().extendMarkRange("link").unsetLink().run(); return; }
    if (!/^(https?:|mailto:|\/|#)/i.test(url.trim())) { toast.error("Links must start with https://, mailto:, / or #"); return; }
    c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const insertPrompt = () => {
    c().insertContent({ type: "aiPrompt", attrs: { title: "New prompt", prompt: "" } }).run();
    toast.info("Prompt block added — click Edit on it to write the prompt.");
  };

  const selectionToPrompt = () => {
    const { from, to, empty } = editor.state.selection;
    if (empty) { toast.error("Select the text you want to turn into a prompt first."); return; }
    const text = editor.state.doc.textBetween(from, to, "\n\n", "\n");
    c().deleteSelection().insertContent({ type: "aiPrompt", attrs: { title: "AI Prompt", prompt: text } }).run();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-background/95 backdrop-blur px-2 py-1.5 rounded-t-lg">
      <ToolBtn label="Paragraph" active={editor.isActive("paragraph")} onClick={() => c().setParagraph().run()}><Pilcrow className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolBtn>
      <span className="w-px h-5 bg-border mx-1" />
      <ToolBtn label="Bold" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}><Bold className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Italic" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Link" active={editor.isActive("link")} onClick={setLink}><LinkIcon className="w-4 h-4" /></ToolBtn>
      <span className="w-px h-5 bg-border mx-1" />
      <ToolBtn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}><List className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Quote" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus className="w-4 h-4" /></ToolBtn>
      <span className="w-px h-5 bg-border mx-1" />
      <ToolBtn label="Undo" onClick={() => c().undo().run()}><Undo2 className="w-4 h-4" /></ToolBtn>
      <ToolBtn label="Redo" onClick={() => c().redo().run()}><Redo2 className="w-4 h-4" /></ToolBtn>
      <div className="ml-auto flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={selectionToPrompt}><Wand2 className="w-3.5 h-3.5" />Selection → Prompt</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={insertPrompt}><Sparkles className="w-3.5 h-3.5" />AI Prompt</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={onImport}><FileDown className="w-3.5 h-3.5" />Import Markdown</Button>
      </div>
    </div>
  );
};

interface Props {
  initialContent: DocNode;
  onChange: (doc: DocNode) => void;
}

const LessonEditor = ({ initialContent, onChange }: Props) => {
  const [importOpen, setImportOpen] = useState(false);
  const [md, setMd] = useState("");
  const [codeAsPrompt, setCodeAsPrompt] = useState(true);
  const [replace, setReplace] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
      }),
      Placeholder.configure({ placeholder: "Start writing, or use Import Markdown to paste a training document…" }),
      AiPromptNode,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "lesson-editor min-h-[480px] px-6 py-5 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as DocNode),
  });

  const runImport = () => {
    if (!editor || !md.trim()) return;
    const html = markdownToEditorHtml(md, codeAsPrompt);
    if (replace) editor.commands.setContent(html, { emitUpdate: true });
    else editor.chain().focus("end").insertContent(html).run();
    onChange(editor.getJSON() as DocNode);
    setImportOpen(false);
    setMd("");
    toast.success("Markdown imported — review it, then save.");
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMd(await f.text());
  };

  if (!editor) return null;

  return (
    <div className="rounded-lg border bg-card">
      <Toolbar editor={editor} onImport={() => setImportOpen(true)} />
      <EditorContent editor={editor} />
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Markdown</DialogTitle>
            <DialogDescription>Paste a Markdown document or choose a .md file. Headings, lists, bold, italic and links are kept.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 flex-1 min-h-0 flex flex-col">
            <div>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Choose file…</Button>
            </div>
            <Textarea value={md} onChange={(e) => setMd(e.target.value)} placeholder="# Introduction&#10;&#10;Paste your Markdown here…" className="flex-1 min-h-[300px] font-mono text-sm" />
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2"><Checkbox checked={codeAsPrompt} onCheckedChange={(v) => setCodeAsPrompt(!!v)} />Turn code blocks (```) into AI Prompt blocks</label>
              <label className="flex items-center gap-2"><Checkbox checked={replace} onCheckedChange={(v) => setReplace(!!v)} />Replace the current lesson content (otherwise add to the end)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={runImport} disabled={!md.trim()}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Label className="sr-only">Lesson content</Label>
    </div>
  );
};

export default LessonEditor;
