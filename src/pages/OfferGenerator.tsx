// Public AI Offer Generator (lead magnet). No account needed; full result
// after email; "Save to Boostmate" claims it into a new workspace on signup.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Lock, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo-boostmate.svg";
import AuthModal from "@/components/auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import ValueProfileChart from "@/components/offer-intelligence/ValueProfileChart";
import { DIMENSION_LABELS, VALUE_DIMENSIONS, type ValueProfile } from "@shared/offerIntelligence/valueEquation";
import type { PublicOfferResult } from "@shared/offerIntelligence/publicResult";
import {
  generateOffer, unlockOffer, generatorErrorMessage, PENDING_OFFER_CLAIM_KEY, type GeneratorIntake,
} from "@/lib/offers/publicOfferGenerator";

type Phase = "intake1" | "intake2" | "loading" | "preview" | "full";
type Preview = { offerName: string; promise: string; methodSummary: string; profile: ValueProfile; beforeProfile: ValueProfile | null; insights: string[] };

const LOADING_LINES = ["Reading your answers…", "Shaping your transformation…", "Designing your method…", "Assessing the value of your offer…"];

const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    {children}
  </div>
);

function strongestWeakest(p: ValueProfile) {
  const scored = VALUE_DIMENSIONS.filter((d) => p.dimensions[d].score != null);
  if (!scored.length) return null;
  const sorted = [...scored].sort((a, b) => p.dimensions[b].score! - p.dimensions[a].score!);
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1], unknown: VALUE_DIMENSIONS.filter((d) => p.dimensions[d].score == null) };
}

