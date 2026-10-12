// Public Mini Irresistible Offer Builder (lead magnet). Free, no account or
// email needed: Discover → Diagnose → Strengthen → Your Improved Offer.
// Primary conversion: Free Client Acquisition Video Audit request.
// Secondary: "Save my offer in Boostmate" claims the result after signup.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCircle2, Check, Target, ShieldCheck, Zap, Feather, RefreshCw, Video, Pencil,
} from "lucide-react";
import logo from "@/assets/logo-boostmate.svg";
import AuthModal from "@/components/auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ValueProfileChart from "@/components/offer-intelligence/ValueProfileChart";
import { DIMENSION_LABELS, compareProfiles, type ValueDimension } from "@shared/offerIntelligence/valueEquation";
import type { PublicOfferResult } from "@shared/offerIntelligence/publicResult";
import { describeDecisions, type PublicDiagnosis, type PublicImprovement, type PublicChoice, type AuditChannel } from "@shared/offerIntelligence/publicFlow";
import {
  diagnoseOffer, strengthenOffer, finalizeOffer, requestVideoAudit, generatorErrorMessage,
  PENDING_OFFER_CLAIM_KEY, PUBLIC_BUILDER_STATE_KEY, type GeneratorIntake,
} from "@/lib/offers/publicOfferGenerator";
import { cn } from "@/lib/utils";

type Stage = "welcome" | "discover" | "diagnose" | "strengthen" | "final";
const STAGES: { id: Stage; label: string }[] = [
  { id: "discover", label: "Discover" }, { id: "diagnose", label: "Diagnose" },
  { id: "strengthen", label: "Strengthen" }, { id: "final", label: "Your Improved Offer" },
];

interface Saved {
  stage: Stage; form: GeneratorIntake; token: string | null; diagnosis: PublicDiagnosis | null;
  items: PublicImprovement[] | null; choices: Record<string, PublicChoice>; result: PublicOfferResult | null; auditSent: boolean;
}
const EMPTY_FORM: GeneratorIntake = { audience: "", outcome: "", delivery: "", obstacle: "", currentOffer: "", currentPrice: "", stage: "existing", currency: "EUR" };
const INITIAL: Saved = { stage: "welcome", form: EMPTY_FORM, token: null, diagnosis: null, items: null, choices: {}, result: null, auditSent: false };

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(PUBLIC_BUILDER_STATE_KEY);
    if (raw) {
      const saved = { ...INITIAL, ...JSON.parse(raw) } as Saved;
      // Results from the earlier format lack structured explanations: rebuild from the saved choices.
      if (saved.result && !(saved.result as any).dimensionChanges) return { ...saved, result: null, stage: saved.items ? "strengthen" : saved.stage === "final" ? "diagnose" : saved.stage };
      return saved;
    }
  } catch { /* ignore */ }
  return INITIAL;
}

const DIMENSIONS: { id: ValueDimension; icon: typeof Target; q: string }[] = [
  { id: "dream_outcome", icon: Target, q: "How much does your ideal client want the result?" },
  { id: "perceived_likelihood", icon: ShieldCheck, q: "How confident are they that your offer will work for them?" },
  { id: "speed_to_value", icon: Zap, q: "How quickly can they experience meaningful progress?" },
  { id: "ease_of_achievement", icon: Feather, q: "How easy and manageable does the journey feel?" },
];
const CHALLENGES = ["It's hard to explain", "It sounds like everyone else", "People say it's too expensive", "Buyers aren't confident it will work", "Sales are inconsistent"];
const CHANNELS: { v: AuditChannel; l: string }[] = [
  { v: "instagram_organic", l: "Instagram / organic content" }, { v: "paid_ads", l: "Paid advertising" },
  { v: "referrals", l: "Referrals / networking" }, { v: "combination", l: "A combination of channels" },
  { v: "no_system", l: "No consistent system yet" }, { v: "other", l: "Other" },
];
const LOADING: Record<string, string[]> = {
  diagnose: ["Reading your answers…", "Looking at your result and promise…", "Checking how believable it feels…", "Scoring your offer…"],
  strengthen: ["Finding your biggest opportunities…", "Preparing practical options…"],
  final: ["Building your improved offer…", "Re-assessing it from scratch…", "Writing up the details…"],
};

