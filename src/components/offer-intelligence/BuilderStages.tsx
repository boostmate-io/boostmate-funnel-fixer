// Builder Stages C–E working areas (presentation only; persistence via `run`).
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DIMENSION_LABELS, compareProfiles, VALUE_PROFILE_DISCLAIMER, VALUE_RUBRIC_VERSION } from "@shared/offerIntelligence/valueEquation";
import type { StrengthenDecision, StrengthenItem } from "@shared/offerIntelligence/builderStages";
import type { BuilderSession, BuilderAction } from "@/lib/offers/offerBuilder";
import { cn } from "@/lib/utils";

type Run = (action: BuilderAction, extra?: Record<string, unknown>) => Promise<void>;
interface StageProps { s: BuilderSession; busy: string | null; run: Run; stale: { strengthen: boolean; package: boolean; final: boolean } }

const StaleNotice = ({ text, action, onClick, busy }: { text: string; action: string; onClick: () => void; busy: boolean }) => (
  <div role="status" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex flex-wrap items-center gap-3 text-sm">
    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
    <span className="flex-1 text-foreground">{text}</span>
    <Button size="sm" variant="outline" onClick={onClick} disabled={busy}><RefreshCw className="w-3.5 h-3.5 mr-1" />{action}</Button>
  </div>
);

// ---- C · Strengthen -------------------------------------------------------------

export function StrengthenStage({ s, busy, run, stale }: StageProps) {
  const st = s.decisions?.strengthen ?? null;
  const decide = (item: StrengthenItem, d: StrengthenDecision | null) => run("save", { strengthen_decisions: { [item.id]: d } });
  const allDecided = !!st && st.items.every((i) => i.decision);
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">C · Strengthen</h1>
        <p className="text-sm text-muted-foreground">The highest-impact weaknesses from your diagnosis, each with strategic options. Choose one, adapt it, write your own — or keep things as they are. Every decision is saved immediately.</p>
      </div>
      {stale.strengthen && <StaleNotice text="The diagnosis changed after these options were generated. Your own alternatives are kept when you regenerate." action="Regenerate options" busy={!!busy} onClick={() => run("strengthen")} />}
      {!st && (
        <Button onClick={() => run("strengthen")} disabled={!!busy || !s.diagnosis}>
          {busy === "strengthen" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}Find improvement options
        </Button>
      )}
      {st?.items.map((item, idx) => <StrengthenCard key={item.id} n={idx + 1} item={item} busy={!!busy} onDecide={(d) => decide(item, d)} />)}
      {st && (
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" onClick={() => run("strengthen")} disabled={!!busy}>
            {busy === "strengthen" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}Regenerate options
          </Button>
          <Button onClick={() => run("save", { stage: "package" })} disabled={!!busy || !allDecided}>Continue to Package</Button>
          {!allDecided && <span className="text-xs text-muted-foreground">Decide on every item to continue ({st.items.filter((i) => i.decision).length}/{st.items.length}).</span>}
        </div>
      )}
    </section>
  );
}

