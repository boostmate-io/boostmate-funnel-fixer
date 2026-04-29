// =============================================================================
// AngleField — large text card for the four Gusten differentiation fields.
// Keeps Generate/Coach buttons (stubbed). Modeled after FieldCard but lighter.
// =============================================================================

import { useState } from "react";
import { Wand2, MessageSquare, Sparkles, Loader2, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { toast } from "sonner";

interface Props {
  label: string;
  helper?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onCoach?: () => void;
}

const AngleField = ({ label, helper, placeholder, value, onChange, onCoach }: Props) => {
  const [busy, setBusy] = useState<null | "generate" | "improve">(null);
  const hasContent = value.trim().length > 0;

  const stub = (kind: "generate" | "improve") => {
    setBusy(kind);
    setTimeout(() => {
      setBusy(null);
      toast.info(`${kind === "generate" ? "Generate" : "Improve"} — AI coming soon`);
    }, 400);
  };

  return (
    <div className="rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Label className="text-lg font-display font-bold text-foreground leading-snug">{label}</Label>
          {hasContent && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
        </div>
        {helper && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{helper}</p>}
      </div>
      <div className="px-5 py-2 flex-1">
        <AutoTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] leading-relaxed placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="px-3 pb-3 pt-1 flex items-center gap-1 border-t border-border/50 mt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
          onClick={() => stub(hasContent ? "improve" : "generate")}
          disabled={busy !== null}
        >
          {busy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : hasContent ? (
            <Sparkles className="w-3 h-3" />
          ) : (
            <Wand2 className="w-3 h-3" />
          )}
          {hasContent ? "Improve" : "Generate"}
        </Button>
        {onCoach && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
            onClick={onCoach}
          >
            <MessageSquare className="w-3 h-3" />
            Coach
          </Button>
        )}
      </div>
    </div>
  );
};

export default AngleField;
