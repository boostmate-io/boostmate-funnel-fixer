// =============================================================================
// OfferObjectionsEditor — V3 rich offer-level objections editor.
// Schema per objection:
//   { id, objection, why_believed, emotional_concern, reframe,
//     supporting_proof_ids: string[], supporting_proof_text }
// `supporting_proof_ids` references Social Proof Library items from the
// workspace's Business Blueprint (client_results, testimonials,
// authority_assets, metrics) to avoid duplicating proof.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Check, LibraryBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface RichObjection {
  id: string;
  objection?: string;
  why_believed?: string;
  emotional_concern?: string;
  reframe?: string;
  supporting_proof_ids?: string[];
  supporting_proof_text?: string;
}

interface ProofOption {
  id: string;
  label: string;
  group: string;
}

interface Props {
  value: RichObjection[];
  onChange: (next: RichObjection[]) => void;
  subAccountId: string | null;
  readOnly?: boolean;
}

/** Legacy → rich mapper. */
export function migrateLegacyObjections(data: Record<string, unknown>): RichObjection[] {
  const existing = data.objections;
  if (Array.isArray(existing)) return existing as RichObjection[];
  const out: RichObjection[] = [];
  for (let i = 1; i <= 5; i++) {
    const objection = (data[`objection_${i}`] as string | undefined)?.trim();
    const rebuttal = (data[`rebuttal_${i}`] as string | undefined)?.trim();
    if (objection || rebuttal) {
      out.push({
        id: crypto.randomUUID(),
        objection: objection || "",
        reframe: rebuttal || "",
        supporting_proof_ids: [],
      });
    }
  }
  return out;
}

function useProofLibrary(subAccountId: string | null) {
  const [options, setOptions] = useState<ProofOption[]>([]);
  useEffect(() => {
    if (!subAccountId) return;
    (async () => {
      const { data } = await supabase
        .from("business_blueprints")
        .select("proof_authority")
        .eq("sub_account_id", subAccountId)
        .maybeSingle();
      const pa: any = (data as any)?.proof_authority ?? {};
      const sp = pa.social_proof ?? {};
      const out: ProofOption[] = [];
      (sp.client_results ?? []).forEach((r: any) => {
        if (!r?.id) return;
        out.push({
          id: r.id,
          group: "Client Result",
          label: r.measurable_outcome || r.result_achieved || r.client_type || "Client result",
        });
      });
      (sp.testimonials ?? []).forEach((t: any) => {
        if (!t?.id) return;
        out.push({
          id: t.id,
          group: "Testimonial",
          label: t.client_name || t.main_outcome || "Testimonial",
        });
      });
      (sp.authority_assets ?? []).forEach((a: any) => {
        if (!a?.id) return;
        out.push({ id: a.id, group: "Authority Asset", label: a.name || "Asset" });
      });
      (sp.metrics ?? []).forEach((m: any) => {
        if (!m?.id) return;
        out.push({
          id: m.id,
          group: "Metric",
          label: [m.metric, m.value].filter(Boolean).join(": ") || "Metric",
        });
      });
      setOptions(out);
    })();
  }, [subAccountId]);
  return options;
}

const OfferObjectionsEditor = ({ value, onChange, subAccountId, readOnly }: Props) => {
  const proofOptions = useProofLibrary(subAccountId);
  const proofById = useMemo(() => Object.fromEntries(proofOptions.map((p) => [p.id, p])), [proofOptions]);

  const update = (id: string, patch: Partial<RichObjection>) =>
    onChange(value.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const remove = (id: string) => onChange(value.filter((o) => o.id !== id));
  const add = () =>
    onChange([...value, { id: crypto.randomUUID(), supporting_proof_ids: [] }]);

  const toggleProof = (id: string, proofId: string) => {
    const current = value.find((o) => o.id === id)?.supporting_proof_ids ?? [];
    const next = current.includes(proofId)
      ? current.filter((x) => x !== proofId)
      : [...current, proofId];
    update(id, { supporting_proof_ids: next });
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">No objections captured.</p>
        ) : (
          value.map((o) => (
            <div key={o.id} className="rounded-lg border border-border bg-card px-4 py-3">
              {o.objection && <p className="text-sm font-semibold">"{o.objection}"</p>}
              {o.why_believed && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">Why believed:</span> {o.why_believed}
                </p>
              )}
              {o.emotional_concern && (
                <p className="text-xs text-muted-foreground mt-1 italic">{o.emotional_concern}</p>
              )}
              {o.reframe && (
                <p className="text-sm text-primary mt-1">
                  <span className="font-medium">Reframe:</span> {o.reframe}
                </p>
              )}
              {(o.supporting_proof_ids?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {o.supporting_proof_ids!.map((pid) => (
                    <Badge key={pid} variant="secondary" className="text-[10px]">
                      {proofById[pid]?.label ?? "Proof item"}
                    </Badge>
                  ))}
                </div>
              )}
              {o.supporting_proof_text && (
                <p className="text-xs text-foreground/80 mt-1">
                  <span className="font-medium">Proof note:</span> {o.supporting_proof_text}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No objections yet. Capture the doubts your buyers actually raise, with the reframe and proof that dissolve them.
        </p>
      )}
      {value.map((o, i) => {
        const selected = o.supporting_proof_ids ?? [];
        return (
          <div key={o.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Objection {i + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(o.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Objection</label>
              <Input
                value={o.objection ?? ""}
                onChange={(e) => update(o.id, { objection: e.target.value })}
                placeholder={`"I don't have the time to implement this right now."`}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Why people believe this</label>
                <Textarea
                  value={o.why_believed ?? ""}
                  onChange={(e) => update(o.id, { why_believed: e.target.value })}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="They've been burned by heavy tools that promised speed and delivered overhead."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Emotional concern behind it</label>
                <Textarea
                  value={o.emotional_concern ?? ""}
                  onChange={(e) => update(o.id, { emotional_concern: e.target.value })}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Fear of starting yet another thing they can't keep up with."
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium">Reframe / Rebuttal</label>
                <Textarea
                  value={o.reframe ?? ""}
                  onChange={(e) => update(o.id, { reframe: e.target.value })}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="The system replaces 4 hours/week of manual work — most clients save time in the first 7 days."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <LibraryBig className="w-3 h-3" /> Supporting proof — link Social Proof Library items
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-normal justify-start"
                  >
                    {selected.length === 0
                      ? "Link proof items…"
                      : `${selected.length} proof item(s) linked`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-2">
                  {proofOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">
                      No proof items in your Blueprint's Social Proof Library yet.
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-auto space-y-0.5">
                      {proofOptions.map((p) => {
                        const active = selected.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProof(o.id, p.id)}
                            className="w-full flex items-start gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left"
                          >
                            <div className="w-3.5 h-3.5 shrink-0 mt-0.5">
                              {active && <Check className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {p.group}
                              </p>
                              <p className="truncate">{p.label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selected.map((pid) => (
                    <Badge key={pid} variant="secondary" className="text-[10px]">
                      {proofById[pid]?.label ?? "Proof item"}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Additional proof note (optional)</label>
              <Textarea
                value={o.supporting_proof_text ?? ""}
                onChange={(e) => update(o.id, { supporting_proof_text: e.target.value })}
                rows={2}
                className="text-sm resize-none"
                placeholder="Sarah went from 8h to 1h/week on lead follow-up in week 1."
              />
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add Objection
      </Button>
    </div>
  );
};

export default OfferObjectionsEditor;
