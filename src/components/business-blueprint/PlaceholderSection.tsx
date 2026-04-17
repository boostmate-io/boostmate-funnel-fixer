import { Sparkles, type LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  comingNext: string[];
}

const PlaceholderSection = ({ title, description, icon: Icon, comingNext }: Props) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-5 shadow-lg">
            <Icon className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">{title}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Coming next</p>
          </div>
          <ul className="space-y-3">
            {comingNext.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              This section will become available in an upcoming release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderSection;
