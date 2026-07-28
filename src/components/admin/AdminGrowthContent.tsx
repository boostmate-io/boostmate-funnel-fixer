// =============================================================================
// AdminGrowthContent — editor for the Growth Roadmap's editable stage content
// (`growth_stages`), following the Editable Product Content pattern: typed
// English columns + a `translations` JSONB overlay for other locales + an
// `ai_guidance` field that never reaches the UI.
//
// Growth Systems are NOT managed here — `growth_systems_catalog` is the single
// canonical catalog, managed in Admin → Growth → Growth Systems.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Translations = Record<string, Record<string, string>>;

interface StageRow {
  stage: string;
  label: string;
  summary: string;
  typical_profile: string;
  unlock_condition: string;
  focus: string;
  success_criteria: string;
  bottleneck: string;
  objective: string;
  milestone: string;
  ai_guidance: string;
  sort_order: number;
  translations: Translations | null;
}

const STAGE_FIELDS: Array<{ key: keyof StageRow; label: string; long?: boolean }> = [
  { key: "label", label: "Label" },
  { key: "summary", label: "Summary (why you're here)", long: true },
  { key: "typical_profile", label: "Typical profile", long: true },
  { key: "unlock_condition", label: "Unlock condition", long: true },
  { key: "focus", label: "Focus of this stage", long: true },
  { key: "success_criteria", label: "What success looks like", long: true },
  { key: "bottleneck", label: "Bottleneck" },
  { key: "objective", label: "Objective" },
  { key: "milestone", label: "Milestone" },
];

export default function AdminGrowthContent() {
  return <StagesEditor />;
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

function StagesEditor() {
  const [rows, setRows] = useState<StageRow[]>([]);
  const [editing, setEditing] = useState<StageRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("growth_stages")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as StageRow[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { stage, ...rest } = editing;
    const { error } = await supabase.from("growth_stages").update(rest as never).eq("stage", stage);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Stage content saved");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Copy shown in the Growth Roadmap stage ladder, stage info dialog and current stage panel.
      </p>
      {rows.map((r) => (
        <div key={r.stage} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{r.label}</span>
              <Badge variant="outline">{r.stage}</Badge>
              {r.translations?.nl && <Badge variant="secondary">NL</Badge>}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.summary}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing({ ...r })}>
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </Button>
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit stage — {editing?.stage}</DialogTitle>
          </DialogHeader>
          {editing && (
            <LocalizedFields
              fields={STAGE_FIELDS as never}
              row={editing as never}
              onChange={(next) => setEditing(next as unknown as StageRow)}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: English fields + NL overlay + AI guidance
// ---------------------------------------------------------------------------

interface FieldSpec {
  key: string;
  label: string;
  long?: boolean;
}

function LocalizedFields({
  fields,
  row,
  onChange,
}: {
  fields: FieldSpec[];
  row: Record<string, unknown> & { translations: Translations | null; ai_guidance: string };
  onChange: (next: Record<string, unknown>) => void;
}) {
  const nl = row.translations?.nl ?? {};

  const setNl = (key: string, value: string) => {
    const nextNl = { ...nl, [key]: value };
    onChange({ ...row, translations: { ...(row.translations ?? {}), nl: nextNl } });
  };

  return (
    <Tabs defaultValue="en" className="space-y-4">
      <TabsList>
        <TabsTrigger value="en">English</TabsTrigger>
        <TabsTrigger value="nl">Nederlands</TabsTrigger>
        <TabsTrigger value="ai">AI guidance</TabsTrigger>
      </TabsList>

      <TabsContent value="en" className="space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            {f.long ? (
              <Textarea
                rows={3}
                value={String(row[f.key] ?? "")}
                onChange={(e) => onChange({ ...row, [f.key]: e.target.value })}
              />
            ) : (
              <Input
                value={String(row[f.key] ?? "")}
                onChange={(e) => onChange({ ...row, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </TabsContent>

      <TabsContent value="nl" className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Leave a field empty to fall back to the English value.
        </p>
        {fields.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            {f.long ? (
              <Textarea rows={3} value={nl[f.key] ?? ""} onChange={(e) => setNl(f.key, e.target.value)} />
            ) : (
              <Input value={nl[f.key] ?? ""} onChange={(e) => setNl(f.key, e.target.value)} />
            )}
          </div>
        ))}
      </TabsContent>

      <TabsContent value="ai">
        <Label>AI guidance (never shown to users)</Label>
        <Textarea
          rows={8}
          value={row.ai_guidance ?? ""}
          onChange={(e) => onChange({ ...row, ai_guidance: e.target.value })}
        />
      </TabsContent>
    </Tabs>
  );
}