function StrengthenCard({ n, item, busy, onDecide }: { n: number; item: StrengthenItem; busy: boolean; onDecide: (d: StrengthenDecision | null) => void }) {
  const d = item.decision;
  const [editing, setEditing] = useState<null | { optionId?: string; text: string }>(null);
  return (
    <article className="rounded-xl border border-border bg-card p-4 space-y-3">
      <header className="space-y-1">
        <p className="text-xs text-muted-foreground">{n}. {item.dimension ? DIMENSION_LABELS[item.dimension] : "Offer"}</p>
        <h2 className="text-base font-display font-semibold text-foreground">{item.weakness}</h2>
        {item.whyItMatters && <p className="text-sm text-muted-foreground">Why it matters: {item.whyItMatters}</p>}
      </header>
      <ul className="grid gap-2">
        {item.options.map((o) => {
          const chosen = d?.kind === "option" && d.optionId === o.id;
          return (
            <li key={o.id} className={cn("rounded-lg border p-3 space-y-1.5", chosen ? "border-primary bg-primary/5" : "border-border")}>
              <p className="text-sm font-medium text-foreground">{o.title}</p>
              <p className="text-sm text-foreground">{chosen && d?.kind === "option" ? d.text : o.change}</p>
              {o.why && <p className="text-xs text-muted-foreground">Why: {o.why}</p>}
              {o.tradeoff && <p className="text-xs text-muted-foreground">Trade-off: {o.tradeoff}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant={chosen ? "default" : "outline"} disabled={busy} onClick={() => onDecide({ kind: "option", optionId: o.id, text: o.change })}>
                  {chosen ? <><Check className="w-3.5 h-3.5 mr-1" />Selected</> : "Select"}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing({ optionId: o.id, text: chosen && d?.kind === "option" ? d.text : o.change })}>Edit &amp; select</Button>
              </div>
            </li>
          );
        })}
      </ul>
      {d?.kind === "custom" && !editing && <p className="text-sm rounded-lg border border-primary bg-primary/5 p-3 text-foreground"><span className="font-medium">Your alternative:</span> {d.text}</p>}
      {d?.kind === "rejected" && <p className="text-sm text-muted-foreground">You chose to keep this as it is.</p>}
      {editing ? (
        <div className="space-y-2">
          <Textarea aria-label={`Your version for: ${item.weakness}`} rows={3} maxLength={1200} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !editing.text.trim()} onClick={() => { onDecide(editing.optionId ? { kind: "option", optionId: editing.optionId, text: editing.text } : { kind: "custom", text: editing.text }); setEditing(null); }}>Save decision</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing({ text: d?.kind === "custom" ? d.text : "" })}>Write my own alternative</Button>
          <Button size="sm" variant="ghost" disabled={busy || d?.kind === "rejected"} onClick={() => onDecide({ kind: "rejected" })}><X className="w-3.5 h-3.5 mr-1" />Keep as is</Button>
          {d && <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDecide(null)}>Undo decision</Button>}
        </div>
      )}
    </article>
  );
}

// ---- D · Package ------------------------------------------------------------------

