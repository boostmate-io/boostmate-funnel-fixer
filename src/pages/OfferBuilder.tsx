// Irresistible Offer Builder — full-screen workspace (Stages A–E + Builder chat).
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Lightbulb, Loader2, Lock, MessagesSquare, Sparkles, AlertTriangle, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ValueProfileChart from "@/components/offer-intelligence/ValueProfileChart";
import { BUILDER_STAGES, stageState, type BuilderStage } from "@shared/offerIntelligence/builderSession";
import { staleStages, strengthenComplete } from "@shared/offerIntelligence/builderStages";
import { StrengthenStage, PackageStage, FinalStage } from "@/components/offer-intelligence/BuilderStages";
import BuilderChatPanel from "@/components/offer-intelligence/BuilderChatPanel";
import { useAuth } from "@/contexts/AuthContext";
import { DIMENSION_LABELS } from "@shared/offerIntelligence/valueEquation";
import { OFFER_TIER_COACH_BRIEFS } from "@shared/blueprintRegistry";
import { ECOSYSTEM_TIERS } from "@/components/business-blueprint/offerDesignTypes";
import { approveBuilderSession, builderAction, builderErrorMessage, BuilderError, loadBuilderSession, type BuilderAction, type BuilderSession } from "@/lib/offers/offerBuilder";
import { cn } from "@/lib/utils";

