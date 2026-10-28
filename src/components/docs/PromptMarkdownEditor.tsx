import { useRef, useState } from "react";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link, Quote, Code, SquareCode, Minus, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPromptSelection, type PromptFormat } from "@/lib/docs/promptMarkdown";
import PromptMarkdown from "./PromptMarkdown";

const tools = [
  ["h1", "Heading 1", Heading1], ["h2", "Heading 2", Heading2], ["h3", "Heading 3", Heading3],
  ["bold", "Bold", Bold], ["italic", "Italic", Italic], ["bullet", "Bullet list", List],
  ["ordered", "Numbered list", ListOrdered], ["link", "Link", Link], ["quote", "Quote", Quote],
  ["code", "Inline code", Code], ["codeBlock", "Code block", SquareCode], ["divider", "Divider", Minus],
] as const;

const PromptMarkdownEditor = ({ value, onChange, id }: { value: string; onChange: (value: string) => void; id: string }) => {
  const [preview, setPreview] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const apply = (format: PromptFormat) => {
    const el = input.current;
    if (!el) return;
    const result = formatPromptSelection(value, el.selectionStart, el.selectionEnd, format);
    onChange(result.source);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(result.start, result.end); });
  };
  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-lg border overflow-hidden">
      <div className="flex items-center justify-end gap-1 border-b bg-muted/40 p-1" role="group" aria-label="Prompt mode">
        <Button type="button" variant={preview ? "ghost" : "secondary"} size="sm" aria-pressed={!preview} onClick={() => setPreview(false)} className="gap-1.5"><Pencil className="w-4 h-4" />Edit</Button>
        <Button type="button" variant={preview ? "secondary" : "ghost"} size="sm" aria-pressed={preview} onClick={() => setPreview(true)} className="gap-1.5"><Eye className="w-4 h-4" />Preview</Button>
      </div>
      {preview ? <div className="flex-1 min-h-[200px] overflow-y-auto p-4"><PromptMarkdown source={value} /></div> : <>
        <div className="flex flex-wrap gap-0.5 border-b p-1" role="toolbar" aria-label="Markdown formatting">
          {tools.map(([format, label, Icon]) => <Tooltip key={format}><TooltipTrigger asChild>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={() => apply(format)}><Icon className="w-4 h-4" /></Button>
          </TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>)}
        </div>
        <Textarea ref={input} id={id} aria-label="Prompt content" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-h-[200px] resize-none rounded-none border-0 font-mono text-sm" />
      </>}
    </div>
  );
};

export default PromptMarkdownEditor;