export function PackageStage({ s, busy, run, stale }: StageProps) {
  const pk = s.decisions?.package ?? null;
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => { setValues(Object.fromEntries((pk?.writes ?? []).map((w) => [w.id, w.value]))); }, [pk?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = (pk?.writes ?? []).filter((w) => values[w.id] !== undefined && values[w.id] !== w.value);
  const ex = pk?.extras ?? {};
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">D · Package</h1>
        <p className="text-sm text-muted-foreground">Your decisions turned into one coherent offer, using only this category's Offer Design fields. Edit any value or leave elements out. Nothing is saved to Offer Design until final approval.</p>
      </div>
      {stale.package && <StaleNotice text="Your Strengthen decisions changed after this package was generated." action="Regenerate package" busy={!!busy} onClick={() => run("package")} />}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run("package")} disabled={!!busy} variant={pk ? "outline" : "default"}>
          {busy === "package" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}{pk ? "Regenerate package" : "Generate package"}
        </Button>
        {pk && <Button onClick={() => run("save", { stage: "final" })} disabled={!!busy || dirty.length > 0}>{dirty.length ? "Save your edits first" : "Continue to Final Offer Blueprint"}</Button>}
      </div>
      {pk && (
        <>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {pk.writes.map((w) => (
              <div key={w.id} className={cn("p-3 grid md:grid-cols-[200px_minmax(0,1fr)_auto] gap-2 items-start", !w.include && "opacity-60")}>
                <label htmlFor={`pw-${w.id}`} className="text-xs font-medium text-muted-foreground pt-2">{w.label}{w.edited && <span className="ml-1 text-primary">· edited</span>}</label>
                <Textarea id={`pw-${w.id}`} rows={Math.min(5, Math.max(1, Math.ceil((values[w.id] ?? w.value).length / 80)))} value={values[w.id] ?? w.value}
                  disabled={!w.include} onChange={(e) => setValues((v) => ({ ...v, [w.id]: e.target.value }))} />
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run("save", { package_edits: [{ id: w.id, include: !w.include }] })}>{w.include ? "Leave out" : "Include"}</Button>
              </div>
            ))}
          </div>
          {dirty.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={() => run("save", { package_edits: dirty.map((w) => ({ id: w.id, value: values[w.id] })) })} disabled={!!busy}>Save {dirty.length} edit{dirty.length > 1 ? "s" : ""}</Button>
              <Button variant="ghost" onClick={() => setValues(Object.fromEntries(pk.writes.map((w) => [w.id, w.value])))}>Discard edits</Button>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {ex.pricingRationale && (
              <Box title="Pricing reasoning (estimate)">
                <p className="text-sm text-foreground">{ex.pricingRationale.reasoning}</p>
                {ex.pricingRationale.assumptions?.length > 0 && <p className="text-xs text-muted-foreground">Assumptions: {ex.pricingRationale.assumptions.join(" · ")}</p>}
              </Box>
            )}
            {ex.problemObstacleSolutions?.length > 0 && (
              <Box title="Problem → obstacle → solution">
                <ul className="space-y-1.5 text-sm text-foreground">{ex.problemObstacleSolutions.map((p: any, i: number) => <li key={i}>{p.problem} → <span className="text-muted-foreground">{p.obstacle}</span> → {p.solution}</li>)}</ul>
              </Box>
            )}
            {ex.positioning?.statement && <Box title="Positioning (not yet verified)"><p className="text-sm text-foreground">{ex.positioning.statement}</p></Box>}
            {ex.bonusRationales?.length > 0 && <Box title="Why these bonuses"><ul className="space-y-1 text-sm text-foreground">{ex.bonusRationales.map((b: any, i: number) => <li key={i}><span className="font-medium">{b.bonusName}:</span> {b.reason}</li>)}</ul></Box>}
            {ex.assumptions?.length > 0 && <Box title="Assumptions to validate"><ul className="space-y-1 text-sm text-foreground">{ex.assumptions.map((a: any, i: number) => <li key={i}>{a.statement} <span className="text-xs text-muted-foreground">— {a.howToValidate}</span></li>)}</ul></Box>}
          </div>
        </>
      )}
    </section>
  );
}

// ---- E · Final Offer Blueprint -------------------------------------------------------

