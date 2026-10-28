import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bold, Italic, Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, Link as LinkIcon, Quote, Minus, Sparkles, FileDown, Undo2, Redo2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AiPromptNode } from "./AiPromptNode";
import { documentationStarterKit } from "@/lib/docs/richText";
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

const Toolbar = ({ editor, onImport, prompts }: { editor: Editor; onImport: () => void; prompts: boolean }) => {
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
        {prompts && <>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={selectionToPrompt}><Wand2 className="w-3.5 h-3.5" />Selection → Prompt</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={insertPrompt}><Sparkles className="w-3.5 h-3.5" />AI Prompt</Button>
        </>}
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={onImport}><FileDown className="w-3.5 h-3.5" />Import Markdown</Button>
      </div>
    </div>
  );
};

export const DocumentationRichTextEditor = ({ initialContent, onChange, onImport, prompts = true, compact = false, id }: {
  initialContent: DocNode; onChange: (doc: DocNode) => void; onImport: (editor: Editor) => void;
  prompts?: boolean; compact?: boolean; id?: string;
}) => {
  const editor = useEditor({
    extensions: [documentationStarterKit(), Placeholder.configure({ placeholder: "Start writing, or paste formatted content…" }), ...(prompts ? [AiPromptNode] : [])],
    content: initialContent,
    editorProps: { attributes: { class: `lesson-editor ${compact ? "min-h-[250px]" : "min-h-[480px]"} px-6 py-5 focus:outline-none`, ...(id ? { id, role: "textbox", "aria-label": "Prompt content", "aria-multiline": "true" } : {}) } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as DocNode),
  });
  if (!editor) return null;
  return <div className={`rounded-lg border bg-card ${compact ? "flex-1 min-h-0 overflow-y-auto" : ""}`}>
    <Toolbar editor={editor} prompts={prompts} onImport={() => onImport(editor)} />
    <EditorContent editor={editor} />
  </div>;
};
