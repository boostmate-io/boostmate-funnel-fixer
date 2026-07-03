// =============================================================================
// CoachIconButton — small inline Coach trigger placed next to a field label.
// Matches the "Coach" chip used in FieldCard/AngleField but sized for headers.
// =============================================================================

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onClick: () => void;
  label?: string;
  compact?: boolean;
}

const CoachIconButton = ({ onClick, label = "Coach", compact = false }: Props) => (
  <Button
    type="button"
    size="sm"
    variant="ghost"
    onClick={onClick}
    className={
      compact
        ? "h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5"
        : "h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
    }
    aria-label="Open AI Coach for this field"
  >
    <MessageSquare className="w-3.5 h-3.5" />
    {!compact && <span>{label}</span>}
  </Button>
);

export default CoachIconButton;