export default function OfferBuilder() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [s, setS] = useState<BuilderSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | BuilderAction>(null);
  const { user } = useAuth();
  const [approving, setApproving] = useState(false);
  const [conflicts, setConflicts] = useState<string[] | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<BuilderStage>("understand");
  // Strategist panel: open by default on wide screens only.
  const [panelOpen, setPanelOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1440);

  // `followStage`: jump the view to the session's saved stage (initial load / navigation / generation).
  // Plain saves (edits, toggles, decisions) keep the user on the stage they are viewing.
  const hydrate = useCallback((next: BuilderSession, followStage = true) => {
    setS(next);
    setIdea(next.intake?.idea ?? "");
    setCorrections(next.understanding?.corrections ?? {});
    setDirty(false);
    if (followStage) setView(next.stage);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    loadBuilderSession(sessionId).then((r) => { if (r) hydrate(r); setLoading(false); });
  }, [sessionId, hydrate]);

  const run = async (action: BuilderAction, extra: Record<string, unknown> = {}) => {
    if (!s) return;
    setBusy(action); setError(null);
    const follow = action !== "save" || "stage" in extra;
    // Pure stage moves carry no user content, so a version conflict (session saved in
    // another tab) is safely retried once on the latest version. Everything else
    // reloads and asks the user to retry, so newer work is never overwritten.
    const navOnly = action === "save" && Object.keys(extra).length === 1 && "stage" in extra;
    try {
      const { session } = await builderAction(s, action, extra);
      hydrate(session, follow);
    } catch (e) {
      const err = e as BuilderError;
      const fresh = err.code === "conflict" || err.code === "session_closed" ? (err.session ?? await loadBuilderSession(s.id).catch(() => null)) : null;
      if (navOnly && err.code === "conflict" && fresh && fresh.status === "active") {
        try { const { session } = await builderAction(fresh, action, extra); hydrate(session, true); return; }
        catch (e2) { const er2 = e2 as BuilderError; setError(builderErrorMessage(er2.code)); const f2 = await loadBuilderSession(s.id).catch(() => null); if (f2) hydrate(f2, false); return; }
      }
      setError(builderErrorMessage(err.code));
      if (fresh) hydrate(fresh, false);
    } finally { setBusy(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!s) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <p className="text-muted-foreground">This Builder session can't be found.</p>
      <Button variant="outline" onClick={() => navigate("/dashboard?module=business-blueprint")}>Back to Offer Design</Button>
    </div>
  );

  const tierLabel = ECOSYSTEM_TIERS.find((t) => t.id === s.tier)?.label ?? s.tier;
  const brief = s.tier !== "core" ? (OFFER_TIER_COACH_BRIEFS as any)[s.tier] : null;
  const u = s.understanding;
  const d = s.diagnosis;
  const canDiagnose = !!u && !!s.context_confirmed_at;

  const saveCorrections = () => run("save", { corrections });
  const readOnly = s.status !== "active";
  const doneCount = BUILDER_STAGES.filter((st) => stageState(s, st.id) === "completed").length;
  const guidanceText: Record<BuilderStage, string> = {
    understand: "A strong offer starts from the right audience and one clear transformation. Correct anything assumed — the diagnosis treats your answers as facts.",
    diagnose: s.mode === "new" ? "Each criterion is assessed separately; unknown is never counted as weak. This assesses your idea, not a proven offer." : "Each criterion is assessed separately; unknown information is never counted as weak.",
    strengthen: "Pick the option that fits your buyer and your capacity — or write your own. More deliverables rarely mean more value; clarity, speed and certainty usually do.",
    package: "Only this category's Offer Design fields are filled. Prices are estimates — validate them with real buyers.",
    final: "Nothing changes in Offer Design until you approve. Scores can go down as well as up.",
  };
  const stale = staleStages(d, s.decisions);
  const fin = s.decisions?.final ?? null;
  const viewable = (id: BuilderStage) =>
    id === "understand" || (id === "diagnose" && (canDiagnose || !!d)) || (id === "strengthen" && !!d) ||
    (id === "package" && (!!s.decisions?.package || (!!d && strengthenComplete(s.decisions?.strengthen)))) ||
    (id === "final" && (!!fin || !!s.draft_design));
  const order = BUILDER_STAGES.map((x) => x.id);
  const idx = (id: BuilderStage) => order.indexOf(id);
  // Going back only changes the view — later work and the saved stage stay untouched.
  // Going forward past the saved stage is persisted (server re-checks the stage gates).
  const goTo = (id: BuilderStage) => {
    setView(id);
    if (!readOnly && idx(id) > idx(s.stage) && id !== "understand" && id !== "diagnose") run("save", { stage: id });
  };
  const prevStage = order[idx(view) - 1] as BuilderStage | undefined;
  const nextStage = order[idx(view) + 1] as BuilderStage | undefined;
  const laterWork = (id: BuilderStage) =>
    (id === "understand" && !!d) || (id === "diagnose" && !!s.decisions?.strengthen) ||
    (id === "strengthen" && !!s.decisions?.package) || (id === "package" && !!fin);
  const labelOf = (id: BuilderStage) => BUILDER_STAGES.find((x) => x.id === id)?.label ?? id;
  const openOffer = () => navigate(`/dashboard?module=business-blueprint&openOffer=${s.result_offer_id ?? s.offer_id ?? ""}`);
  const approve = async (applyToLatest: boolean) => {
    if (!user || approving) return;
    setApproving(true); setApproveError(null);
    try {
      const r = await approveBuilderSession(s, { applyToLatest, userId: user.id });
      if (r.ok) { setConflicts(null); hydrate(r.session); setView("final"); }
      else if ("conflicts" in r) setConflicts(r.conflicts);
      else if ("error" in r) {
        setApproveError(r.error === "no_blueprint" ? "Open your Business Blueprint once before saving offers." : builderErrorMessage(r.error));
        const fresh = await loadBuilderSession(s.id); if (fresh) setS(fresh);
      }
    } catch (e) {
      // e.g. 409 conflict from approval_begin when the session was saved elsewhere:
      // show a message and load the latest version — never leave the rejection unhandled.
      const err = e as BuilderError;
      setApproveError(builderErrorMessage(err?.code));
      const fresh = err?.session ?? await loadBuilderSession(s.id).catch(() => null);
      if (fresh) hydrate(fresh, false);
    } finally { setApproving(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard?module=business-blueprint")}><ArrowLeft className="w-4 h-4 mr-1" /> Offer Design</Button>
        <div className="min-w-0 hidden md:block">
          <p className="text-xs text-muted-foreground">Irresistible Offer Builder · {tierLabel} · {s.mode === "new" ? "New offer" : "Strengthening an existing offer"}</p>
        </div>
        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5" aria-live="polite">
          {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{busy === "save" ? "Saving…" : "Working…"}</> : <><Check className="w-3.5 h-3.5 text-primary" />Saved<span className="hidden sm:inline"> · {new Date(s.updated_at).toLocaleTimeString()}</span></>}
        </span>
        <Button size="sm" variant={panelOpen ? "secondary" : "outline"} onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen} aria-controls="builder-strategist">
          <MessagesSquare className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Offer strategist</span>
        </Button>
      </header>

      <div className={cn("flex-1 grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)] gap-0 min-w-0", panelOpen && "xl:grid-cols-[232px_minmax(0,1fr)_380px]")}>
        {/* Stages */}
        <nav aria-label="Builder stages" className="min-w-0 border-b lg:border-b-0 lg:border-r border-border p-3 lg:p-4 bg-card/50 lg:sticky lg:top-0 lg:self-start lg:h-[calc(100vh-57px)]">
          <div className="hidden lg:block mb-4 px-1 space-y-1.5">
            <div className="flex justify-between text-xs"><span className="font-medium text-foreground">Progress</span><span className="text-muted-foreground">{doneCount} of {BUILDER_STAGES.length}</span></div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={BUILDER_STAGES.length} aria-valuenow={doneCount}>
              <div className="h-full bg-primary transition-all" style={{ width: `${(doneCount / BUILDER_STAGES.length) * 100}%` }} />
            </div>
          </div>
          <ol className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-1 px-1">
          {BUILDER_STAGES.map((st, i) => {
            const state = stageState(s, st.id);
            const clickable = viewable(st.id);
            const isStale = (st.id === "strengthen" && stale.strengthen) || (st.id === "package" && stale.package) || (st.id === "final" && stale.final);
            return (
              <li key={st.id} className="shrink-0 lg:shrink">
              <button type="button" disabled={!clickable || !!busy} onClick={() => goTo(st.id)}
                aria-current={view === st.id ? "step" : undefined}
                className={cn("w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm whitespace-nowrap lg:whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === st.id ? "bg-primary/10 text-foreground font-semibold ring-1 ring-primary/30" : state === "completed" ? "text-foreground" : "text-muted-foreground",
                  clickable ? "hover:bg-muted/60" : "cursor-not-allowed opacity-50")}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  state === "completed" ? "bg-primary text-primary-foreground border-primary" : view === st.id || state === "active" ? "border-primary text-primary bg-background" : "border-border bg-background")}>
                  {state === "completed" ? <Check className="w-3.5 h-3.5" /> : !clickable ? <Lock className="w-3 h-3" /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block leading-tight">{st.label}</span>
                  <span className="hidden lg:block text-[11px] font-normal text-muted-foreground">{isStale ? "" : state === "completed" ? "Completed" : !clickable ? "Locked" : view === st.id ? "In progress" : "Available"}</span>
                </span>
                {isStale && <span className="text-[10px] font-medium text-destructive" title="Needs reassessment">Reassess</span>}
              </button>
              </li>
            );
          })}
          </ol>
        </nav>

        {/* Working area */}
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7 space-y-5 min-w-0 w-full max-w-[1100px] mx-auto">
          <StageGuidance text={guidanceText[view]} onAsk={() => setPanelOpen(true)} panelOpen={panelOpen} />
          {(view === "strengthen" || view === "package") && d && (
            <details className="group rounded-xl border border-border bg-card">
              <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-display font-semibold text-foreground">Value Profile</span>
                <span className="text-xs text-muted-foreground">Diagnosis scores — not re-scored until the final assessment</span>
                <span className="flex flex-wrap gap-3 text-xs text-foreground ml-auto">
                  {Object.values(d.profile.dimensions).map((x) => <span key={x.dimension}><span className="text-muted-foreground">{DIMENSION_LABELS[x.dimension]}</span> {x.score ?? "–"}</span>)}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border p-4"><ValueProfileChart variant="compact" before={d.profile} /></div>
            </details>
          )}
          {readOnly && s.status === "completed" && <p role="status" className="text-sm rounded-lg border border-border bg-muted/40 p-3 text-foreground">This session is completed — you're reviewing the final analysis. Start a new Builder session from Offer Design to make further changes.</p>}
          {!readOnly && laterWork(view) && (
            <p role="status" className="text-xs rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground">
              You're reviewing an earlier stage. Viewing changes nothing. If you change answers or decisions here, the later stages will be marked "Reassess" and must be regenerated before you can approve.
            </p>
          )}
          {error && <p role="alert" className="text-sm text-destructive flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{error}</p>}

          <fieldset disabled={readOnly} className="space-y-6 min-w-0">
          {view === "understand" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">A · Understand</h1>
                <p className="text-sm text-muted-foreground">We gather what's already known from your Blueprint{s.mode === "existing" ? " and this offer" : ""}, then you correct assumptions and fill gaps.</p>
              </div>
              {!d && (
                <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium text-foreground">How we assess offers:</span> the Value Equation — a bigger Dream Outcome and higher Perceived Likelihood raise value; faster Speed to Value and easier Ease of Achievement do too. Your Value Profile appears after the diagnosis.
                </p>
              )}
              {s.mode === "new" && (
                <div className="space-y-1.5">
                  <label htmlFor="idea" className="text-sm font-medium text-foreground">Your offer idea</label>
                  <Textarea id="idea" rows={3} maxLength={1500} value={idea} onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g. A 6-week group program that helps new yoga teachers fill their first weekly class." />
                </div>
              )}
              <Button onClick={() => run("understand", s.mode === "new" ? { intake: { idea } } : {})} disabled={!!busy || (s.mode === "new" && !idea.trim())}>
                {busy === "understand" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {u ? "Re-analyse context" : "Analyse context"}
              </Button>

              {u && (
                <div className="grid gap-4">
                  <Group title="Known" tone="known" empty="Nothing confirmed yet.">
                    {u.known.map((k) => <li key={k.id} className="text-sm text-foreground">{k.text}</li>)}
                  </Group>
                  <Group title="Assumed — correct anything that's wrong" tone="assumed" empty="No assumptions.">
                    {u.assumed.map((a) => (
                      <li key={a.id} className="space-y-1">
                        <p className="text-sm text-foreground">{a.text}</p>
                        {a.why && <p className="text-xs text-muted-foreground">Why: {a.why}</p>}
                        <Input aria-label={`Correction for: ${a.text}`} placeholder="Leave empty if correct, or write the correction"
                          value={corrections[a.id] ?? ""} onChange={(e) => { setCorrections((c) => ({ ...c, [a.id]: e.target.value })); setDirty(true); }} />
                      </li>
                    ))}
                  </Group>
                  <Group title="Missing — answer what you can" tone="missing" empty="Nothing important is missing.">
                    {u.missing.map((m) => (
                      <li key={m.id} className="space-y-1">
                        <p className="text-sm text-foreground">{m.question || m.text}</p>
                        <Input aria-label={m.question || m.text} placeholder="Your answer (optional)"
                          value={corrections[m.id] ?? ""} onChange={(e) => { setCorrections((c) => ({ ...c, [m.id]: e.target.value })); setDirty(true); }} />
                      </li>
                    ))}
                  </Group>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={saveCorrections} disabled={!!busy || !dirty}>Save answers</Button>
                    {s.context_confirmed_at && !dirty ? (
                      <Button onClick={() => setView("diagnose")}>Continue to diagnosis</Button>
                    ) : (
                      <Button disabled={!!busy || dirty} onClick={() => run("save", { confirm: true })}>
                        {dirty ? "Save your answers first" : "Confirm working context"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {view === "diagnose" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">B · Diagnose</h1>
                <p className="text-sm text-muted-foreground">Each Value Equation criterion is assessed separately; unknown information is never counted as weak.</p>
              </div>
              <Button onClick={() => run("diagnose")} disabled={!!busy || !canDiagnose}>
                {busy === "diagnose" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {d ? "Run diagnosis again" : "Run diagnosis"}
              </Button>
              {!canDiagnose && <p className="text-sm text-muted-foreground">Confirm the working context in Stage A first.</p>}
              {d && (
                <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                  <h2 className="text-base font-display font-semibold text-foreground mb-1">Value Profile</h2>
                  <p className="text-xs text-muted-foreground mb-4">{s.mode === "new" ? "Initial assessment of your offer idea." : "Assessment of the offer as it is today."}</p>
                  <ValueProfileChart before={d.profile} />
                </div>
              )}
              {d && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Card title="Strengths">{d.strengths.length ? <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">{d.strengths.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm text-muted-foreground">None identified yet.</p>}</Card>
                  <Card title="Weaknesses">{d.weaknesses.length ? <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">{d.weaknesses.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-sm text-muted-foreground">None identified.</p>}</Card>
                  <Card title="Top 3 improvement opportunities"><ol className="list-decimal pl-5 space-y-1 text-sm text-foreground">{d.topImprovements.map((x) => <li key={x}>{x}</li>)}</ol></Card>
                  <Card title="Not assessed / unknown">
                    {Object.values(d.profile.dimensions).some((x) => x.unknown.length) ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {Object.values(d.profile.dimensions).filter((x) => x.unknown.length).map((x) => (
                          <li key={x.dimension}>{DIMENSION_LABELS[x.dimension]}: {x.unknown.length} of {x.totalCount} criteria unknown{x.status === "not_assessed" ? " — not assessed" : ""}</li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">Every criterion could be assessed.</p>}
                  </Card>

                </div>
              )}
            </section>
          )}
          {view === "diagnose" && d && (
            <div className="flex gap-2"><Button onClick={() => goTo("strengthen")} disabled={!!busy}>Continue to Strengthen</Button></div>
          )}
          </fieldset>
          {view === "strengthen" && <fieldset disabled={readOnly} className="min-w-0"><StrengthenStage s={s} busy={busy} run={run} stale={stale} /></fieldset>}
          {view === "package" && <fieldset disabled={readOnly} className="min-w-0"><PackageStage s={s} busy={busy} run={run} stale={stale} /></fieldset>}
          {view === "final" && <FinalStage s={s} busy={busy} run={run} stale={stale} onApprove={approve} approving={approving} conflicts={conflicts} approveError={approveError} onOpenOffer={openOffer} />}
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            {prevStage ? <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => goTo(prevStage)}><ArrowLeft className="w-4 h-4 mr-1" />Back to {labelOf(prevStage)}</Button> : <span />}
            {nextStage && viewable(nextStage) && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => goTo(nextStage)}>Go to {labelOf(nextStage)}</Button>}
          </div>
        </main>

        {/* Guidance + Offer strategist: collapsible; a column on xl, a side drawer below xl. */}
        {panelOpen && (
          <aside id="builder-strategist" aria-label="Guidance and offer strategist"
            className="fixed inset-y-0 right-0 z-30 w-full sm:w-[400px] xl:static xl:z-auto xl:w-auto border-l border-border bg-card shadow-xl xl:shadow-none flex flex-col xl:sticky xl:top-0 xl:self-start xl:h-[calc(100vh-57px)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-display font-semibold text-foreground flex items-center gap-1.5"><MessagesSquare className="w-4 h-4 text-primary" /> Guidance &amp; strategist</p>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-muted/80" onClick={() => setPanelOpen(false)} aria-label="Close panel"><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {view === "understand" && <>
                {u?.missing.length ? <Tip icon={HelpCircle} title="Most useful to answer">{u.missing.slice(0, 3).map((m) => m.question || m.text).join(" · ")}</Tip> : null}
                {u?.assumed.length ? <Tip icon={AlertTriangle} title="Challenge these assumptions">{u.assumed.slice(0, 2).map((a) => a.text).join(" · ")}</Tip> : null}
                {brief?.questions?.length ? <Tip icon={HelpCircle} title={`Key decisions for a ${tierLabel}`}>{brief.questions.join(" · ")}</Tip> : null}
              </>}
              {view === "diagnose" && d?.profile.weakest && <Tip icon={AlertTriangle} title="Biggest lever">{DIMENSION_LABELS[d.profile.weakest]} — improving this is likely the highest-impact change. Work on it in Strengthen.</Tip>}
              <BuilderChatPanel session={s} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

const Group = ({ title, tone, empty, children }: { title: string; tone: "known" | "assumed" | "missing"; empty: string; children: React.ReactNode[] }) => (
  <div className={cn("rounded-xl border bg-card p-4 space-y-2", tone === "known" ? "border-border" : tone === "assumed" ? "border-primary/30" : "border-destructive/30")}>
    <h2 className="text-sm font-display font-semibold text-foreground">{title}</h2>
    {children.length ? <ul className="space-y-3">{children}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>}
  </div>
);
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-2"><h2 className="text-sm font-display font-semibold text-foreground">{title}</h2>{children}</div>
);
const StageGuidance = ({ text, onAsk, panelOpen }: { text: string; onAsk: () => void; panelOpen: boolean }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
    <Lightbulb className="w-4 h-4 text-primary shrink-0" />
    <p className="flex-1 min-w-[200px] text-xs text-foreground">{text}</p>
    {!panelOpen && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onAsk}><MessagesSquare className="w-3.5 h-3.5 mr-1" />Ask the strategist</Button>}
  </div>
);
const Tip = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-background p-3 space-y-1">
    <p className="text-xs font-medium text-foreground flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-primary" />{title}</p>
    <p className="text-xs text-muted-foreground">{children}</p>
  </div>
);