export default function OfferGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const started = useRef(Date.now());
  const [phase, setPhase] = useState<Phase>("intake1");
  const [form, setForm] = useState<GeneratorIntake>({ audience: "", outcome: "", delivery: "", obstacle: "", currentOffer: "", currentPrice: "" });
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [full, setFull] = useState<PublicOfferResult | null>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [line, setLine] = useState(0);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    document.title = "Free AI Offer Generator for Coaches | Boostmate";
  }, []);
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 2200);
    return () => clearInterval(t);
  }, [phase]);

  const set = (k: keyof GeneratorIntake) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const step1Ok = form.audience.trim() && form.outcome.trim();
  const step2Ok = form.delivery.trim() && form.obstacle.trim();

  const submit = async () => {
    setError(null);
    setPhase("loading");
    try {
      const clean = Object.fromEntries(Object.entries(form).filter(([, v]) => String(v ?? "").trim())) as unknown as GeneratorIntake;
      const data = await generateOffer(clean, { elapsedMs: Date.now() - started.current, website });
      setToken(data.token);
      setPreview(data.preview);
      setPhase("preview");
    } catch (e) {
      setError(generatorErrorMessage((e as Error).message));
      setPhase("intake2");
    }
  };

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setUnlocking(true);
    setError(null);
    try {
      const data = await unlockOffer(token, email, consent);
      setFull(data.result);
      setPhase("full");
    } catch (err) {
      setError(generatorErrorMessage((err as Error).message));
    } finally {
      setUnlocking(false);
    }
  };

  const saveToBoostmate = () => {
    if (!token) return;
    try { localStorage.setItem(PENDING_OFFER_CLAIM_KEY, token); sessionStorage.setItem(PENDING_OFFER_CLAIM_KEY, token); } catch { /* ignore */ }
    if (user) navigate("/dashboard");
    else setShowAuth(true);
  };

  const progress = { intake1: 20, intake2: 50, loading: 75, preview: 90, full: 100 }[phase];
  const profile = full?.profile ?? preview?.profile ?? null;
  const before = full?.beforeProfile ?? preview?.beforeProfile ?? null;
  const sw = profile ? strongestWeakest(profile) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Boostmate" className="h-8" />
          {!user && <button onClick={() => setShowAuth(true)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Log in</button>}
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <Progress value={progress} aria-label="Progress" className="h-1.5" />
        </div>

        {(phase === "intake1" || phase === "intake2") && (
          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Build a stronger offer in 2 minutes</h1>
              <p className="text-muted-foreground">Answer a few short questions. We'll design an offer concept and show where its value is strongest — free, no account needed.</p>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <p className="text-xs font-medium text-muted-foreground">Step {phase === "intake1" ? 1 : 2} of 2</p>
              {phase === "intake1" ? (
                <>
                  <Field id="audience" label="Who do you help?" hint="Be specific — e.g. “new online fitness coaches”, not “everyone”.">
                    <Input id="audience" value={form.audience} onChange={set("audience")} maxLength={300} />
                  </Field>
                  <Field id="outcome" label="What result do they want most?" hint="e.g. “sign their first 5 paying clients in 90 days”.">
                    <Textarea id="outcome" value={form.outcome} onChange={set("outcome")} maxLength={300} rows={2} />
                  </Field>
                  <div className="flex justify-end">
                    <Button onClick={() => setPhase("intake2")} disabled={!step1Ok}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </>
              ) : (
                <>
                  <Field id="delivery" label="How do you deliver your help today?" hint="e.g. 1:1 calls, a group program, a course, done-for-you.">
                    <Input id="delivery" value={form.delivery} onChange={set("delivery")} maxLength={300} />
                  </Field>
                  <Field id="obstacle" label="What's your biggest challenge in selling it?" hint="e.g. “people think it's too expensive” or “it sounds like everyone else”.">
                    <Textarea id="obstacle" value={form.obstacle} onChange={set("obstacle")} maxLength={300} rows={2} />
                  </Field>
                  <div className="grid md:grid-cols-[1fr_160px] gap-4">
                    <Field id="currentOffer" label="Your current offer (optional)">
                      <Input id="currentOffer" value={form.currentOffer} onChange={set("currentOffer")} maxLength={500} />
                    </Field>
                    <Field id="currentPrice" label="Its price (optional)">
                      <Input id="currentPrice" value={form.currentPrice} onChange={set("currentPrice")} maxLength={40} inputMode="decimal" />
                    </Field>
                  </div>
                  {/* Honeypot: hidden from people, filled by bots. */}
                  <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setPhase("intake1")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                    <Button onClick={submit} disabled={!step2Ok}><Sparkles className="w-4 h-4 mr-1.5" /> Generate my offer</Button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {phase === "loading" && (
          <section className="py-20 text-center space-y-4" aria-live="polite">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">{LOADING_LINES[line]}</p>
            <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
          </section>
        )}

        {(phase === "preview" || phase === "full") && preview && (
          <section className="space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Your offer concept</p>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{preview.offerName}</h1>
              <p className="text-lg text-foreground">{preview.promise}</p>
              <p className="text-muted-foreground">{preview.methodSummary}</p>
            </div>

            <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-start">
              {profile && <ValueProfileChart after={profile} before={before} />}
              <div className="space-y-4 text-sm">
                <h2 className="font-display font-semibold text-foreground text-lg">What stands out</h2>
                {sw ? (
                  <ul className="space-y-2 text-foreground">
                    <li><span className="font-medium">Strongest:</span> {DIMENSION_LABELS[sw.strongest]}</li>
                    <li><span className="font-medium">Most room to improve:</span> {DIMENSION_LABELS[sw.weakest]}</li>
                    {sw.unknown.length > 0 && <li className="text-muted-foreground">Not assessed (not enough information): {sw.unknown.map((d) => DIMENSION_LABELS[d]).join(", ")}</li>}
                  </ul>
                ) : <p className="text-muted-foreground">Not enough information to assess the value dimensions.</p>}
                <ul className="list-disc pl-5 space-y-1.5 text-foreground">
                  {preview.insights.map((i) => <li key={i}>{i}</li>)}
                </ul>
                {!before && <p className="text-xs text-muted-foreground">No “before” profile is shown because no current offer was described.</p>}
              </div>
            </div>

            {phase === "preview" && (
              <form onSubmit={unlock} className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /><h2 className="font-display font-semibold text-foreground">Get your full offer</h2></div>
                <p className="text-sm text-muted-foreground">See the complete structure: target audience, method, deliverables, delivery, a pricing estimate where possible, key assumptions, all three improvements and the reasoning behind every score. We use your email only to give you access to this result.</p>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Field id="email" label="Email address">
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" />
                </Field>
                <label htmlFor="consent" className="flex items-start gap-2 text-sm text-foreground">
                  <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                  <span>Optional: send me practical tips about building offers and growing with Boostmate. You can unsubscribe anytime.</span>
                </label>
                <Button type="submit" disabled={unlocking || !email.trim()}>
                  {unlocking ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null} Show my full offer
                </Button>
              </form>
            )}

            {phase === "full" && full && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <h3 className="font-display font-semibold text-foreground">Target audience</h3>
                    <p className="text-sm text-foreground">{full.audience}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <h3 className="font-display font-semibold text-foreground">Delivery</h3>
                    <p className="text-sm text-foreground">{full.deliveryApproach}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                  <h3 className="font-display font-semibold text-foreground">{full.design.angle?.framework?.name || "Your method"}</h3>
                  <p className="text-sm text-foreground">{full.design.angle?.framework?.description || full.methodSummary}</p>
                  {full.deliverables.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground pt-2">Main deliverables</p>
                      <ul className="space-y-1">{full.deliverables.map((d) => <li key={d} className="flex gap-2 text-sm text-foreground"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{d}</li>)}</ul>
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                  <h3 className="font-display font-semibold text-foreground">Pricing</h3>
                  {full.pricing ? (
                    <>
                      <p className="text-sm text-foreground">Indicative range: <span className="font-semibold">{full.pricing.low.toLocaleString()} – {full.pricing.high.toLocaleString()}</span> <span className="text-muted-foreground">(estimate, not market-validated)</span></p>
                      <p className="text-sm text-muted-foreground">{full.pricing.reasoning}</p>
                      {full.pricing.assumptions.length > 0 && <ul className="list-disc pl-5 text-xs text-muted-foreground">{full.pricing.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>}
                    </>
                  ) : <p className="text-sm text-muted-foreground">Not enough information for a responsible price estimate yet.</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <h3 className="font-display font-semibold text-foreground">3 improvements</h3>
                    <ol className="list-decimal pl-5 space-y-1.5 text-sm text-foreground">{full.improvements.map((i) => <li key={i}>{i}</li>)}</ol>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <h3 className="font-display font-semibold text-foreground">Assumptions to check</h3>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">{full.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Click a dimension in the value profile above to see the reasoning behind its score.</p>
              </div>
            )}

            <div className="rounded-2xl border border-primary/30 bg-primary/5 px-6 py-8 text-center space-y-3">
              <h2 className="text-2xl font-display font-bold text-foreground">Save your offer and keep building in Boostmate</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Create a free account and this offer is added to your workspace, ready to refine with the AI Coach.</p>
              <Button size="lg" onClick={saveToBoostmate}>Save my offer <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
            </div>
          </section>
        )}
      </main>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); if (token) navigate("/dashboard"); }} defaultMode="signup" />
    </div>
  );
}
