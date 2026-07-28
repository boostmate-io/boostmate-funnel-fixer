// =============================================================================
// SectionHelpCoach — Blueprint section/tab Coach entry point.
//
// Does NOT open its own chat: it focuses the single Business Coach
// conversation on this section. Two variants:
//   • "explain"     — info icon, "why does this matter / how to approach it".
//   • "walkthrough" — "AI Coach" button, field-by-field coaching of the tab.
// =============================================================================

import { useMemo } from "react";
import { Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoach } from "@/contexts/CoachContext";
import { buildBlueprintSectionContext } from "@/lib/coach/buildContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Props {
  /** Stable id used by the coach engine, e.g. "customer_clarity.avatar". */
  sectionId: string;
  /** Human label, e.g. "Customer Clarity — Ideal Avatar". */
  sectionLabel: string;
  /** Optional custom focus turn. */
  seed?: string;
  /** Optional compact mode (icon-only, tighter). Default true. */
  compact?: boolean;
  /** "explain" (default) or "walkthrough". */
  variant?: "explain" | "walkthrough";
}

const SectionHelpCoach = ({
  sectionId,
  sectionLabel,
  seed,
  compact = true,
  variant = "explain",
}: Props) => {
  const { openCoach } = useCoach();
  const { activeSubAccountId } = useWorkspace();

  const context = useMemo(
    () =>
      activeSubAccountId
        ? buildBlueprintSectionContext(sectionId, sectionLabel, null, activeSubAccountId)
        : null,
    [activeSubAccountId, sectionId, sectionLabel],
  );

  const walkthrough = variant === "walkthrough";

  const handleClick = () => {
    if (!context) return;
    openCoach({
      key: `${sectionId}:${walkthrough ? "walkthrough" : "help"}`,
      label: sectionLabel,
      scope: context.scope,
      intent: context.intent,
      mode: walkthrough ? "walkthrough" : "section",
      target: context.target,
      seed,
    });
  };

  if (walkthrough) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleClick}
        aria-label={`AI Coach walkthrough — ${sectionLabel}`}
        className="h-7 gap-1.5 text-xs text-primary hover:bg-primary/5"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI Coach</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={handleClick}
      aria-label={`Explain ${sectionLabel}`}
      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
    >
      <Info className="w-3.5 h-3.5" />
      <span>Info</span>
    </Button>
  );

};

export default SectionHelpCoach;
