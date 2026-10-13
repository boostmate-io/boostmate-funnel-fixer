// Public Mini Irresistible Offer Builder (lead magnet). Free, no account or
// email needed: Discover → Diagnose → Strengthen → Your Improved Offer.
// Primary conversion: Free Client Acquisition Video Audit request.
// Lead capture: one Offer Blueprint PDF form (optional Video Audit), emailed to visitor + admin.
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
import { toText, humanize, isRedundant, pricingHeadings } from "@shared/offerIntelligence/plainLanguage";
import { describeDecisions, type PublicDiagnosis, type PublicImprovement, type PublicChoice } from "@shared/offerIntelligence/publicFlow";
import {
  diagnoseOffer, strengthenOffer, finalizeOffer, requestOfferBlueprint, generatorErrorMessage,
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
  items: PublicImprovement[] | null; choices: Record<string, PublicChoice>; result: PublicOfferResult | null; auditSent: false | "pdf" | "audit";
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
    setS((x) => ({ ...x, result: null, choices: { ...x.choices, [item]: { itemId: item, choice, ...(choice !== "keep" && (x.choices[item]?.choice === choice || (choice === "own" && x.choices[item]?.custom)) && x.choices[item]?.custom ? { custom: x.choices[item].custom } : {}) } } }));
  const setCustom = (item: string, custom: string) =>
    setS((x) => ({ ...x, result: null, choices: { ...x.choices, [item]: { ...x.choices[item], custom } } }));
  const allDecided = !!s.items && s.items.every((it) => s.choices[it.id] && (s.choices[it.id].choice !== "own" || (s.choices[it.id].custom?.trim().length ?? 0) >= 3));

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
                  <p className="text-base md:text-lg text-muted-foreground">Discover what's holding your offer back, get personalized AI recommendations, and build a stronger offer — with a visual before-and-after comparison.</p>
                </div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-foreground -mb-4">The 4 ingredients of an irresistible offer</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-left">
                  {DIMENSIONS.map(({ id, icon: Icon, q }) => (
                    <div key={id} className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-2 md:space-y-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></span>
                      <p className="font-display font-semibold text-foreground text-base md:text-lg leading-tight">{DIMENSION_LABELS[id]}</p>
                      <p className="text-sm text-muted-foreground">{q}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 max-w-2xl mx-auto">
                  <p className="text-sm text-muted-foreground">A stronger offer isn't about adding more bonuses — it's about a more desirable result, more confidence, faster progress and less effort.</p>
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
                    <Field id="currentOffer" label={isIdea ? "What would your offer include?" : "What does your current offer include?"} hint={isIdea ? "Describe what you plan to provide, how it might work, and any support or resources you have in mind." : "Briefly describe what clients get, how long the program lasts, and any support or extras included."}>
                      <Textarea id="currentOffer" value={f.currentOffer} onChange={setField("currentOffer")} maxLength={1000} rows={4} />
                    </Field>
                    <Field id="delivery" label={isIdea ? "How would you help clients get that result?" : "How do you help clients get that result?"} optional hint={isIdea ? "Describe the approach you have in mind, the main steps clients would follow, and how you'd support them." : "Describe your approach, the main steps clients follow, and how you support them."}>
                      <Textarea id="delivery" value={f.delivery} onChange={setField("delivery")} maxLength={800} rows={3} />
                    </Field>
                    <Field id="credibility" label={isIdea ? "What would make clients confident your offer will work?" : "What makes clients confident your offer will work?"} optional hint={isIdea ? "For example: relevant experience, a method you've tested, or results you've achieved yourself. Leave blank if you're just starting." : "For example: client results, testimonials, relevant experience, a proven method, or a guarantee. Leave blank if you're just starting."}>
                      <Textarea id="credibility" value={f.credibility ?? ""} onChange={setField("credibility")} maxLength={800} rows={3} />
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
                      <Button variant="ghost" onClick={() => patch({ stage: "welcome" })}><ArrowLeft className="w-4 h-4 mr-1" /> Back to introduction</Button>
                      <div className="flex flex-wrap gap-2">
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
                <p className="text-sm text-muted-foreground -mt-4">These are provisional assessments based on the information you've shared. If a dimension is marked “Not assessed”, it means we need more information — not that your offer is weak in that area.</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card title={isIdea ? "What's promising about your idea" : "What's already working"}><ul className="space-y-2 text-sm text-foreground">{s.diagnosis.strengths.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{x}</li>)}</ul></Card>
                  <Card title="What's holding your offer back"><ul className="space-y-2 text-sm text-foreground list-disc pl-5">{s.diagnosis.weaknesses.map((x) => <li key={x}>{x}</li>)}</ul></Card>
                  <Card title="Where we can make the biggest difference" className="border-primary/30 bg-primary/5"><ol className="space-y-2 text-sm text-foreground list-decimal pl-5">{s.diagnosis.topImprovements.map((x) => <li key={x}>{x}</li>)}</ol></Card>
                </div>
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
                                {o.kind === "future_action" ? "Requires implementation before launch" : "Can be included in your proposed offer"}
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
                      <div className={cn("rounded-xl border p-4 space-y-3", c?.choice === "own" ? "border-primary ring-1 ring-primary bg-primary/5" : "border-dashed border-border")}>
                        <button onClick={() => choose(it.id, "own")} className="w-full text-left text-sm font-medium text-foreground flex items-center gap-2">
                          {c?.choice === "own" ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Pencil className="w-4 h-4 text-muted-foreground" />} Write my own improvement
                        </button>
                        {c?.choice === "own" && (<>
                          <Textarea rows={3} maxLength={600} autoFocus placeholder="Describe the change you'd like to make to your offer" value={c?.custom ?? ""} onChange={(e) => setCustom(it.id, e.target.value)} aria-label="Your own improvement" />
                          <p className="text-xs text-muted-foreground">We'll assess your idea with the same standard as the suggestions. Anything you still need to create or collect goes into your action plan.</p>
                        </>)}
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
              onAuditSent={(v) => patch({ auditSent: v })} />}
          </>
        )}
      </main>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); if (s.token && s.result) navigate("/dashboard"); }} defaultMode="signup" />
    </div>
  );
}

