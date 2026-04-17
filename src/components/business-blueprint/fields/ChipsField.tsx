import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  options: Option[];
}

const ChipsField = ({ value, onChange, options }: Props) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(active ? "" : opt.value)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
            active
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent",
          )}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export default ChipsField;
