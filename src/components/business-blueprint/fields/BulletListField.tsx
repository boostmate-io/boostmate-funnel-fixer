import { useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

const parseItems = (raw: string): string[] =>
  (raw || "")
    .split("\n")
    .map((l) => l.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);

const serialize = (items: string[]) => items.join("\n");

const BulletListField = ({ value, onChange, placeholder }: Props) => {
  const items = parseItems(value);
  const [draft, setDraft] = useState("");

  const add = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    onChange(serialize([...items, trimmed]));
    setDraft("");
  };

  const updateAt = (i: number, next: string) => {
    const copy = [...items];
    copy[i] = next;
    onChange(serialize(copy.filter((x, idx) => idx !== i || next.trim().length > 0)));
  };

  const removeAt = (i: number) => {
    const copy = items.filter((_, idx) => idx !== i);
    onChange(serialize(copy));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(draft);
    }
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground/60">No items yet</p>
      )}
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 group">
            <span className="text-primary/60 text-sm">•</span>
            <Input
              value={item}
              onChange={(e) => updateAt(i, e.target.value)}
              className="h-8 flex-1 border-transparent bg-transparent px-1 focus-visible:border-border focus-visible:bg-background"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={() => removeAt(i)}
              aria-label="Remove item"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 pt-1">
        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder={placeholder || "Add item and press Enter…"}
          className="h-8 flex-1"
        />
      </div>
    </div>
  );
};

export default BulletListField;