type CompState = "up" | "down" | "same" | "new" | "none" | "lost";
/** Score state for one dimension; unassessed scores never produce a numeric delta. */
export function comparisonState(before: number | null, after: number | null): CompState {
  if (before == null) return after == null ? "none" : "new";
  if (after == null) return "lost";
  return after > before ? "up" : after < before ? "down" : "same";
}
const WHY_HEADING: Record<CompState, string> = { up: "Why the score increased", down: "Why the score decreased", same: "Why the score stayed the same", new: "Why it can now be assessed", none: "What information is still missing", lost: "Why it can no longer be assessed" };
const STATE_LABEL: Record<CompState, (d: number | null) => string> = {
  up: (d) => `+${d}`, down: (d) => `${d}`, same: () => "No change", new: () => "Newly assessed", none: () => "Not assessed yet", lost: () => "Not assessed",
};

function FinalStage({ s, onBack, onStartOver, onAuditSent }: { s: Saved; onBack: () => void; onStartOver: () => void; onAuditSent: (v: "pdf" | "audit") => void }) {
  const r = s.result!;
  const changes = compareProfiles(r.beforeProfile, r.profile);
  const pre = (r.preProgramSteps ?? []).filter((m) => m?.name);
  const deliverables: any[] = splitPreProgram((r.design?.stack?.deliverables ?? []).filter((d: any) => d?.name), pre);
  const framework = r.design?.angle?.framework;
  const transformation = r.design?.angle?.core_outcome;
  const decisions = describeDecisions(s.items ?? [], Object.values(s.choices));
  const applied = decisions.filter((d) => d.status === "applied");
  const kept = decisions.filter((d) => d.status === "kept");
  const own = decisions.filter((d) => d.status === "own");
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
      <div className="space-y-5">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">What changed and why</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {changes.map((c) => {
            const dc = r.dimensionChanges.find((x) => x.dimension === c.dimension);
            const st = comparisonState(c.before, c.after);
            const why = st === "new" ? `Your original answers didn't include enough detail to judge this. The improved offer spells it out, so it can now be assessed for the first time${c.after != null ? ` at ${c.after}/10` : ""}. This is a starting point, not an increase from zero.`
              : st === "none" ? (dc?.stillUncertain ? humanize(dc.stillUncertain) : "There still isn't enough information to assess this. Adding more detail about this part of your offer would make it assessable.")
              : st === "lost" ? humanize(dc?.why) : alignScoreWhy(st, humanize(dc?.why), DIMENSION_LABELS[c.dimension].toLowerCase(), `${c.after}/10`);
            const blocks = [
              { h: "What changed", t: humanize(dc?.whatChanged) },
              { h: WHY_HEADING[st], t: why },
              { h: "What still needs work", t: st === "none" ? "" : humanize(dc?.stillUncertain) },
            ].filter((x) => x.t);
            return (
              <div key={c.dimension} className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-foreground text-xl">{DIMENSION_LABELS[c.dimension]}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-medium text-muted-foreground">{c.before == null ? "Not assessed" : `${c.before}/10`}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">{c.after == null ? "Not assessed" : `${c.after}/10`}</span>
                    <span className={cn("text-sm font-medium", st === "up" ? "text-primary" : st === "down" ? "text-destructive" : "text-muted-foreground")}>{STATE_LABEL[st](c.delta)}</span>
                  </div>
                </div>
                {blocks.map((x) => (
                  <div key={x.h} className="space-y-1">
                    <h4 className="text-sm font-display font-semibold text-foreground">{x.h}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{x.t}</p>
                  </div>
                ))}
                {dc?.adjusted && st !== "new" && <p className="text-xs text-muted-foreground border-t border-border pt-3">Planned changes are credited carefully — they count fully once they're in place and proven.</p>}
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
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">{r.offerName}</h2>
          <p className="text-base md:text-lg text-foreground">{r.promise}</p>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div role="tablist" aria-label="Offer details" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 bg-muted/50 p-1.5 border-b border-border">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={cn("rounded-lg px-3 py-2.5 text-sm text-center leading-tight transition-colors", tab === t.id ? "bg-card text-primary font-semibold shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/60")}>{t.label}</button>
            ))}
          </div>
          <div className="p-5 md:p-8 space-y-6 text-sm">
            {tab === "overview" && (
              <>
                <Section title="Who it's for">{r.audience || s.form.audience}</Section>
                {transformation && !isRedundant(toText(transformation), r.promise) && <Section title="The transformation">{toText(transformation)}</Section>}
                {r.positioning && !isRedundant(r.positioning, r.promise) && <Section title="Positioning">{humanize(r.positioning)}</Section>}
                {r.deliveryApproach && <Section title="How it's delivered">{r.deliveryApproach}</Section>}
              </>
            )}
            {tab === "how" && (
              <>
                <Section title={toText(framework?.name) || "The core method"}>{toText(framework?.description) || r.methodSummary}</Section>
                {(r.methodSteps?.length ?? 0) > 0 && (
                  <Section title="The steps your clients follow">
                    <ol className="space-y-3">
                      {r.methodSteps!.map((m, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                          <p className="text-foreground"><span className="font-medium">{m.name}</span>{m.description ? <span className="text-muted-foreground"> — {m.description}</span> : null}</p>
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}
                {pre.length > 0 && (
                  <Section title="Before the program">
                    <div className="space-y-3">
                      {pre.map((m, i) => (
                        <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                          <p className="font-medium text-foreground">{m.name}</p>
                          {m.description && <p className="text-muted-foreground">{m.description}</p>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
                {deliverables.length > 0 && (
                  <Section title={pre.length ? "What's included in the program" : "What's included"}>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {deliverables.map((d, i) => (
                        <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                          <p className="flex gap-2 font-medium text-foreground"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{toText(d.name)}</p>
                          {d.description && <p className="text-muted-foreground pl-6">{toText(d.description)}</p>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}
            {tab === "stronger" && (
              <>
                <Section title="Included in your proposed offer">
                  {applied.length || own.length ? <div className="space-y-3">
                    {applied.map((d) => {
                      const how = r.appliedImprovements.find((a) => a.area.toLowerCase() === d.area.toLowerCase())?.howItHelps;
                      return <div key={d.area} className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 space-y-1"><p className="font-medium text-foreground">{d.title}{d.adjusted ? " (your adjusted version)" : ""}</p><p className="text-muted-foreground">{humanize(how || d.detail)}</p></div>;
                    })}
                    {own.map((d) => <div key={d.area} className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 space-y-1"><p className="font-medium text-foreground">Your own improvement · {d.area}</p><p className="text-muted-foreground">{d.detail}</p><p className="text-xs text-muted-foreground">Included in the proposal. Build or confirm anything it depends on before you claim it.</p></div>)}
                  </div> : <p className="text-muted-foreground">You didn't apply any immediate changes.</p>}
                </Section>
                {r.futureActions.length > 0 && <Section title="Your implementation checklist"><p className="text-sm text-muted-foreground mb-2">What still needs to be created or set up before these parts of the offer are in place.</p><ul className="space-y-2">{r.futureActions.map((a) => <li key={a} className="flex gap-2 text-foreground"><span className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-primary" />{humanize(a)}</li>)}</ul></Section>}
                {r.assumptions.length > 0 && <Section title="Assumptions to validate"><ul className="list-disc pl-5 space-y-1 text-muted-foreground">{r.assumptions.map((a) => <li key={a}>{humanize(a)}</li>)}</ul></Section>}
                {(r.additionalRecommendations?.length ?? 0) > 0 && <Section title="Additional recommendations"><p className="text-sm text-muted-foreground mb-2">Optional ideas you didn't select — they are not part of your proposed offer.</p><ul className="list-disc pl-5 space-y-1 text-muted-foreground">{r.additionalRecommendations!.map((a) => <li key={a}>{humanize(a)}</li>)}</ul></Section>}
                {kept.length > 0 && <Section title="Kept as it is"><ul className="list-disc pl-5 space-y-1 text-muted-foreground">{kept.map((d) => <li key={d.area}>{d.area}</li>)}</ul></Section>}
              </>
            )}
            {tab === "pricing" && (
              <>
                {price && <Section title="Your current price">{price}</Section>}
                {r.pricing ? (
                  <Section title="Suggested price range (estimate)">
                    <p className="text-foreground"><span className="text-xl font-display font-bold">{r.pricing.low.toLocaleString()} – {r.pricing.high.toLocaleString()}</span>{price ? ` ${s.form.currency}` : ""}</p>
                    <p className="text-muted-foreground mt-1">{humanize(r.pricing.reasoning)}</p>
                    <p className="text-xs text-muted-foreground mt-2">A recommendation based on your answers — not a validated market price.</p>
                  </Section>
                ) : <p className="text-muted-foreground">There isn't enough information yet to recommend a specific new price — here's what to consider instead.</p>}
                {r.pricingGuidance && (() => { const h = pricingHeadings(!!price); return [[h[0], r.pricingGuidance.factors], [h[1], r.pricingGuidance.strengthenValue], [h[2], r.pricingGuidance.validateFirst]] as const; })().map(([t, list]) => list.length > 0 && (
                  <Section key={t} title={t}><ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">{list.map((a) => <li key={a}>{humanize(a)}</li>)}</ul></Section>
                ))}
              </>
            )}
            {tab === "validate" && (
              <>
                <Section title="What still needs validation"><ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">{(r.validationNeeds.length ? r.validationNeeds : r.assumptions).map((a) => <li key={a}>{humanize(a)}</li>)}</ul></Section>
                <Section title="Your next steps"><ol className="list-decimal pl-5 space-y-1.5 text-foreground">{(r.nextSteps.length ? r.nextSteps : r.improvements).slice(0, 3).map((a) => <li key={a}>{humanize(a)}</li>)}</ol></Section>
              </>
            )}
          </div>
        </div>
        <details className="group rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-display font-semibold text-foreground">
            What you told us <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <dl className="grid gap-3 px-5 pb-5 text-sm sm:grid-cols-2">
            {([["Status", s.form.stage === "idea" ? "New offer idea" : "Existing offer"], ["Who you help", s.form.audience], ["Result", s.form.outcome], [s.form.stage === "idea" ? "What it would include" : "What it includes", s.form.currentOffer], ["How you help", s.form.delivery], ["Why clients can be confident", s.form.credibility], ["Biggest challenge", s.form.obstacle], ["Price", price]] as [string, string | null | undefined][])
              .filter(([, v]) => v && String(v).trim()).map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="text-foreground whitespace-pre-line">{v}</dd></div>
              ))}
          </dl>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Change my choices</Button>
          <Button variant="ghost" onClick={onStartOver}>Start a new offer</Button>
        </div>
      </div>

      <BlueprintSection token={s.token} sent={s.auditSent} onSent={onAuditSent} />
    </section>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <h4 className="font-display font-semibold text-foreground">{title}</h4>
    <div className="text-foreground">{children}</div>
  </div>
);

function BlueprintSection({ token, sent, onSent }: { token: string | null; sent: false | "pdf" | "audit"; onSent: (v: "pdf" | "audit") => void }) {
  const [form, setForm] = useState({ email: "", audit: false, instagram: "", acquisition: "", website: "", consent: false, hp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !token) return;
    const local: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) local.email = "Please enter a valid email address.";
    if (form.audit && !form.instagram.trim()) local.instagram = "Please enter your Instagram username or profile link.";
    if (form.audit && form.acquisition.trim().length < 3) local.acquisition = "Please tell us briefly how you currently attract clients.";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSubmitting(true); setErr(null);
    try {
      const r = await requestOfferBlueprint({
        token, email: form.email.trim(), marketingConsent: form.consent, auditRequested: form.audit, hp: form.hp,
        ...(form.audit ? { instagram: form.instagram.trim(), acquisition: form.acquisition.trim(), website: form.website.trim() } : {}),
      });
      onSent(r.auditRequested ? "audit" : "pdf");
    } catch (x) {
      const fe = (x as Error & { fields?: Record<string, string> }).fields;
      if (fe) setErrors({
        ...(fe.instagram ? { instagram: "Use your username (e.g. @yourname) or a link like instagram.com/yourname." } : {}),
        ...(fe.email ? { email: "Please enter a valid email address." } : {}),
        ...(fe.website ? { website: "Please enter a valid website address, or leave it empty." } : {}),
        ...(fe.acquisition ? { acquisition: "Please describe how you attract clients (max. 1500 characters)." } : {}),
      });
      else setErr(generatorErrorMessage((x as Error).message));
    } finally { setSubmitting(false); }
  };

  return (
    <div id="offer-blueprint" className="rounded-2xl bg-primary text-primary-foreground p-6 md:p-10 space-y-6">
      {sent ? (
        <div className="space-y-3 text-center py-4" role="status">
          <CheckCircle2 className="w-10 h-10 mx-auto" />
          <h2 className="text-2xl md:text-3xl font-display font-bold">{sent === "audit" ? "Your Offer Blueprint is on its way — and your audit is requested." : "Your Offer Blueprint is on its way."}</h2>
          <p className="max-w-xl mx-auto opacity-90">{sent === "audit"
            ? "We'll send your personalized PDF to your inbox. We'll also review your client acquisition setup and aim to deliver your 5-minute video audit within 2 business days."
            : "Check your inbox for your personalized PDF. If you don't see it shortly, check your spam folder."}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight">Want to keep your improved offer?</h2>
            <p className="opacity-90">Get your complete Irresistible Offer Blueprint as a professionally designed PDF, delivered straight to your inbox.</p>
            <p className="text-sm opacity-80">Free · No account required</p>
          </div>
          <form onSubmit={submit} noValidate className="rounded-xl bg-card text-card-foreground p-5 md:p-6 space-y-4 max-w-2xl">
            {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.hp} onChange={(e) => setForm({ ...form, hp: e.target.value })} />
            <Field id="bp-email" label="Email address" hint="We'll send your Offer Blueprint here.">
              <Input id="bp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} autoComplete="email" aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </Field>
            <label htmlFor="bp-audit" className="flex items-start gap-2 text-sm text-foreground rounded-lg border border-border p-3">
              <Checkbox id="bp-audit" checked={form.audit} onCheckedChange={(v) => setForm({ ...form, audit: v === true })} className="mt-0.5" />
              <span><span className="font-medium flex items-center gap-1.5"><Video className="w-4 h-4" /> I'd also like a free personalized Client Acquisition Video Audit.</span>
                <span className="block text-muted-foreground mt-1">Get a 5-minute video review of your client acquisition setup, with concrete recommendations to help you attract more qualified clients. Delivered within 2 business days.</span></span>
            </label>
            {form.audit && (
              <div className="space-y-4 pl-1">
                <Field id="bp-ig" label="Instagram profile" hint="Your username (e.g. @yourname) or profile link.">
                  <Input id="bp-ig" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} maxLength={120} aria-invalid={!!errors.instagram} />
                  {errors.instagram && <p className="text-xs text-destructive">{errors.instagram}</p>}
                </Field>
                <Field id="bp-acq" label="How do you currently attract clients?" hint="Tell us how you currently find and convert clients. For example: Instagram content, DMs, referrals, paid ads, your website, booking calls, or an existing funnel.">
                  <Textarea id="bp-acq" rows={3} value={form.acquisition} onChange={(e) => setForm({ ...form, acquisition: e.target.value })} maxLength={1500} aria-invalid={!!errors.acquisition} />
                  {errors.acquisition && <p className="text-xs text-destructive">{errors.acquisition}</p>}
                </Field>
                <Field id="bp-site" label="Website or funnel URL" optional>
                  <Input id="bp-site" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={300} placeholder="yourwebsite.com" />
                  {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
                </Field>
              </div>
            )}
            <label htmlFor="bp-consent" className="flex items-start gap-2 text-sm text-foreground">
              <Checkbox id="bp-consent" checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: v === true })} className="mt-0.5" />
              <span>I'd also like to receive practical tips and occasional updates from Boostmate. I can unsubscribe anytime.</span>
            </label>
            <Button type="submit" size="lg" disabled={submitting || !token}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} Send me my Offer Blueprint</Button>
          </form>
        </>
      )}
    </div>
  );
}