const Field = ({ id, label, hint, optional, children }: { id: string; label: string; hint?: string; optional?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-semibold text-foreground">{label}{optional && <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>}</Label>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    {children}
  </div>
);

const StageHeader = ({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle: string }) => (
  <div className="space-y-2">
    {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
    <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">{title}</h1>
    <p className="text-base md:text-lg text-muted-foreground max-w-2xl">{subtitle}</p>
  </div>
);

const Card = ({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border border-border bg-card p-5 md:p-6 space-y-3", className)}>
    {title && <h3 className="font-display font-semibold text-foreground text-lg">{title}</h3>}
    {children}
  </div>
);

function LoadingPanel({ kind }: { kind: string }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 2400); return () => clearInterval(t); }, []);
  const lines = LOADING[kind] ?? LOADING.diagnose;
  return (
    <div className="py-20 text-center space-y-4" aria-live="polite">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="text-lg font-medium text-foreground">{lines[i % lines.length]}</p>
      <p className="text-sm text-muted-foreground">This usually takes 15–30 seconds.</p>
    </div>
  );
}

export default function OfferGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const started = useRef(Date.now());
  const [s, setS] = useState<Saved>(loadSaved);
  const [busy, setBusy] = useState<null | "diagnose" | "strengthen" | "final">(null);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState(""); // honeypot
  const [tab, setTab] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => { document.title = "Free Irresistible Offer Builder for Coaches | Boostmate"; }, []);
  useEffect(() => { try { localStorage.setItem(PUBLIC_BUILDER_STATE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }, [s]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [s.stage]);

  const patch = (p: Partial<Saved>) => setS((x) => ({ ...x, ...p }));
  const setField = (k: keyof GeneratorIntake) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setS((x) => ({ ...x, form: { ...x.form, [k]: e.target.value } }));
  const f = s.form;
  const isIdea = f.stage === "idea";
  const discoverOk = !!(f.audience.trim() && f.outcome.trim() && f.currentOffer?.trim() && f.obstacle.trim());

  const reached: Record<Stage, boolean> = { welcome: true, discover: true, diagnose: !!s.diagnosis, strengthen: !!s.items, final: !!s.result };

  const run = async (kind: "diagnose" | "strengthen" | "final", fn: () => Promise<void>) => {
    if (inFlight.current) return; // no double generation
    inFlight.current = true;
    setError(null);
    setBusy(kind);
    try { await fn(); } catch (e) {
      const code = (e as Error).message;
      if (code === "not_found") { setS({ ...INITIAL, form: s.form }); }
      setError(generatorErrorMessage(code));
    } finally { setBusy(null); inFlight.current = false; }
  };

  const analyze = () => run("diagnose", async () => {
    const clean = Object.fromEntries(Object.entries(f).filter(([k, v]) => String(v ?? "").trim() && !(k === "currency" && !f.currentPrice?.trim()))) as unknown as GeneratorIntake;
    if (isIdea) delete (clean as any).currentPrice;
    const data = await diagnoseOffer(clean, { elapsedMs: Date.now() - started.current, website });
    // New analysis: later stages restart from this diagnosis.
    patch({ token: data.token, diagnosis: data.diagnosis, items: null, choices: {}, result: null, auditSent: false, stage: "diagnose" });
  });

  const toStrengthen = (regenerate = false) => {
    if (s.items && !regenerate) { patch({ stage: "strengthen" }); return; }
    run("strengthen", async () => {
      const data = await strengthenOffer(s.token!, regenerate);
      setTab(0);
      patch({ items: data.items, choices: {}, result: null, stage: "strengthen" });
    });
  };

  const choose = (item: string, choice: PublicChoice["choice"]) =>
    setS((x) => ({ ...x, result: null, choices: { ...x.choices, [item]: { itemId: item, choice, ...(choice !== "keep" && x.choices[item]?.choice === choice && x.choices[item]?.custom ? { custom: x.choices[item].custom } : {}) } } }));
  const setCustom = (item: string, custom: string) =>
    setS((x) => ({ ...x, result: null, choices: { ...x.choices, [item]: { ...x.choices[item], custom } } }));
  const allDecided = !!s.items && s.items.every((it) => s.choices[it.id]);

  const build = () => {
    if (s.result) { patch({ stage: "final" }); return; }
    run("final", async () => {
      const choices = s.items!.map((it) => {
        const c = s.choices[it.id];
        return c.custom?.trim() ? { ...c, custom: c.custom.trim() } : { itemId: c.itemId, choice: c.choice };
      });
      const data = await finalizeOffer(s.token!, choices);
      patch({ result: data.result, stage: "final" });
    });
  };

  const startOver = () => { setS(INITIAL); setError(null); started.current = Date.now(); };

  const saveToBoostmate = () => {
    if (!s.token) return;
    try { localStorage.setItem(PENDING_OFFER_CLAIM_KEY, s.token); sessionStorage.setItem(PENDING_OFFER_CLAIM_KEY, s.token); } catch { /* ignore */ }
    if (user) navigate("/dashboard");
    else setShowAuth(true);
  };

  const idx = STAGES.findIndex((x) => x.id === s.stage);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex flex-col items-center gap-3">
          <img src={logo} alt="Boostmate" className="h-7" />
          {s.stage !== "welcome" && (
            <nav aria-label="Builder progress">
              <ol className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
                {STAGES.map((st, i) => {
                  const active = s.stage === st.id;
                  const done = reached[st.id] && i < idx;
                  return (
                    <li key={st.id}>
                      <button disabled={!reached[st.id] || !!busy} onClick={() => patch({ stage: st.id })} aria-current={active ? "step" : undefined}
                        aria-label={`Step ${i + 1}: ${st.label}${done ? " (completed)" : ""}`}
                        className={cn("flex items-center gap-1.5 rounded-full px-2.5 md:px-3 py-1.5 text-sm transition-colors",
                          active ? "bg-primary text-primary-foreground font-medium" : done ? "text-foreground hover:bg-muted" : reached[st.id] ? "text-foreground hover:bg-muted" : "text-muted-foreground/60 cursor-default")}>
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs",
                          active ? "bg-primary-foreground/20" : done ? "bg-primary/15 text-primary" : "bg-muted")}>
                          {done ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <span className={cn(active ? "inline" : "hidden md:inline")}>{st.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-10 md:py-14 space-y-10">
        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        {busy ? <LoadingPanel kind={busy} /> : (
          <>
            {/* ---------------- Welcome (not a step) ---------------- */}
            {s.stage === "welcome" && (
              <section className="space-y-10 text-center">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Free AI Irresistible Offer Builder</p>
                  <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">Turn your offer into something clients actually want to buy.</h1>
                  <p className="text-lg text-muted-foreground">A great offer doesn't just explain what you sell. It makes the right people want the result, believe they can achieve it, and feel confident taking the next step.</p>
                  <p className="text-lg text-muted-foreground">Discover what's holding your offer back, strengthen it with AI, and see how your offer improves.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                  {DIMENSIONS.map(({ id, icon: Icon, q }) => (
                    <div key={id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></span>
                      <p className="font-display font-semibold text-foreground text-lg">{DIMENSION_LABELS[id]}</p>
                      <p className="text-sm text-muted-foreground">{q}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 max-w-2xl mx-auto">
                  <p className="text-sm text-muted-foreground">A stronger offer isn't necessarily about adding more bonuses or deliverables. It's about creating a more desirable result, increasing confidence, shortening the path to progress, and reducing unnecessary effort.</p>
                  <p className="text-xs text-muted-foreground">Inspired by the Value Equation from Alex Hormozi's <em>$100M Offers</em>.</p>
                </div>
                <div className="space-y-3">
                  <Button size="lg" className="px-8" onClick={() => patch({ stage: s.result ? "final" : s.items ? "strengthen" : s.diagnosis ? "diagnose" : "discover" })}>
                    {s.diagnosis ? "Continue where I left off" : "Get started"} <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                  <p className="text-xs text-muted-foreground">Free · No account required · Takes just a few minutes</p>
                </div>
              </section>
            )}

            {/* ---------------- Stage 1: Discover ---------------- */}
            {s.stage === "discover" && (
              <section className="space-y-8">
                <StageHeader title="Tell us about your offer" subtitle="A few short answers are enough. The more specific you are, the more useful your diagnosis will be." />
                <Card>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Where are you right now?</p>
                      <div className="grid sm:grid-cols-2 gap-2" role="radiogroup">
                        {[{ v: "existing", t: "I'm already selling an offer", d: "We'll assess what you offer today." }, { v: "idea", t: "I have an offer idea", d: "We'll give a provisional assessment of your concept." }].map((o) => (
                          <button key={o.v} role="radio" aria-checked={f.stage === o.v} onClick={() => patch({ form: { ...f, stage: o.v as "existing" | "idea" } })}
                            className={cn("rounded-lg border p-3 text-left transition-colors", f.stage === o.v ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40")}>
                            <p className="font-medium text-foreground text-sm">{o.t}</p><p className="text-xs text-muted-foreground">{o.d}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field id="audience" label="Who do you help?" hint="Be specific — e.g. “new online business coaches in their first year” or “busy professionals aged 30–45”, not “everyone”.">
                      <Textarea id="audience" value={f.audience} onChange={setField("audience")} maxLength={300} rows={2} />
                    </Field>
                    <Field id="outcome" label="What result do you help them achieve?" hint="The change in their life or business, not your services — e.g. “sign their first 5 paying clients in 90 days” or “run a half marathon without injury”.">
                      <Textarea id="outcome" value={f.outcome} onChange={setField("outcome")} maxLength={300} rows={2} />
                    </Field>
                    <Field id="currentOffer" label={isIdea ? "What would you like to offer?" : "What are you currently offering?"} hint={isIdea ? "e.g. “a 6-week group program” or “a self-paced course with monthly Q&A calls”." : "e.g. “12-week 1:1 coaching program” or “done-with-you marketing consulting”."}>
                      <Input id="currentOffer" value={f.currentOffer} onChange={setField("currentOffer")} maxLength={500} />
                    </Field>
                    <Field id="delivery" label="How do clients achieve that result with you?" optional hint={isIdea ? "If you already know: the steps, format and support you have in mind." : "Your method or steps, the format (calls, videos, templates) and the support clients get."}>
                      <Textarea id="delivery" value={f.delivery} onChange={setField("delivery")} maxLength={300} rows={2} />
                    </Field>
                    <Field id="obstacle" label="What's the biggest challenge with your offer right now?">
                      <div className="flex flex-wrap gap-2">
                        {CHALLENGES.map((c) => (
                          <button key={c} type="button" onClick={() => patch({ form: { ...f, obstacle: c } })}
                            className={cn("rounded-full border px-3 py-1 text-xs", f.obstacle === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{c}</button>
                        ))}
                      </div>
                      <Textarea id="obstacle" value={f.obstacle} onChange={setField("obstacle")} maxLength={300} rows={2} placeholder="Or describe it in your own words" />
                    </Field>
                    {!isIdea && (
                      <Field id="currentPrice" label="What is the current price?" optional hint="Leave empty if you'd rather not say.">
                        <div className="flex gap-2 max-w-xs">
                          <Select value={f.currency || "EUR"} onValueChange={(v) => patch({ form: { ...f, currency: v } })}>
                            <SelectTrigger className="w-24" aria-label="Currency"><SelectValue /></SelectTrigger>
                            <SelectContent>{["EUR", "USD", "GBP", "CAD", "AUD", "CHF"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input id="currentPrice" value={f.currentPrice} onChange={setField("currentPrice")} maxLength={40} inputMode="decimal" placeholder="e.g. 997" />
                        </div>
                      </Field>
                    )}
                    <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-muted-foreground">Free · No account or email needed</p>
                      <div className="flex gap-2">
                        {s.diagnosis && <Button variant="ghost" onClick={() => patch({ stage: "diagnose" })}>View current analysis</Button>}
                        <Button size="lg" onClick={analyze} disabled={!discoverOk}><Sparkles className="w-4 h-4 mr-1.5" /> Analyze my offer</Button>
                      </div>
                    </div>
                    {s.diagnosis && <p className="text-xs text-muted-foreground text-right">Analyzing again starts a fresh diagnosis; your later choices will be reset.</p>}
                  </div>
                </Card>
              </section>
            )}

            {/* ---------------- Stage 2: Diagnose ---------------- */}
            {s.stage === "diagnose" && s.diagnosis && (
              <section className="space-y-8">
                <StageHeader eyebrow={isIdea ? "Before · Your offer idea (provisional)" : "Before · Your current offer"} title="Let's find out how strong your offer is"
                  subtitle={isIdea ? "This is a provisional assessment of your idea, based only on what you've told us. Click a dimension to see why." : "Here's how the offer you sell today scores on the four parts of the Value Equation. Click a dimension to see why."} />
                <Card><ValueProfileChart before={s.diagnosis.profile} variant="large" /></Card>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card title="What's already working"><ul className="space-y-2 text-sm text-foreground">{s.diagnosis.strengths.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{x}</li>)}</ul></Card>
                  <Card title="What's holding your offer back"><ul className="space-y-2 text-sm text-foreground list-disc pl-5">{s.diagnosis.weaknesses.map((x) => <li key={x}>{x}</li>)}</ul></Card>
                  <Card title="Where we can make the biggest difference" className="border-primary/30 bg-primary/5"><ol className="space-y-2 text-sm text-foreground list-decimal pl-5">{s.diagnosis.topImprovements.map((x) => <li key={x}>{x}</li>)}</ol></Card>
                </div>
                <p className="text-xs text-muted-foreground">“Not assessed” means we didn't have enough information — it doesn't count against you. These scores are a strategic assessment, not a prediction of sales.</p>
                <div className="flex justify-between gap-3">
                  <Button variant="ghost" onClick={() => patch({ stage: "discover" })}><ArrowLeft className="w-4 h-4 mr-1" /> Edit my answers</Button>
                  <Button size="lg" onClick={() => toStrengthen()}>Let's strengthen my offer <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
                </div>
              </section>
            )}

            {/* ---------------- Stage 3: Strengthen ---------------- */}
            {s.stage === "strengthen" && s.items && (() => {
              const it = s.items[Math.min(tab, s.items.length - 1)];
              const c = s.choices[it.id];
              return (
                <section className="space-y-8">
                  <StageHeader title="Let's make your offer more compelling" subtitle="For each opportunity, pick the option that fits your business best — or keep what you do today." />
                  <div className="flex flex-wrap gap-2" role="tablist">
                    {s.items.map((x, i) => (
                      <button key={x.id} role="tab" aria-selected={i === tab} onClick={() => setTab(i)}
                        className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left", i === tab ? "border-primary bg-primary/5 text-foreground font-medium" : "border-border text-muted-foreground hover:text-foreground")}>
                        {s.choices[x.id] ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <span className="w-2 h-2 rounded-full bg-destructive" />}
                        {i + 1}. {x.weakness}
                      </button>
                    ))}
                  </div>
                  <Card>
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Improvement {tab + 1} of {s.items.length} · {DIMENSION_LABELS[it.dimension]}</p>
                        <h2 className="text-2xl font-display font-bold text-foreground">{it.weakness}</h2>
                        <p className="text-foreground">{it.whyItMatters}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        {it.options.map((o) => {
                          const on = c?.choice === o.id;
                          return (
                            <div key={o.id} className={cn("rounded-xl border p-5 space-y-3 transition-colors", on ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border")}>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-display font-semibold text-foreground">{o.title}</h3>
                                {on && <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Your choice</span>}
                              </div>
                              <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", o.kind === "future_action" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                                {o.kind === "future_action" ? "Needs work first — added as a next step" : "Can be applied to your offer now"}
                              </span>
                              <p className="text-sm text-foreground"><span className="font-medium">What to change: </span>{o.change}</p>
                              {o.why && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Why it helps: </span>{o.why}</p>}
                              {o.tradeoff && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">What to consider: </span>{o.tradeoff}</p>}
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant={on ? "default" : "outline"} onClick={() => choose(it.id, o.id)}>{on ? <><Check className="w-4 h-4 mr-1" /> Selected</> : "Select this option"}</Button>
                                {on && <Button size="sm" variant="ghost" onClick={() => setEditing(editing === it.id ? null : it.id)}><Pencil className="w-3.5 h-3.5 mr-1" /> Adjust</Button>}
                              </div>
                              {on && (editing === it.id || c?.custom) && (
                                <Textarea rows={3} maxLength={600} placeholder="Describe how you'd adapt this for your business" value={c?.custom ?? ""} onChange={(e) => setCustom(it.id, e.target.value)} aria-label="Adjust this option" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => choose(it.id, "keep")}
                        className={cn("w-full rounded-lg border px-4 py-3 text-sm text-left", c?.choice === "keep" ? "border-primary bg-primary/5 text-foreground font-medium" : "border-dashed border-border text-muted-foreground hover:text-foreground")}>
                        {c?.choice === "keep" ? "✓ " : ""}Keep my current approach for this
                      </button>
                      <div className="flex justify-between">
                        <Button variant="ghost" size="sm" disabled={tab === 0} onClick={() => setTab(tab - 1)}><ArrowLeft className="w-4 h-4 mr-1" /> Previous</Button>
                        <Button variant="ghost" size="sm" disabled={tab === s.items.length - 1} onClick={() => setTab(tab + 1)}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
                      </div>
                    </div>
                  </Card>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => patch({ stage: "diagnose" })}><ArrowLeft className="w-4 h-4 mr-1" /> Back to diagnosis</Button>
                      <Button variant="ghost" onClick={() => toStrengthen(true)}><RefreshCw className="w-4 h-4 mr-1" /> Show different suggestions</Button>
                    </div>
                    <div className="flex items-center gap-3">
                      {!allDecided && <span className="text-sm text-muted-foreground">Make a choice for each improvement to continue</span>}
                      <Button size="lg" disabled={!allDecided} onClick={build}><Sparkles className="w-4 h-4 mr-1.5" /> Build my improved offer</Button>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* ---------------- Stage 4: Your Improved Offer ---------------- */}
            {s.stage === "final" && s.result && <FinalStage s={s} onBack={() => patch({ stage: "strengthen" })} onStartOver={startOver}
              onAuditSent={() => patch({ auditSent: true })} onSave={saveToBoostmate} />}
          </>
        )}
      </main>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); if (s.token && s.result) navigate("/dashboard"); }} defaultMode="signup" />
    </div>
  );
}

const DIR_STYLE = { up: "text-primary", down: "text-destructive", same: "text-muted-foreground" } as const;

function FinalStage({ s, onBack, onStartOver, onAuditSent, onSave }: { s: Saved; onBack: () => void; onStartOver: () => void; onAuditSent: () => void; onSave: () => void }) {
  const r = s.result!;
  const changes = compareProfiles(r.beforeProfile, r.profile);
  const deliverables: any[] = (r.design?.stack?.deliverables ?? []).filter((d: any) => d?.name);
  const framework = r.design?.angle?.framework;
  const transformation = r.design?.angle?.core_outcome;
  const decisions = describeDecisions(s.items ?? [], Object.values(s.choices));
  const applied = decisions.filter((d) => d.status === "applied");
  const kept = decisions.filter((d) => d.status === "kept");
  const price = s.form.stage !== "idea" && s.form.currentPrice ? `${s.form.currentPrice} ${s.form.currency ?? ""}`.trim() : null;
  const [tab, setTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "Offer overview" }, { id: "how", label: "How it works" }, { id: "stronger", label: "What makes it stronger" },
    { id: "pricing", label: "Pricing" }, { id: "validate", label: "Validation & next steps" },
  ];
  return (
    <section className="space-y-10">
      {/* A — transformation */}
      <StageHeader eyebrow="Your improved offer" title="Here's how your offer has improved" subtitle="Your original offer and the improved proposal were assessed with the same Value Equation and the same evidence standard. Planned changes are credited carefully until they're in place." />

      {/* B — Before/After profile */}
      <Card><ValueProfileChart before={r.beforeProfile} after={r.profile} variant="large" /></Card>

      {/* C — What changed and why, one card per dimension */}
      <div className="space-y-4">
        <h2 className="text-2xl font-display font-bold text-foreground">What changed and why</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {changes.map((c) => {
            const dc = r.dimensionChanges.find((x) => x.dimension === c.dimension);
            const dir = c.delta == null ? "same" : c.delta > 0 ? "up" : c.delta < 0 ? "down" : "same";
            return (
              <div key={c.dimension} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display font-semibold text-foreground text-lg">{DIMENSION_LABELS[c.dimension]}</h3>
                  <p className="text-sm whitespace-nowrap">
                    <span className="text-muted-foreground">{c.before ?? "–"} → </span><span className="font-semibold text-foreground">{c.after ?? "–"}</span>
                    <span className={cn("ml-2 font-medium", DIR_STYLE[dir])}>{c.delta == null ? "" : c.delta > 0 ? `+${c.delta}` : c.delta < 0 ? `${c.delta}` : "No change"}</span>
                  </p>
                </div>
                {dc?.whatChanged && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What changed</p><p className="text-sm text-foreground">{dc.whatChanged}</p></div>}
                {dc?.why && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why the score {dir === "up" ? "went up" : dir === "down" ? "went down" : "stayed the same"}</p><p className="text-sm text-foreground">{dc.why}</p></div>}
                {dc?.stillUncertain && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still uncertain</p><p className="text-sm text-muted-foreground">{dc.stillUncertain}</p></div>}
                {dc?.adjusted && <p className="text-xs text-muted-foreground border-t border-border pt-2">We credited planned changes conservatively — they count fully once they're in place and proven.</p>}
                {c.before == null || c.after == null ? <p className="text-xs text-muted-foreground">Not enough information to compare both scores.</p> : null}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Scores are a strategic assessment, not a prediction of sales or conversion rates.</p>
      </div>

      {/* D — the improved offer */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your improved offer</p>
          <h2 className="text-3xl font-display font-bold text-foreground">{r.offerName}</h2>
          <p className="text-lg text-foreground">{r.promise}</p>
        </div>
        <div className="rounded-xl border border-border bg-card">
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border px-2">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={cn("whitespace-nowrap px-3 py-3 text-sm border-b-2 -mb-px", tab === t.id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>{t.label}</button>
            ))}
          </div>
          <div className="p-5 md:p-6 space-y-5 text-sm">
            {tab === "overview" && (
              <>
                <Section title="Who it's for">{r.audience || s.form.audience}</Section>
                {transformation && <Section title="The transformation">{transformation}</Section>}
                <Section title="What you told us">
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Offer: {s.form.currentOffer}</li>
                    <li>Result: {s.form.outcome}</li>
                    <li>Biggest challenge: {s.form.obstacle}</li>
                  </ul>
                </Section>
              </>
            )}
            {tab === "how" && (
              <>
                <Section title={framework?.name || "The core method"}>{framework?.description || r.methodSummary}</Section>
                {r.deliveryApproach && <Section title="Delivery & support">{r.deliveryApproach}</Section>}
                {deliverables.length > 0 && (
                  <Section title="Main program components">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {deliverables.map((d, i) => (
                        <div key={i} className="rounded-lg bg-muted/40 p-3 space-y-1">
                          <p className="flex gap-2 font-medium text-foreground"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{d.name}</p>
                          {d.description && <p className="text-muted-foreground pl-6">{d.description}</p>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}
            {tab === "stronger" && (
              <>
                <Section title="Improvements built into your offer">
                  {applied.length ? <ul className="space-y-3">{applied.map((d) => {
                    const how = r.appliedImprovements.find((a) => a.area.toLowerCase() === d.area.toLowerCase())?.howItHelps;
                    return <li key={d.area}><p className="font-medium text-foreground">{d.title}{d.adjusted ? " (your adjusted version)" : ""}</p><p className="text-muted-foreground">{how || d.detail}</p></li>;
                  })}</ul> : <p className="text-muted-foreground">You didn't apply any immediate changes.</p>}
                </Section>
                {r.futureActions.length > 0 && <Section title="Planned — not in place yet"><ul className="list-disc pl-5 space-y-1 text-muted-foreground">{r.futureActions.map((a) => <li key={a}>{a}</li>)}</ul></Section>}
                {kept.length > 0 && <Section title="Kept as it is"><ul className="list-disc pl-5 space-y-1 text-muted-foreground">{kept.map((d) => <li key={d.area}>{d.area}</li>)}</ul></Section>}
              </>
            )}
            {tab === "pricing" && (
              <>
                {price && <Section title="Your current price">{price}</Section>}
                {r.pricing ? (
                  <Section title="Suggested price range (estimate)">
                    <p className="text-foreground"><span className="text-xl font-display font-bold">{r.pricing.low.toLocaleString()} – {r.pricing.high.toLocaleString()}</span>{price ? ` ${s.form.currency}` : ""}</p>
                    <p className="text-muted-foreground mt-1">{r.pricing.reasoning}</p>
                    <p className="text-xs text-muted-foreground mt-2">A recommendation based on your answers — not a validated market price.</p>
                  </Section>
                ) : <p className="text-muted-foreground">There isn't enough information yet for a responsible price suggestion.</p>}
              </>
            )}
            {tab === "validate" && (
              <>
                <Section title="What still needs validation"><ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">{(r.validationNeeds.length ? r.validationNeeds : r.assumptions).map((a) => <li key={a}>{a}</li>)}</ul></Section>
                <Section title="Your next steps"><ol className="list-decimal pl-5 space-y-1.5 text-foreground">{(r.nextSteps.length ? r.nextSteps : r.improvements).slice(0, 3).map((a) => <li key={a}>{a}</li>)}</ol></Section>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Change my choices</Button>
          <Button variant="ghost" onClick={onStartOver}>Start a new offer</Button>
        </div>
      </div>

      <VideoAuditSection token={s.token} sent={s.auditSent} onSent={onAuditSent} />

      <div className="rounded-xl border border-border bg-card px-6 py-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div>
          <h3 className="font-display font-semibold text-foreground text-lg">Want to keep improving your offer?</h3>
          <p className="text-sm text-muted-foreground">Save your offer in Boostmate and continue building your business with our complete tools.</p>
        </div>
        <Button variant="outline" onClick={onSave}>Save my offer in Boostmate</Button>
      </div>
    </section>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <h4 className="font-display font-semibold text-foreground">{title}</h4>
    <div className="text-foreground">{children}</div>
  </div>
);

function VideoAuditSection({ token, sent, onSent }: { token: string | null; sent: boolean; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ instagram: "", email: "", channel: "" as AuditChannel | "", website: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const local: Record<string, string> = {};
    if (!form.instagram.trim()) local.instagram = "Please enter your Instagram username or profile link.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) local.email = "Please enter a valid email address.";
    if (!form.channel) local.channel = "Please choose an option.";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSubmitting(true); setErr(null);
    try {
      await requestVideoAudit({ token, email: form.email.trim(), instagram: form.instagram.trim(), channel: form.channel as AuditChannel, website: form.website.trim(), marketingConsent: form.consent });
      onSent();
    } catch (x) {
      const fe = (x as Error & { fields?: Record<string, string> }).fields;
      if (fe) setErrors({
        ...(fe.instagram ? { instagram: "Use your username (e.g. @yourname) or a link like instagram.com/yourname." } : {}),
        ...(fe.email ? { email: "Please enter a valid email address." } : {}),
        ...(fe.website ? { website: "Please enter a valid website address, or leave it empty." } : {}),
        ...(fe.channel ? { channel: "Please choose an option." } : {}),
      });
      else setErr(generatorErrorMessage((x as Error).message));
    } finally { setSubmitting(false); }
  };

  return (
    <div id="video-audit" className="rounded-2xl bg-primary text-primary-foreground p-6 md:p-10 space-y-6">
      {sent ? (
        <div className="space-y-3 text-center py-4" role="status">
          <CheckCircle2 className="w-10 h-10 mx-auto" />
          <h2 className="text-2xl md:text-3xl font-display font-bold">Your video audit request is in!</h2>
          <p className="max-w-xl mx-auto opacity-90">Thanks — we'll review your current setup and send your personalized 5-minute video audit to your inbox within 2 business days.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Free personal video audit</p>
            <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight">A stronger offer is just the beginning. Let's help you attract more clients.</h2>
            <p className="opacity-90">You've improved your offer. Now let's look at how you're actually attracting clients. Request a free, personalized 5-minute video audit of your coaching business. I'll review your current client acquisition setup and show you the biggest opportunities to attract more qualified clients.</p>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {["Personalized 5-minute video review", "Concrete recommendations for your business", "A practical plan to improve client acquisition", "Delivered within 2 business days", "Free, with no obligation"].map((b) => (
                <li key={b} className="flex gap-2"><Check className="w-4 h-4 shrink-0 mt-0.5" />{b}</li>
              ))}
            </ul>
          </div>
          {!open ? (
            <Button size="lg" variant="secondary" onClick={() => setOpen(true)}><Video className="w-4 h-4 mr-1.5" /> Request my free video audit <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
          ) : (
            <form onSubmit={submit} noValidate className="rounded-xl bg-card text-card-foreground p-5 md:p-6 space-y-4 max-w-2xl">
              {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
              <div className="grid md:grid-cols-2 gap-4">
                <Field id="ig" label="Instagram profile" hint="Your username (e.g. @yourname) or profile link.">
                  <Input id="ig" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} maxLength={120} aria-invalid={!!errors.instagram} />
                  {errors.instagram && <p className="text-xs text-destructive">{errors.instagram}</p>}
                </Field>
                <Field id="audit-email" label="Email address" hint="We'll send your video audit here.">
                  <Input id="audit-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} autoComplete="email" aria-invalid={!!errors.email} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </Field>
              </div>
              <Field id="channel" label="How are you currently attracting clients?" hint="For example: Instagram content, referrals, paid ads, a website, email marketing, or something else.">
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as AuditChannel })}>
                  <SelectTrigger id="channel" aria-invalid={!!errors.channel}><SelectValue placeholder="Choose one" /></SelectTrigger>
                  <SelectContent>{CHANNELS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select>
                {errors.channel && <p className="text-xs text-destructive">{errors.channel}</p>}
              </Field>
              <Field id="site" label="Website or funnel URL" optional>
                <Input id="site" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={300} placeholder="yourwebsite.com" />
                {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
              </Field>
              <label htmlFor="audit-consent" className="flex items-start gap-2 text-sm text-foreground">
                <Checkbox id="audit-consent" checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: v === true })} className="mt-0.5" />
                <span>Optional: also send me occasional tips about offers and client acquisition. You can unsubscribe anytime.</span>
              </label>
              <p className="text-xs text-muted-foreground">We use your details only to prepare and send your video audit, together with the offer you built here. We never add you to marketing emails unless you tick the box above.</p>
              <Button type="submit" size="lg" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} Request my free video audit</Button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
