import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lightbulb } from "lucide-react";

interface Example {
  label: string;
  value: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  examples: Example[];
}

const ExamplesDialog = ({ open, onOpenChange, title, examples }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <DialogTitle className="text-xl">Examples — {title}</DialogTitle>
        </div>
        <DialogDescription>High-quality sample answers to inspire your inputs.</DialogDescription>
      </DialogHeader>

      <div className="space-y-3 mt-2">
        {examples.map((ex) => (
          <div key={ex.label} className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">
              {ex.label}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{ex.value}</p>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default ExamplesDialog;
