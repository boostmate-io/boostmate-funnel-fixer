// =============================================================================
// MultiSelectChips — selectable chip group with optional "Add custom" support.
// Stores values as a string[] in parent state.
// =============================================================================

import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

const MultiSelectChips = ({
  options,
  value,
  onChange,
  allowCustom = true,
  customPlaceholder = "Add custom…",
}: Props) => {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const commitCustom = () => {
    const v = draft.trim();
    if (!v) {
      setAdding(false);
      return;
    }
    if (!value.includes(v)) onChange([...value, v]);
    setDraft("");
    setAdding(false);
  };

  const customExtras = value.filter((v) => !options.includes(v));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-border hover:border-primary/50",
              )}
            >
              {active && <Check className="w-3 h-3" />}
              {opt}
            </button>
          );
        })}
        {customExtras.map((extra) => (
          <button
            type="button"
            key={extra}
            onClick={() => toggle(extra)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground border border-primary shadow-sm"
          >
            <Check className="w-3 h-3" />
            {extra}
            <X
              className="w-3 h-3 ml-0.5 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((v) => v !== extra));
              }}
            />
          </button>
        ))}
        {allowCustom && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            <Plus className="w-3 h-3" />
            Custom
          </button>
        )}
      </div>
      {adding && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustom();
              } else if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder={customPlaceholder}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={commitCustom} className="h-8">Add</Button>
        </div>
      )}
    </div>
  );
};

export default MultiSelectChips;
