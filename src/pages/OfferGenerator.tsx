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
import type { PublicDiagnosis, PublicImprovement, PublicChoice, AuditChannel } from "@shared/offerIntelligence/publicFlow";
import {
  diagnoseOffer, strengthenOffer, finalizeOffer, requestVideoAudit, generatorErrorMessage,
  PENDING_OFFER_CLAIM_KEY, PUBLIC_BUILDER_STATE_KEY, type GeneratorIntake,
} from "@/lib/offers/publicOfferGenerator";
import { cn } from "@/lib/utils";

type Stage = "discover" | "diagnose" | "strengthen" | "final";
const STAGES: { id: Stage; label: string }[] = [
  { id: "discover", label: "Discover" }, { id: "diagnose", label: "Diagnose" },
  { id: "strengthen", label: "Strengthen" }, { id: "final", label: "Your Improved Offer" },
];

interface Saved {
  stage: Stage; form: GeneratorIntake; token: string | null; diagnosis: PublicDiagnosis | null;
  items: PublicImprovement[] | null; choices: Record<string, PublicChoice>; result: PublicOfferResult | null; auditSent: boolean;
}
const EMPTY_FORM: GeneratorIntake = { audience: "", outcome: "", delivery: "", obstacle: "", currentOffer: "", currentPrice: "", stage: "existing", currency: "EUR" };
const INITIAL: Saved = { stage: "discover", form: EMPTY_FORM, token: null, diagnosis: null, items: null, choices: {}, result: null, auditSent: false };

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(PUBLIC_BUILDER_STATE_KEY);
    if (raw) return { ...INITIAL, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return INITIAL;
}

