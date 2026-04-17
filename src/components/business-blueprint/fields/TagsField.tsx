import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

const parseTags = (raw: string): string[] =>
  raw.split(",").map((t) => t.trim()).filter(Boolean);

const TagsField = ({ value, onChange, placeholder }: Props) => {
  const [draft, setDraft] = useState("");
  const tags = parseTags(value || "");

  const commit = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || tags.includes(trimmed)) return;
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
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
        placeholder={placeholder || "Type and press Enter…"}
        className="h-9"
      />
    </div>
  );
};

export default TagsField;
