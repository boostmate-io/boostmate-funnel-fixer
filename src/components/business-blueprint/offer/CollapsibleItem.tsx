// =============================================================================
// CollapsibleItem — accordion wrapper for repeatable Blueprint entries.
// Header shows a compact summary; body renders children when expanded.
// New/empty items should pass `defaultOpen`; filled items collapse by default.
// =============================================================================

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  summary: React.ReactNode;
  defaultOpen?: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
}

const CollapsibleItem = ({ summary, defaultOpen, onDelete, children }: Props) => {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
            {summary}
          </div>
        </button>
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            aria-label="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
};

export default CollapsibleItem;
