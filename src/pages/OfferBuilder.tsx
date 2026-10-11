// Irresistible Offer Builder — full-screen workspace (Stages A–E + Builder chat).
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Lock, Sparkles, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ValueProfileChart from "@/components/offer-intelligence/ValueProfileChart";
import { BUILDER_STAGES, stageState, type BuilderStage } from "@shared/offerIntelligence/builderSession";
import { staleStages, strengthenComplete } from "@shared/offerIntelligence/builderStages";
import { StrengthenStage, PackageStage, FinalStage } from "@/components/offer-intelligence/BuilderStages";
import BuilderChatPanel from "@/components/offer-intelligence/BuilderChatPanel";
import { useAuth } from "@/contexts/AuthContext";
import { DIMENSION_LABELS, VALUE_PROFILE_DISCLAIMER } from "@shared/offerIntelligence/valueEquation";
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

  const hydrate = useCallback((next: BuilderSession) => {
    setS(next);
    setIdea(next.intake?.idea ?? "");
    setCorrections(next.understanding?.corrections ?? {});
    setDirty(false);
    setView(next.stage);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    loadBuilderSession(sessionId).then((r) => { if (r) hydrate(r); setLoading(false); });
  }, [sessionId, hydrate]);

  const run = async (action: BuilderAction, extra: Record<string, unknown> = {}) => {
    if (!s) return;
    setBusy(action); setError(null);
    try {
      const { session } = await builderAction(s, action, extra);
      hydrate(session);
    } catch (e) {
      const err = e as BuilderError;
      setError(builderErrorMessage(err.code));
      if (err.code === "conflict" || err.code === "session_closed") { const fresh = await loadBuilderSession(s.id); if (fresh) hydrate(fresh); }
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
  const stale = staleStages(d, s.decisions);
  const fin = s.decisions?.final ?? null;
  const viewable = (id: BuilderStage) =>
    id === "understand" || (id === "diagnose" && (canDiagnose || !!d)) || (id === "strengthen" && !!d) ||
    (id === "package" && (!!s.decisions?.package || (!!d && strengthenComplete(s.decisions?.strengthen)))) ||
    (id === "final" && (!!fin || !!s.draft_design));
  const goTo = (id: BuilderStage) => { setView(id); if (!readOnly && id !== s.stage && id !== "understand" && id !== "diagnose") run("save", { stage: id }); };
  const openOffer = () => navigate(`/dashboard?module=business-blueprint&openOffer=${s.result_offer_id ?? s.offer_id ?? ""}`);
  const approve = async (applyToLatest: boolean) => {
    if (!user || approving) return;
    setApproving(true); setApproveError(null);
    try {
      const r = await approveBuilderSession(s, { applyToLatest, userId: user.id });
      if (r.ok) { setConflicts(null); hydrate(r.session); setView("final"); }
      else if ("conflicts" in r) setConflicts(r.conflicts);
      else {
        setApproveError(r.error === "no_blueprint" ? "Open your Business Blueprint once before saving offers." : builderErrorMessage(r.error));
        const fresh = await loadBuilderSession(s.id); if (fresh) setS(fresh);
      }
    } finally { setApproving(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard?module=business-blueprint")}><ArrowLeft className="w-4 h-4 mr-1" /> Offer Design</Button>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Irresistible Offer Builder · {tierLabel} · {s.mode === "new" ? "New offer" : "Strengthening an existing offer"}</p>
        </div>
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {busy ? "Saving…" : `Saved · ${new Date(s.updated_at).toLocaleTimeString()}`}
        </span>
      </header>

      <div className="flex-1 grid lg:grid-cols-[220px_minmax(0,1fr)_300px] gap-0">
        {/* Stages */}
        <nav aria-label="Builder stages" className="border-b lg:border-b-0 lg:border-r border-border p-4 space-y-1 bg-card/50">
          {BUILDER_STAGES.map((st, i) => {
            const state = stageState(s, st.id);
            const clickable = viewable(st.id);
            const isStale = (st.id === "strengthen" && stale.strengthen) || (st.id === "package" && stale.package) || (st.id === "final" && stale.final);
            return (
              <button key={st.id} type="button" disabled={!clickable || !!busy} onClick={() => goTo(st.id)}
                aria-current={view === st.id ? "step" : undefined}
                className={cn("w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
                  view === st.id ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground",
                  clickable ? "hover:bg-muted/60" : "cursor-not-allowed opacity-60")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  state === "completed" ? "bg-primary text-primary-foreground border-primary" : state === "active" ? "border-primary text-primary" : "border-border")}>
                  {state === "completed" ? <Check className="w-3.5 h-3.5" /> : state === "unavailable" ? <Lock className="w-3 h-3" /> : i + 1}
                </span>
                <span className="flex-1">{st.label}</span>
                {isStale && <span className="text-[10px] text-destructive" title="Needs reassessment">Reassess</span>}
              </button>
            );
          })}
        </nav>

        {/* Working area */}
        <main className="p-5 lg:p-8 space-y-6 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <ValueProfileChart before={d?.profile ?? null} after={fin?.profile ?? null} className="md:w-80 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Value Profile</p>
              <p>{fin ? "Before (diagnosis) and After (final offer)." : d ? (s.mode === "new" ? "Initial assessment of your offer idea." : "Assessment of the offer as it is today.") : "Appears after the diagnosis in Stage B."}</p>
            </div>
          </div>
          {readOnly && s.status === "completed" && <p role="status" className="text-sm rounded-lg border border-border bg-muted/40 p-3 text-foreground">This session is completed — you're reviewing the final analysis. Start a new Builder session from Offer Design to make further changes.</p>}
          {error && <p role="alert" className="text-sm text-destructive flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{error}</p>}

          <fieldset disabled={readOnly} className="space-y-6 min-w-0">
          {view === "understand" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">A · Understand</h1>
                <p className="text-sm text-muted-foreground">We gather what's already known from your Blueprint{s.mode === "existing" ? " and this offer" : ""}, then you correct assumptions and fill gaps.</p>
              </div>
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
                  <p className="md:col-span-2 text-xs text-muted-foreground">Click a dimension in the Value Profile for the reasoning per criterion. {VALUE_PROFILE_DISCLAIMER}</p>
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
        </main>

        {/* Guidance */}
        <aside aria-label="AI guidance" className="border-t lg:border-t-0 lg:border-l border-border p-4 space-y-4 bg-card/50">
          <p className="text-sm font-display font-semibold text-foreground flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" /> Guidance</p>
          <fieldset disabled={readOnly} className="space-y-6 min-w-0">
          {view === "understand" && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">A strong offer starts from the right audience and one clear transformation. Correct anything assumed — the diagnosis treats your answers as facts.</p>
              {u?.missing.length ? <Tip icon={HelpCircle} title="Most useful to answer">{u.missing.slice(0, 3).map((m) => m.question || m.text).join(" · ")}</Tip> : null}
              {u?.assumed.length ? <Tip icon={AlertTriangle} title="Challenge these assumptions">{u.assumed.slice(0, 2).map((a) => a.text).join(" · ")}</Tip> : null}
              {brief?.questions?.length ? <Tip icon={HelpCircle} title={`Key decisions for a ${tierLabel}`}>{brief.questions.join(" · ")}</Tip> : null}
            </div>
          )}
          {view === "diagnose" && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">The Value Equation: value rises with a bigger Dream Outcome and higher Perceived Likelihood, and with faster, easier achievement.</p>
              {d?.profile.weakest && <Tip icon={AlertTriangle} title="Biggest lever">{DIMENSION_LABELS[d.profile.weakest]} — improving this is likely the highest-impact change. Work on it in Strengthen.</Tip>}
              {s.mode === "new" && <p className="text-xs text-muted-foreground">This assesses your idea, not a proven offer.</p>}
            </div>
          )}
          {view === "strengthen" && <p className="text-sm text-muted-foreground">Pick the option that fits your buyer and your capacity — or write your own. More deliverables rarely mean more value; clarity, speed and certainty usually do.</p>}
          {view === "package" && <p className="text-sm text-muted-foreground">Only this category's Offer Design fields are filled. Prices are estimates — validate them with real buyers.</p>}
          {view === "final" && <p className="text-sm text-muted-foreground">Nothing changes in Offer Design until you approve. Scores can go down as well as up.</p>}
          <BuilderChatPanel session={s} />
        </aside>
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
const Tip = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-background p-3 space-y-1">
    <p className="text-xs font-medium text-foreground flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-primary" />{title}</p>
    <p className="text-xs text-muted-foreground">{children}</p>
  </div>
);
