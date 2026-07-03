// =============================================================================
// BuilderCard — reusable wrapper for "Add X" list builders (Deliverables,
// Bonuses, Milestones, Payment Plans, Ecosystem offers).
//
// Optional `onCoach` prop renders a section-level AI Coach button next to
// the "Add" CTA. Clicking it opens the Coach in list-section mode so the AI
// can propose a batch of items at once — no need to add empty items first.
// =============================================================================

import { Plus, MessageSquare, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  addLabel: string;
  onAdd: () => void;
  onCoach?: () => void;
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
  onCoach,
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
              <h3 className="text-lg font-display font-bold text-foreground">{title}</h3>
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
        <div className="flex items-center gap-1.5 shrink-0">
          {onCoach && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCoach}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
              aria-label={`Open AI Coach for ${title}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Coach
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" />
            {addLabel}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isEmpty ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {emptyText ?? "Nothing here yet."}
            </p>
            {emptyAction ?? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={onAdd} className="gap-1.5 text-primary hover:bg-primary/5">
                  <Plus className="w-3.5 h-3.5" />
                  {addLabel}
                </Button>
                {onCoach && (
                  <Button size="sm" variant="ghost" onClick={onCoach} className="gap-1.5 text-primary hover:bg-primary/5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask Coach to suggest
                  </Button>
                )}
              </div>
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
