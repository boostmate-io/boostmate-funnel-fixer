// =============================================================================
// AngleField — large text card for the four Gusten differentiation fields.
// Coach entry point sits top-right, consistent with FieldCard.
// =============================================================================

import { MessageSquare, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";

interface Props {
  label: string;
  helper?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onCoach?: () => void;
}

const AngleField = ({ label, helper, placeholder, value, onChange, onCoach }: Props) => {
  const hasContent = value.trim().length > 0;

  return (
    <div className="rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all flex flex-col h-full">
      <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Label className="text-lg font-display font-bold text-foreground leading-snug">{label}</Label>
            {hasContent && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </div>
          {helper && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{helper}</p>}
        </div>
        {onCoach && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 shrink-0"
            onClick={onCoach}
          >
            <MessageSquare className="w-3 h-3" />
            Coach
          </Button>
        )}
      </div>
      <div className="px-5 pt-2 pb-4 flex-1">
        <AutoTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] leading-relaxed placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
};

export default AngleField;