export function FinalStage({ s, busy, run, stale, onApprove, approving, conflicts, approveError, onOpenOffer }: StageProps & {
  onApprove: (applyToLatest: boolean) => void; approving: boolean; conflicts: string[] | null; approveError: string | null; onOpenOffer: () => void;
}) {
  const fin = s.decisions?.final ?? null;
  const pk = s.decisions?.package ?? null;
  const completed = s.status === "completed";
  const before = s.diagnosis?.profile ?? null;
  const rows = fin ? compareProfiles(before, fin.profile) : [];
  const rubricMismatch = !!before && !!fin && before.rubricVersion !== fin.profile.rubricVersion;
  const included = (pk?.writes ?? []).filter((w) => w.include);
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">E · Final Offer Blueprint</h1>
        <p className="text-sm text-muted-foreground">The complete proposed offer, re-assessed with the same strict criteria as the diagnosis. Scores don't have to go up — changes are explained either way.</p>
      </div>
      {completed && (
        <div role="status" className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex flex-wrap items-center gap-3 text-sm">
          <Check className="w-4 h-4 text-primary" /><span className="flex-1 text-foreground">Approved and saved to Offer Design{s.completed_at ? ` on ${new Date(s.completed_at).toLocaleString()}` : ""}. This analysis stays here for review.</span>
          {s.result_offer_id && <Button size="sm" onClick={onOpenOffer}>Open the finished offer</Button>}
        </div>
      )}
      {stale.final && !completed && <StaleNotice text="The package changed after this assessment." action="Re-assess" busy={!!busy} onClick={() => run("final_assessment")} />}
      {!completed && (
        <Button onClick={() => run("final_assessment")} disabled={!!busy || !pk} variant={fin ? "outline" : "default"}>
          {busy === "final_assessment" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}{fin ? "Re-assess the final offer" : "Assess the final offer"}
        </Button>
      )}
      {fin && (
        <>
          <Box title="Proposed offer">
            <dl className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              {included.map((w) => <><dt key={`${w.id}-l`} className="text-muted-foreground">{w.label}</dt><dd key={`${w.id}-v`} className="text-foreground whitespace-pre-wrap">{w.value}</dd></>)}
            </dl>
            {pk?.extras?.audience?.audience && <p className="text-sm text-foreground pt-2"><span className="text-muted-foreground">Audience:</span> {pk.extras.audience.audience}</p>}
            {pk?.extras?.pricingRationale?.reasoning && <p className="text-sm text-foreground"><span className="text-muted-foreground">Pricing reasoning (estimate):</span> {pk.extras.pricingRationale.reasoning}</p>}
          </Box>
          <Box title="Value Equation — Before / After">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground text-left"><th className="font-normal py-1">Dimension</th><th className="font-normal">Before</th><th className="font-normal">After</th><th className="font-normal">Change</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.dimension} className="border-t border-border">
                    <td className="py-1.5 text-foreground">{DIMENSION_LABELS[r.dimension]}</td>
                    <td>{r.before ?? "not assessed"}</td><td>{r.after ?? "not assessed"}</td>
                    <td className={cn(r.delta != null && r.delta > 0 && "text-primary", r.delta != null && r.delta < 0 && "text-destructive")}>{r.delta == null ? "—" : r.delta > 0 ? `+${r.delta}` : r.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rubricMismatch && <p className="text-xs text-destructive">The Before score used an earlier scoring version (v{before!.rubricVersion}; now v{VALUE_RUBRIC_VERSION}). Re-run the diagnosis for a like-for-like comparison.</p>}
            {fin.scoreChanges && <p className="text-sm text-foreground">{fin.scoreChanges}</p>}
            <p className="text-xs text-muted-foreground">{VALUE_PROFILE_DISCLAIMER}</p>
          </Box>
          <div className="grid md:grid-cols-3 gap-4">
            <Box title="Key decisions"><List items={fin.keyDecisions} /></Box>
            <Box title="Remaining assumptions"><List items={fin.remainingAssumptions} empty="None listed." /></Box>
            <Box title="Recommended next steps"><List items={fin.nextSteps} /></Box>
          </div>
          {!completed && (
            <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3">
              <h2 className="text-base font-display font-semibold text-foreground">Review and approve</h2>
              <p className="text-sm text-muted-foreground">
                {s.mode === "new" ? "Approving creates this as a new offer in Offer Design." : "Approving applies the included elements to this offer. Fields not in the package, hidden fields, list items, offer links and other offers stay untouched."}
              </p>
              {conflicts && conflicts.length > 0 && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2 text-sm">
                  <p className="text-foreground">Since this Builder session started, these fields were changed in Offer Design: <span className="font-medium">{conflicts.map((c) => c.replace(/^offer_stack\./, "")).join(", ")}</span>. Approving would replace those newer edits with the package values.</p>
                  <Button size="sm" variant="destructive" disabled={approving} onClick={() => onApprove(true)}>Apply anyway (replace those fields)</Button>
                </div>
              )}
              {approveError && <p role="alert" className="text-sm text-destructive">{approveError}</p>}
              <Button onClick={() => onApprove(false)} disabled={approving || !!busy || stale.final || stale.package}>
                {approving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}Approve and save to Offer Design
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-2"><h2 className="text-sm font-display font-semibold text-foreground">{title}</h2>{children}</div>
);
const List = ({ items, empty = "—" }: { items: string[]; empty?: string }) =>
  items.length ? <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">{items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>;
