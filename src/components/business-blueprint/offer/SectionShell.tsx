// =============================================================================
// SectionShell — consistent header + insight box for every Offer Design tab.
// =============================================================================

import { type LucideIcon, Info, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  insight?: string;
  progress: number;
  saving?: boolean;
  feedback?: string | null;
  rightBadge?: React.ReactNode;
  children: React.ReactNode;
}

const SectionShell = ({
  icon: Icon,
  title,
  description,
  insight,
  progress,
  saving,
  feedback,
  rightBadge,
  children,
}: Props) => (
  <div className="h-full overflow-y-auto">
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-display font-bold text-foreground">{title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {rightBadge}
          {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
        </div>
      </div>

      {insight && (
        <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-4 flex gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">
              Why this matters
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{insight}</p>
          </div>
        </div>
      )}

      {children}

      {feedback && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-primary font-medium">{feedback}</p>
        </div>
      )}

      <div className="mt-4 px-1">
        <Progress value={progress} className="h-1" />
      </div>
    </div>
  </div>
);

export default SectionShell;
