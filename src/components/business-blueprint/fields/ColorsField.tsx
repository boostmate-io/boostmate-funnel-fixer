import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorsValue {
  primary?: string;
  secondary?: string;
  accent?: string;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
}

const parse = (raw: string): ColorsValue => {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object") return p;
  } catch {
    // legacy free-text — leave empty structured values
  }
  return {};
};

const isHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);

const Row = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const hex = isHex(value) ? value : "#ffffff";
  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs text-muted-foreground w-24 shrink-0">{label}</Label>
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer p-0"
        aria-label={`${label} color`}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="h-9 font-mono text-xs uppercase max-w-[140px]"
      />
    </div>
  );
};

const ColorsField = ({ value, onChange }: Props) => {
  const current = parse(value);

  const set = (patch: Partial<ColorsValue>) => {
    const next = { ...current, ...patch };
    // Drop empties so completion check reflects real content.
    const cleaned: ColorsValue = {};
    (Object.keys(next) as (keyof ColorsValue)[]).forEach((k) => {
      if (next[k] && next[k]!.trim()) cleaned[k] = next[k]!.trim();
    });
    onChange(Object.keys(cleaned).length ? JSON.stringify(cleaned) : "");
  };

  return (
    <div className="space-y-2">
      <Row label="Primary" value={current.primary || ""} onChange={(v) => set({ primary: v })} />
      <Row label="Secondary" value={current.secondary || ""} onChange={(v) => set({ secondary: v })} />
      <Row label="Accent" value={current.accent || ""} onChange={(v) => set({ accent: v })} />
    </div>
  );
};

export default ColorsField;
