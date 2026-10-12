// Builder Stages C–E working areas (presentation only; persistence via `run`).
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DIMENSION_LABELS, VALUE_PROFILE_DISCLAIMER, VALUE_RUBRIC_VERSION } from "@shared/offerIntelligence/valueEquation";
import type { StrengthenDecision, StrengthenItem } from "@shared/offerIntelligence/builderStages";
import type { BuilderSession, BuilderAction } from "@/lib/offers/offerBuilder";
import { cn } from "@/lib/utils";
import ValueProfileChart from "./ValueProfileChart";
import { humanizeCriteria, splitScoreChanges, CRITERION_LABELS } from "@/lib/offers/packagePresentation";
import type { ValueProfile } from "@shared/offerIntelligence/valueEquation";
import { VALUE_DIMENSIONS } from "@shared/offerIntelligence/valueEquation";
import { PackageEditor, FinalOfferPresentation } from "./PackagePresentation";
import { ECOSYSTEM_TIERS } from "@/components/business-blueprint/offerDesignTypes";

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
      <StageHeader stage="strengthen" />
      {stale.strengthen && <StaleNotice text="The diagnosis changed after these options were generated. Your own alternatives are kept when you regenerate." action="Regenerate options" busy={!!busy} onClick={() => run("strengthen")} />}
      {!st && (
        <Button onClick={() => run("strengthen")} disabled={!!busy || !s.diagnosis}>
          {busy === "strengthen" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}Find improvement options
        </Button>
      )}
      {st && st.items.length > 0 && <StrengthenTabs items={st.items} busy={!!busy} decide={decide} />}
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
    <article className="space-y-4">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Area {n} · {item.dimension ? DIMENSION_LABELS[item.dimension] : "Offer"}</p>
        <h2 className="text-lg font-display font-semibold text-foreground">{item.weakness}</h2>
        {item.whyItMatters && <p className="text-sm text-muted-foreground leading-relaxed"><span className="font-medium text-foreground">Why it matters: </span>{item.whyItMatters}</p>}
      </header>
      <h3 className="text-sm font-semibold text-foreground">Choose an improvement</h3>
      <ul className="grid gap-3">
        {item.options.map((o) => {
          const chosen = d?.kind === "option" && d.optionId === o.id;
          return (
            <li key={o.id} className={cn("rounded-xl border p-4 space-y-3 transition-colors", chosen ? "border-2 border-primary bg-primary/5" : "border-border bg-background")}>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-base font-display font-semibold text-foreground">{o.title}</p>
                {chosen && <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground"><Check className="w-3 h-3" />Your choice</span>}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">The improvement</p>
                <p className="text-sm text-foreground leading-relaxed">{chosen && d?.kind === "option" ? d.text : o.change}</p>
              </div>
              {(o.why || o.tradeoff) && (
                <details className="group rounded-lg bg-muted/40 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-primary">Why this helps{o.tradeoff ? " · What to consider" : ""}</summary>
                  <div className="pt-2 space-y-2 text-sm leading-relaxed text-foreground">
                    {o.why && <div><p className="font-medium">Why this helps</p><p className="text-muted-foreground">{o.why}</p></div>}
                    {o.tradeoff && <div><p className="font-medium">What to consider</p><p className="text-muted-foreground">{o.tradeoff}</p></div>}
                  </div>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
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
  const selected = s.decisions?.strengthen?.items.filter((i) => i.decision && i.decision.kind !== "rejected").length ?? 0;
  return (
    <section className="space-y-5">
      <StageHeader stage="package" />
      {stale.package && <StaleNotice text="Your Strengthen decisions changed after this package was generated." action="Regenerate package" busy={!!busy} onClick={() => run("package")} />}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run("package")} disabled={!!busy} variant={pk ? "outline" : "default"}>
          {busy === "package" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}{pk ? "Regenerate package" : "Generate package"}
        </Button>
        {pk && <Button onClick={() => run("save", { stage: "final" })} disabled={!!busy || dirty.length > 0}>{dirty.length ? "Save your edits first" : "Continue to Final Offer Blueprint"}</Button>}
      </div>
      {pk && (
        <>
          <p className="text-xs text-muted-foreground">
            Everything below is <span className="font-medium text-foreground">proposed</span> by the strategist from your Blueprint{s.mode === "existing" ? ", this offer" : ""} and your Strengthen decisions{selected ? ` (${selected} selected improvement${selected > 1 ? "s" : ""})` : ""}. Values you change are marked "Edited by you".
          </p>
          <PackageEditor writes={pk.writes} values={values} busy={!!busy} extras={ex} tierLabel={ECOSYSTEM_TIERS.find((t) => t.id === s.tier)?.label ?? s.tier}
            onChange={(id, v) => setValues((cur) => ({ ...cur, [id]: v }))}
            onToggle={(ids, include) => run("save", { package_edits: ids.map((id) => ({ id, include })) })} />
          {dirty.length > 0 && (
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-card p-3 shadow-lg">
              <span className="text-sm text-foreground flex-1">{dirty.length} unsaved edit{dirty.length > 1 ? "s" : ""}</span>
              <Button onClick={() => run("save", { package_edits: dirty.map((w) => ({ id: w.id, value: values[w.id] })) })} disabled={!!busy}>Save {dirty.length} edit{dirty.length > 1 ? "s" : ""}</Button>
              <Button variant="ghost" onClick={() => setValues(Object.fromEntries(pk.writes.map((w) => [w.id, w.value])))}>Discard edits</Button>
            </div>
          )}
          {ex.assumptions?.length > 0 && <Box title="Assumptions to validate"><ul className="space-y-1 text-sm text-foreground">{ex.assumptions.map((a: any, i: number) => <li key={i}>{a.statement} <span className="text-xs text-muted-foreground">— {a.howToValidate}</span></li>)}</ul></Box>}
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
  const rubricMismatch = !!before && !!fin && before.rubricVersion !== fin.profile.rubricVersion;
  return (
    <section className="space-y-5">
      <StageHeader stage="final" />
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
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-1">How compelling is your offer? Before / After</h2>
            <p className="text-xs text-muted-foreground mb-4">Dashed = diagnosis, solid = proposed final offer. Select a dimension for the reasoning.</p>
            <ValueProfileChart before={before} after={fin.profile} />
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <ScoreChanges before={before} after={fin.profile} text={fin.scoreChanges} />
              {rubricMismatch && <p className="text-xs text-destructive">The Before score used an earlier scoring version (v{before!.rubricVersion}; now v{VALUE_RUBRIC_VERSION}). Re-run the diagnosis for a like-for-like comparison.</p>}
              <p className="text-xs text-muted-foreground">{VALUE_PROFILE_DISCLAIMER}</p>
            </div>
          </div>
          <FinalOfferPresentation writes={pk?.writes ?? []} tierLabel={ECOSYSTEM_TIERS.find((t) => t.id === s.tier)?.label ?? s.tier} extras={pk?.extras ?? {}} />
          <div className="grid md:grid-cols-3 gap-4">
            <Box title="Key strategic decisions"><List items={fin.keyDecisions.map(humanizeCriteria)} /></Box>
            <Box title="Assumptions to validate"><List items={fin.remainingAssumptions.map(humanizeCriteria)} empty="None listed." /></Box>
            <Box title="Recommended next steps"><List items={fin.nextSteps.map(humanizeCriteria)} /></Box>
          </div>
          {!completed && (
            <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-4 sm:p-5 space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Review and approve</h2>
              <p className="text-sm text-foreground">Approving saves the included elements to Offer Design — this is the first moment anything is written there. Left-out elements are not saved.</p>
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
  <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3"><h2 className="text-base font-display font-semibold text-foreground">{title}</h2>{children}</div>
);
const List = ({ items, empty = "—" }: { items: string[]; empty?: string }) =>
  items.length ? <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-foreground">{items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>;


/** Per-dimension Before/After explanation built from the existing assessment (display only). */
function ScoreChanges({ before, after, text }: { before: ValueProfile | null; after: ValueProfile; text: string }) {
  const parts = splitScoreChanges(text);
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-display font-semibold text-foreground">What changed per dimension</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {VALUE_DIMENSIONS.map((d) => {
          const b = before?.dimensions[d]?.score ?? null, a = after.dimensions[d]?.score ?? null;
          const delta = a != null && b != null ? Math.round((a - b) * 10) / 10 : null;
          const dim = after.dimensions[d];
          const crit = [...(dim?.strengths ?? []), ...(dim?.weaknesses ?? []), ...(dim?.unknown ?? [])];
          return (
            <div key={d} className="rounded-lg border border-border bg-background p-3 space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">{DIMENSION_LABELS[d]}</span>
                <span className="text-xs text-muted-foreground">{b ?? "not assessed"} → {a ?? "not assessed"}</span>
                {delta != null && <span className={cn("ml-auto text-xs font-semibold", delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>{delta > 0 ? `+${delta}` : delta}</span>}
              </div>
              {parts?.[d] && <p className="text-sm text-foreground">{parts[d]}</p>}
              {crit.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs text-primary">Detailed reasoning</summary>
                  <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                    {crit.map((c) => <li key={c.criterionId}><span className="font-medium">{CRITERION_LABELS[c.criterionId] ?? "Criterion"}</span> <span className="text-muted-foreground">({c.verdict})</span>{c.reasoning ? ` — ${humanizeCriteria(c.reasoning)}` : ""}</li>)}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
      {!parts && text && <p className="text-sm text-foreground">{humanizeCriteria(text)}</p>}
    </div>
  );
}


const STAGE_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  understand: { title: "Let's understand your offer", subtitle: "We'll review what we know about your idea, check our assumptions, and fill in any important gaps." },
  diagnose: { title: "Let's find out how strong your offer is", subtitle: "We'll evaluate what makes your offer attractive and identify where it could be stronger." },
  strengthen: { title: "Let's make your offer more compelling", subtitle: "Explore practical improvements, compare your options, and decide what works best for your business." },
  package: { title: "Let's bring your offer together", subtitle: "Review and refine the complete offer we've built from your decisions." },
  final: { title: "Review your improved offer", subtitle: "See how your offer has evolved, review the final details, and approve it when you're ready." },
};
/** Shared stage heading (level 1) + subtitle for all five Builder stages. */
export const StageHeader = ({ stage }: { stage: keyof typeof STAGE_HEADINGS }) => (
  <div className="space-y-1.5">
    <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">{STAGE_HEADINGS[stage].title}</h1>
    <p className="text-base text-muted-foreground max-w-prose">{STAGE_HEADINGS[stage].subtitle}</p>
  </div>
);


/** Friendly tab label from the improvement content; falls back to the Value Equation dimension. */
export function improvementLabel(item: Pick<StrengthenItem, "weakness" | "dimension">): string {
  const t = `${item.weakness ?? ""}`.toLowerCase();
  if (/(proof|testimonial|trust|credib|track record|case stud)/.test(t)) return "Build trust";
  if (/(guarantee|risk)/.test(t)) return "Reduce buyer risk";
  if (/(structure|duration|framework|method|delivery mechanism|undefined program)/.test(t)) return "Clarify the program";
  if (/(fast|quick|first win|timeline|milestone|speed)/.test(t)) return "Deliver results faster";
  if (/(effort|easy|easier|tool|template|support|steps)/.test(t)) return "Make it easier";
  if (/(outcome|result|promise|transformation)/.test(t)) return "Sharpen the promise";
  const byDim: Record<string, string> = { perceived_likelihood: "Build trust", speed_to_value: "Deliver results faster", ease_of_achievement: "Make it easier", dream_outcome: "Sharpen the promise" };
  return (item.dimension && byDim[item.dimension]) || "Improve the offer";
}

function StrengthenTabs({ items, busy, decide }: { items: StrengthenItem[]; busy: boolean; decide: (i: StrengthenItem, d: StrengthenDecision | null) => void }) {
  const [active, setActive] = useState(() => (items.find((i) => !i.decision) ?? items[0]).id);
  useEffect(() => { if (!items.some((i) => i.id === active)) setActive(items[0].id); }, [items, active]);
  const seen = new Map<string, number>();
  const labels = items.map((i) => { const l = improvementLabel(i); const n = (seen.get(l) ?? 0) + 1; seen.set(l, n); return n > 1 ? `${l} (${n})` : l; });
  const idx = Math.max(0, items.findIndex((i) => i.id === active));
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
    e.preventDefault(); const n = items[(i + d + items.length) % items.length]; setActive(n.id); document.getElementById(`imptab-${n.id}`)?.focus();
  };
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div role="tablist" aria-label="Improvement areas" className="flex overflow-x-auto border-b border-border bg-muted/30">
        {items.map((it, i) => (
          <button key={it.id} id={`imptab-${it.id}`} role="tab" type="button" aria-selected={active === it.id} aria-controls={`imppanel-${it.id}`} tabIndex={active === it.id ? 0 : -1}
            onClick={() => setActive(it.id)} onKeyDown={(e) => onKey(e, i)}
            className={cn("shrink-0 flex-1 min-w-[140px] px-4 py-3 text-left border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active === it.id ? "border-primary bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
            <span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
              {it.decision ? <Check className="w-3.5 h-3.5 text-primary" aria-label="Decided" /> : <span className="h-2 w-2 rounded-full bg-destructive/70" aria-label="Needs a decision" />}
              {labels[i]}
            </span>
            <span className="block text-[11px] font-normal text-muted-foreground">{it.dimension ? DIMENSION_LABELS[it.dimension] : "Offer"} · {it.decision ? "Decided" : "Needs a decision"}</span>
          </button>
        ))}
      </div>
      {/* All panels stay mounted (hidden) so in-progress edits survive tab switches. */}
      {items.map((it, i) => (
        <div key={it.id} role="tabpanel" id={`imppanel-${it.id}`} aria-labelledby={`imptab-${it.id}`} hidden={active !== it.id} className="p-4 sm:p-6 space-y-4">
          <StrengthenCard n={i + 1} item={it} busy={busy} onDecide={(d) => decide(it, d)} />
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            {i > 0 ? <Button size="sm" variant="ghost" onClick={() => setActive(items[i - 1].id)}>← {labels[i - 1]}</Button> : <span />}
            {i < items.length - 1 && <Button size="sm" variant="outline" onClick={() => setActive(items[i + 1].id)}>Next: {labels[i + 1]} →</Button>}
          </div>
        </div>
      ))}
      <span className="sr-only">{idx + 1} of {items.length}</span>
    </div>
  );
}
