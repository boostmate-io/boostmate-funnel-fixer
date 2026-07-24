import { useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  suggestions?: string[];
  placeholder?: string;
}

const parseTags = (raw: string): string[] =>
  raw.split(",").map((t) => t.trim()).filter(Boolean);

const SuggestedTagsField = ({ value, onChange, suggestions = [], placeholder }: Props) => {
  const [draft, setDraft] = useState("");
  const tags = parseTags(value || "");

  const commit = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || tags.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...tags, trimmed].join(", "));
    setDraft("");
  };

  const remove = (t: string) => onChange(tags.filter((x) => x !== t).join(", "));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      remove(tags[tags.length - 1]);
    }
  };

  const unused = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.length === 0 && (
          <span className="text-sm text-muted-foreground/60">No tags yet</span>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="rounded-full hover:bg-primary/20 p-0.5"
              aria-label={`Remove ${t}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => draft && commit(draft)}
        placeholder={placeholder || "Add custom tag and press Enter…"}
        className="h-9"
      />
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {unused.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => commit(s)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                "border border-dashed border-border text-muted-foreground",
                "hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors",
              )}
            >
              <Plus className="w-3 h-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestedTagsField;
