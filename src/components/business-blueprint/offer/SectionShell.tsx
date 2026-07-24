// =============================================================================
// SectionShell — consistent header for every Offer Design tab.
// The former static "Why this matters" and completion-feedback blocks have
// been removed; strategic guidance now comes from the AI Coach via the help
// button in the section header (see `SectionHelpCoach`).
// =============================================================================

import { type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  /** @deprecated retained for API compat — no longer rendered. */
  insight?: string;
  progress: number;
  saving?: boolean;
  /** @deprecated retained for API compat — no longer rendered. */
  feedback?: string | null;
  rightBadge?: React.ReactNode;
  /** Optional right-of-title slot (e.g. `<SectionHelpCoach />`). */
  helpButton?: React.ReactNode;
  embedded?: boolean;
  children: React.ReactNode;
}

const SectionShell = ({
  icon: Icon,
  title,
  description,
  progress,
  saving,
  rightBadge,
  helpButton,
  embedded,
  children,
}: Props) => (
  <div className={embedded ? "" : "h-full overflow-y-auto"}>
    <div className={embedded ? "px-4 py-5" : "max-w-6xl mx-auto p-8"}>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-display font-bold text-foreground">{title}</h2>
            {helpButton}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {rightBadge}
          {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
        </div>
      </div>

      {children}

      <div className="mt-4 px-1">
        <Progress value={progress} className="h-1" />
      </div>
    </div>
  </div>
);

export default SectionShell;
