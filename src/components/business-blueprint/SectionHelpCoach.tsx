// =============================================================================
// SectionHelpCoach — small info button placed next to a Blueprint section or
// tab title. Opens the AI Coach with section-scope context and auto-seeds a
// "why does this matter + how should I approach it" first user message so the
// explanation is personalized to the workspace's Blueprint data.
// =============================================================================

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoachPanel from "@/components/coach/CoachPanel";
import { buildBlueprintSectionContext } from "@/lib/coach/buildContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Props {
  /** Stable id used by the coach engine, e.g. "customer_clarity.avatar". */
  sectionId: string;
  /** Human label, e.g. "Customer Clarity — Ideal Avatar". */
  sectionLabel: string;
  /** Optional custom seed. Defaults to a generic "explain this section" prompt. */
  seed?: string;
  /** Optional compact mode (icon-only, tighter). Default true. */
  compact?: boolean;
}

const SectionHelpCoach = ({ sectionId, sectionLabel, seed, compact = true }: Props) => {
  const [open, setOpen] = useState(false);
  const { activeSubAccountId } = useWorkspace();

  const context = useMemo(
    () => (activeSubAccountId ? buildBlueprintSectionContext(sectionId, sectionLabel, null, activeSubAccountId) : null),
    [activeSubAccountId, sectionId, sectionLabel],
  );

  const seedText =
    seed ??
    `Explain why "${sectionLabel}" matters for my business and help me understand how to approach it based on what you already know about me.`;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Explain ${sectionLabel}`}
        className={
          compact
            ? "h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5"
            : "h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
        }
      >
        <Info className="w-4 h-4" />
        {!compact && <span>Explain</span>}
      </Button>
      <CoachPanel
        open={open}
        onOpenChange={setOpen}
        context={context}
        pendingSeed={open ? { key: `${sectionId}:help`, text: seedText } : null}
      />
    </>
  );
};

export default SectionHelpCoach;
