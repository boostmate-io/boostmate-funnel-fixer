import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import PromptMarkdown from "./PromptMarkdown";

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
};

const CopyButton = ({ text, variant = "default" }: { text: string; variant?: "default" | "outline" }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy automatically. Open View Prompt and select the text to copy it.");
    }
  };
  return (
    <Button size="sm" variant={variant} onClick={onCopy} className="gap-1.5 min-h-9" aria-live="polite">
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied!" : "Copy Prompt"}
    </Button>
  );
};

const PromptCard = ({ title, prompt }: { title: string; prompt: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="not-prose my-6 rounded-xl border border-primary/25 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">AI Prompt</p>
          <p className="font-display font-semibold text-foreground truncate">{title || "AI Prompt"}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <CopyButton text={prompt} />
        <Button size="sm" variant="outline" className="gap-1.5 min-h-9" onClick={() => setOpen(true)}>
          <Eye className="w-4 h-4" /> View Prompt
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display pr-8">{title || "AI Prompt"}</DialogTitle>
            <DialogDescription>Copy this prompt and paste it into your AI assistant.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-muted/40 p-4">
            <PromptMarkdown source={prompt} />
          </div>
          <div className="flex justify-end">
            <CopyButton text={prompt} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptCard;
