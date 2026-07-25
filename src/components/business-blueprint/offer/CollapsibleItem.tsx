// =============================================================================
// CollapsibleItem — accordion wrapper for repeatable Blueprint entries.
// Header is read-only and mirrors the item's Title/Name field live.
// The Title/Name field itself lives INSIDE the accordion body.
// =============================================================================

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Live title mirrored in the header (read-only). */
  title: string;
  /** Shown when `title` is empty (e.g. "Deliverable 3"). */
  fallbackTitle: string;
  /** Optional leading badge/number rendered inside the header. */
  leading?: React.ReactNode;
  defaultOpen?: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
}

const CollapsibleItem = ({ title, fallbackTitle, leading, defaultOpen, onDelete, children }: Props) => {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const hasTitle = !!title.trim();
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
          {leading}
          <div
            className={`flex-1 min-w-0 text-sm font-medium truncate ${
              hasTitle ? "text-foreground" : "text-muted-foreground italic"
            }`}
          >
            {hasTitle ? title : fallbackTitle}
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