const DIMENSIONS: { id: ValueDimension; icon: typeof Target; q: string }[] = [
  { id: "dream_outcome", icon: Target, q: "How desirable is the result?" },
  { id: "perceived_likelihood", icon: ShieldCheck, q: "How confident is the buyer that it will work for them?" },
  { id: "speed_to_value", icon: Zap, q: "How quickly do they experience meaningful progress?" },
  { id: "ease_of_achievement", icon: Feather, q: "How manageable does the process feel?" },
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

  const reached: Record<Stage, boolean> = { discover: true, diagnose: !!s.diagnosis, strengthen: !!s.items, final: !!s.result };

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
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <img src={logo} alt="Boostmate" className="h-7" />
          <nav aria-label="Builder progress" className="hidden md:flex items-center gap-1">
            {STAGES.map((st, i) => (
              <button key={st.id} disabled={!reached[st.id] || !!busy} onClick={() => patch({ stage: st.id })}
                aria-current={s.stage === st.id ? "step" : undefined}
                className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                  s.stage === st.id ? "bg-primary text-primary-foreground font-medium" : reached[st.id] ? "text-foreground hover:bg-muted" : "text-muted-foreground/60")}>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  s.stage === st.id ? "bg-primary-foreground/20" : reached[st.id] && i < idx ? "bg-primary/15 text-primary" : "bg-muted")}>
                  {reached[st.id] && i < idx ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {st.label}
              </button>
            ))}
          </nav>
          {!user && <button onClick={() => setShowAuth(true)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Log in</button>}
        </div>
        <div className="md:hidden px-4 pb-2 text-xs text-muted-foreground">Step {idx + 1} of 4 · {STAGES[idx].label}</div>
        <div className="h-1 bg-muted"><div className="h-1 bg-primary transition-all" style={{ width: `${((idx + 1) / 4) * 100}%` }} /></div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-10 md:py-14 space-y-10">
        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        {busy ? <LoadingPanel kind={busy} /> : (
          <>
            {/* ---------------- Stage 1: Discover ---------------- */}
            {s.stage === "discover" && (
              <section className="space-y-10">
                <div className="space-y-8">
                  <StageHeader eyebrow="Free Irresistible Offer Builder" title="Let's turn your offer into something clients actually want."
                    subtitle="Great offers don't just explain what you sell. They make the right people want the result, believe they can achieve it, and feel confident taking the next step. Let's see how yours measures up." />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {DIMENSIONS.map(({ id, icon: Icon, q }) => (
                      <div key={id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <p className="font-display font-semibold text-foreground">{DIMENSION_LABELS[id]}</p>
                        <p className="text-sm text-muted-foreground">{q}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground max-w-3xl">A stronger offer rarely means adding more bonuses or deliverables. It usually comes from a clearer result, more credibility, a shorter path to progress, or less effort and uncertainty for your buyer. Inspired by the Value Equation from Alex Hormozi's <em>$100M Offers</em>.</p>
                </div>

                <Card>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Where are you right now?</p>
                      <div className="grid sm:grid-cols-2 gap-2" role="radiogroup">
                        {[{ v: "existing", t: "I'm already selling an offer", d: "Improve what you have." }, { v: "idea", t: "I have an offer idea", d: "Shape it before you sell it." }].map((o) => (
                          <button key={o.v} role="radio" aria-checked={f.stage === o.v} onClick={() => patch({ form: { ...f, stage: o.v as "existing" | "idea" } })}
                            className={cn("rounded-lg border p-3 text-left transition-colors", f.stage === o.v ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40")}>
                            <p className="font-medium text-foreground text-sm">{o.t}</p><p className="text-xs text-muted-foreground">{o.d}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field id="audience" label="Who do you help?" hint="Be specific — e.g. “busy male professionals aged 30–45”, not “everyone”.">
                      <Textarea id="audience" value={f.audience} onChange={setField("audience")} maxLength={300} rows={2} />
                    </Field>
                    <Field id="outcome" label="What result do you help them achieve?" hint="Describe the transformation, not your services — e.g. “sign their first 5 paying clients in 90 days”.">
                      <Textarea id="outcome" value={f.outcome} onChange={setField("outcome")} maxLength={300} rows={2} />
                    </Field>
                    <Field id="currentOffer" label={isIdea ? "What would you like to offer?" : "What are you currently offering?"} hint="Coaching, consulting, a course, a program, a service…">
                      <Input id="currentOffer" value={f.currentOffer} onChange={setField("currentOffer")} maxLength={500} />
                    </Field>
                    <Field id="delivery" label="How do clients achieve that result with you?" optional hint="Your method, how you deliver it and the support they get.">
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
                      <Field id="currentPrice" label="What is the current price?" optional>
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
                <StageHeader eyebrow="Before · Your current offer" title="Let's find out how strong your offer is"
                  subtitle="Here's how your offer scores on the four parts of the Value Equation. Click a dimension to see why." />
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
                              <p className="text-sm text-foreground">{o.change}</p>
                              {o.why && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Why it helps: </span>{o.why}</p>}
                              {o.tradeoff && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Keep in mind: </span>{o.tradeoff}</p>}
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

function FinalStage({ s, onBack, onStartOver, onAuditSent, onSave }: { s: Saved; onBack: () => void; onStartOver: () => void; onAuditSent: () => void; onSave: () => void }) {
  const r = s.result!;
  const changes = compareProfiles(r.beforeProfile, r.profile);
  const deliverables: any[] = (r.design?.stack?.deliverables ?? []).filter((d: any) => d?.name);
  const framework = r.design?.angle?.framework;
  const decisions = (s.items ?? []).map((it) => {
    const c = s.choices[it.id];
    const o = it.options.find((x) => x.id === c?.choice);
    return { area: it.weakness, text: c?.choice === "keep" ? "Kept your current approach" : o ? `${o.title}${c?.custom ? ` — ${c.custom}` : ""}` : "" };
  });
  return (
    <section className="space-y-10">
      <StageHeader eyebrow="Your improved offer" title="Here's how your offer has evolved" subtitle="We re-assessed your improved offer from scratch, using the same criteria as your diagnosis." />

      <Card>
        <ValueProfileChart before={r.beforeProfile} after={r.profile} variant="large" />
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {changes.map((c) => (
          <div key={c.dimension} className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{DIMENSION_LABELS[c.dimension]}</p>
            <p className="text-2xl font-display font-bold text-foreground">{c.before ?? "–"} <span className="text-muted-foreground text-lg">→</span> {c.after ?? "–"}</p>
            <p className={cn("text-sm font-medium", c.delta == null ? "text-muted-foreground" : c.delta > 0 ? "text-primary" : c.delta < 0 ? "text-destructive" : "text-muted-foreground")}>
              {c.delta == null ? "Not enough information to compare" : c.delta > 0 ? `+${c.delta}` : c.delta < 0 ? `${c.delta}` : "No change"}
            </p>
          </div>
        ))}
      </div>
      {r.scoreChanges && <Card title="What changed and why"><p className="text-sm text-foreground leading-relaxed">{r.scoreChanges}</p><p className="text-xs text-muted-foreground">Scores are a strategic assessment, not a prediction of sales. A planned improvement isn't proof it works, so some scores may stay the same.</p></Card>}

      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6 md:p-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your improved offer</p>
          <h2 className="text-3xl font-display font-bold text-foreground">{r.offerName}</h2>
          <p className="text-lg text-foreground">{r.promise}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {r.audience && <Card title="Who it's for"><p className="text-sm text-foreground">{r.audience}</p></Card>}
          <Card title={framework?.name || "Your unique method"}><p className="text-sm text-foreground">{framework?.description || r.methodSummary}</p></Card>
        </div>
        {deliverables.length > 0 && (
          <Card title="What your client receives">
            <div className="grid sm:grid-cols-2 gap-3">
              {deliverables.map((d, i) => (
                <div key={i} className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="flex gap-2 font-medium text-foreground text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{d.name}</p>
                  {d.description && <p className="text-sm text-muted-foreground pl-6">{d.description}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {r.deliveryApproach && <Card title="How it works & support"><p className="text-sm text-foreground">{r.deliveryApproach}</p></Card>}
          <Card title="Suggested pricing">
            {r.pricing ? (
              <>
                <p className="text-foreground"><span className="text-xl font-display font-bold">{r.pricing.low.toLocaleString()} – {r.pricing.high.toLocaleString()}</span>{s.form.currency && s.form.currentPrice ? ` ${s.form.currency}` : ""} <span className="text-xs text-muted-foreground">estimate, not market-validated</span></p>
                <p className="text-sm text-muted-foreground">{r.pricing.reasoning}</p>
              </>
            ) : <p className="text-sm text-muted-foreground">There isn't enough information yet for a responsible price suggestion.</p>}
          </Card>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Improvements you chose"><ul className="space-y-2 text-sm">{decisions.map((d) => <li key={d.area}><span className="font-medium text-foreground">{d.area}: </span><span className="text-muted-foreground">{d.text}</span></li>)}</ul></Card>
          <Card title="Assumptions to check"><ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></Card>
          <Card title="Recommended next steps"><ol className="list-decimal pl-5 space-y-1.5 text-sm text-foreground">{(r.nextSteps?.length ? r.nextSteps : r.improvements).map((a) => <li key={a}>{a}</li>)}</ol></Card>
        </div>
        <details className="rounded-xl border border-border bg-card p-5 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">What you told us</summary>
          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-muted-foreground">
            <div><dt className="font-medium text-foreground">Audience</dt><dd>{s.form.audience}</dd></div>
            <div><dt className="font-medium text-foreground">Result</dt><dd>{s.form.outcome}</dd></div>
            <div><dt className="font-medium text-foreground">Offer</dt><dd>{s.form.currentOffer}</dd></div>
            {s.form.delivery && <div><dt className="font-medium text-foreground">How it works</dt><dd>{s.form.delivery}</dd></div>}
            <div><dt className="font-medium text-foreground">Biggest challenge</dt><dd>{s.form.obstacle}</dd></div>
            {s.form.currentPrice && s.form.stage !== "idea" && <div><dt className="font-medium text-foreground">Current price</dt><dd>{s.form.currentPrice} {s.form.currency}</dd></div>}
          </dl>
        </details>
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
            <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight">A stronger offer is just the beginning. Now let's get you more clients.</h2>
            <p className="opacity-90">You've improved your offer. But even a great offer needs the right client acquisition system behind it. Get a free, personalized 5-minute video audit of your coaching business. I'll review your current setup and show you the biggest opportunities to attract more qualified clients.</p>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {["Personalized 5-minute video review", "Concrete recommendations for your business", "A practical plan to improve client acquisition", "Delivered within 2 business days", "Free, with no obligation"].map((b) => (
                <li key={b} className="flex gap-2"><Check className="w-4 h-4 shrink-0 mt-0.5" />{b}</li>
              ))}
            </ul>
          </div>
          {!open ? (
            <Button size="lg" variant="secondary" onClick={() => setOpen(true)}><Video className="w-4 h-4 mr-1.5" /> Request my free video audit</Button>
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
              <Field id="channel" label="How are you currently attracting clients?">
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
