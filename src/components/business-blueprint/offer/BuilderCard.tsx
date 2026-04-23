// =============================================================================
// BuilderCard — reusable wrapper for "Add X" list builders (Deliverables,
// Bonuses, Milestones, Payment Plans, Ecosystem offers).
//
// Renders a card section with a title, description, an "Add" CTA, and an empty
// state. Children are the rendered list of items.
// =============================================================================

import { Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  addLabel: string;
  onAdd: () => void;
  emptyText?: string;
  emptyAction?: React.ReactNode;
  count?: number;
  children?: React.ReactNode;
}

const BuilderCard = ({
  icon: Icon,
  title,
  description,
  addLabel,
  onAdd,
  emptyText,
  emptyAction,
  count,
  children,
}: Props) => {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {typeof count === "number" && count > 0 && (
                <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {count}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5 h-8 shrink-0">
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {isEmpty ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {emptyText ?? "Nothing here yet."}
            </p>
            {emptyAction ?? (
              <Button size="sm" variant="ghost" onClick={onAdd} className="gap-1.5 text-primary hover:bg-primary/5">
                <Plus className="w-3.5 h-3.5" />
                {addLabel}
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default BuilderCard;
