import { useRef, useState } from "react";
import { type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DocumentationRichTextEditor } from "./DocumentationRichTextEditor";
import { markdownToEditorHtml } from "@/lib/docs/markdown";
import type { DocNode } from "@/lib/docs/docContent";

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

  const editorRef = useRef<Editor | null>(null);

  const runImport = () => {
    const editor = editorRef.current;
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

  return (
    <div>
      <DocumentationRichTextEditor initialContent={initialContent} onChange={onChange} onImport={(editor) => { editorRef.current = editor; setImportOpen(true); }} />
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
