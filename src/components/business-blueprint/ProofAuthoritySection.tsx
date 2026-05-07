// =============================================================================
// ProofAuthoritySection — 4-tab strategic Trust/Proof/Persuasion module.
// Text-first. No file uploads. Optional external links only.
// =============================================================================

import { useCallback } from "react";
import {
  Award, Users2, MessageSquareWarning, BookOpen, Plus, Trash2, Link as LinkIcon,
  Sparkles, Shield, Star, BadgeCheck, BarChart3, Quote, Trophy, Lightbulb, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelectChips from "./offer/MultiSelectChips";
import {
  type ProofAuthorityData,
  type AuthorityPositioningData,
  type SocialProofData,
  type ObjectionsBeliefsData,
  type EducationalMessagingData,
  type FounderStory,
  type CredibilityMetric,
  type ClientResult,
  type Testimonial,
  type AuthorityAsset,
  type Objection,
  type FailedSolution,
  type FAQ,
  type ValueLesson,
  type CommonMistake,
  type BeliefShift,
  AUTHORITY_TYPE_OPTIONS,
  CREDIBILITY_FOUNDATION_OPTIONS,
  EMOTIONAL_THEME_OPTIONS,
  PROOF_TYPE_OPTIONS,
  TONE_OPTIONS,
  CTA_GOAL_OPTIONS,
  calcProofAuthorityProgress,
} from "./proofAuthorityTypes";

interface Props {
  data: ProofAuthorityData;
  onChange: (patch: Partial<ProofAuthorityData>) => void;
  saving: boolean;
}

const newId = () => crypto.randomUUID();

// ----- Shared building blocks -----

const SectionCard = ({
  icon: Icon,
  title,
  description,
  count,
  onAdd,
  addLabel,
  children,
}: {
  icon: any;
  title: string;
  description?: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="text-lg font-display font-bold text-foreground">{title}</h3>
          {typeof count === "number" && count > 0 && (
            <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {count}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {onAdd && (
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5 h-8 shrink-0">
          <Plus className="w-3.5 h-3.5" />
          {addLabel ?? "Add"}
        </Button>
      )}
    </div>
    <div className="p-5 space-y-3">{children}</div>
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

const EntryShell = ({
  index,
  onDelete,
  children,
  badge,
}: {
  index?: number;
  onDelete: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border bg-background p-4 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {typeof index === "number" && (
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
            {index + 1}
          </span>
        )}
        {badge}
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
    {children}
  </div>
);

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground/70 mt-1">{hint}</p>}
  </div>
);

const LinkField = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
      <LinkIcon className="w-3 h-3" /> External Link <span className="text-muted-foreground/60">(optional)</span>
    </Label>
    <Input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="https://… (Loom, YouTube, article, etc.)"
      className="h-9 text-sm"
    />
  </div>
);

// ============================================================================
// Tab 1 — Authority Positioning
// ============================================================================

const AuthorityTab = ({
  data,
  onChange,
}: {
  data: AuthorityPositioningData;
  onChange: (patch: Partial<AuthorityPositioningData>) => void;
}) => {
  const stories = data.founder_stories;
  const updateStory = (id: string, patch: Partial<FounderStory>) =>
    onChange({ founder_stories: stories.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeStory = (id: string) => onChange({ founder_stories: stories.filter((s) => s.id !== id) });
  const addStory = () =>
    onChange({ founder_stories: [...stories, { id: newId() }] });

  return (
    <div className="space-y-5">
      <SectionCard icon={BadgeCheck} title="Authority Type" description="How would your authority best be described?">
        <MultiSelectChips
          options={AUTHORITY_TYPE_OPTIONS}
          value={data.authority_types}
          onChange={(authority_types) => onChange({ authority_types })}
        />
      </SectionCard>

      <SectionCard icon={Shield} title="Credibility Foundations" description="What underpins your credibility?">
        <MultiSelectChips
          options={CREDIBILITY_FOUNDATION_OPTIONS}
          value={data.credibility_foundations}
          onChange={(credibility_foundations) => onChange({ credibility_foundations })}
        />
      </SectionCard>

      <SectionCard icon={Sparkles} title="Why should clients trust you?">
        <AutoTextarea
          value={data.trust_reason ?? ""}
          onChange={(e) => onChange({ trust_reason: e.target.value })}
          placeholder="Explain in your own words why prospects should trust you over alternatives…"
          rows={4}
          className="text-sm resize-none"
        />
      </SectionCard>

      <SectionCard icon={Star} title="Signature Proof" description="The single strongest piece of proof or credibility your business has.">
        <AutoTextarea
          value={data.signature_proof ?? ""}
          onChange={(e) => onChange({ signature_proof: e.target.value })}
          placeholder="e.g. Helped 312 SaaS founders go from $0 to $30K MRR using the same playbook."
          rows={3}
          className="text-sm resize-none"
        />
      </SectionCard>

      <SectionCard
        icon={BookOpen}
        title="Founder Stories"
        description="Reusable narrative arcs the AI can draw from for ads, VSLs, emails…"
        count={stories.length}
        onAdd={addStory}
        addLabel="Add Story"
      >
        {stories.length === 0 ? (
          <EmptyHint text="No founder stories yet. Add the most defining moments of your journey." />
        ) : (
          stories.map((s, i) => (
            <EntryShell key={s.id} index={i} onDelete={() => removeStory(s.id)}>
              <Field label="Story Title">
                <Input
                  value={s.title ?? ""}
                  onChange={(e) => updateStory(s.id, { title: e.target.value })}
                  placeholder="e.g. From burnout to building my first 7-figure offer"
                  className="h-9 text-sm"
                />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Before Situation">
                  <AutoTextarea
                    value={s.before ?? ""}
                    onChange={(e) => updateStory(s.id, { before: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </Field>
                <Field label="Main Challenge">
                  <AutoTextarea
                    value={s.challenge ?? ""}
                    onChange={(e) => updateStory(s.id, { challenge: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </Field>
                <Field label="Breakthrough Moment">
                  <AutoTextarea
                    value={s.breakthrough ?? ""}
                    onChange={(e) => updateStory(s.id, { breakthrough: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </Field>
                <Field label="What Was Learned">
                  <AutoTextarea
                    value={s.learned ?? ""}
                    onChange={(e) => updateStory(s.id, { learned: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </Field>
                <Field label="After Situation">
                  <AutoTextarea
                    value={s.after ?? ""}
                    onChange={(e) => updateStory(s.id, { after: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </Field>
                <Field label="Core Lesson">
                  <AutoTextarea
                    value={s.core_lesson ?? ""}
                    onChange={(e) => updateStory(s.id, { core_lesson: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </Field>
              </div>
              <Field label="Emotional Theme">
                <MultiSelectChips
                  options={EMOTIONAL_THEME_OPTIONS}
                  value={s.emotional_theme ? [s.emotional_theme] : []}
                  onChange={(v) => updateStory(s.id, { emotional_theme: v[v.length - 1] ?? "" })}
                />
              </Field>
              <LinkField value={s.external_link} onChange={(v) => updateStory(s.id, { external_link: v })} />
            </EntryShell>
          ))
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================================
// Tab 2 — Social Proof Library
// ============================================================================

const SocialProofTab = ({
  data,
  onChange,
}: {
  data: SocialProofData;
  onChange: (patch: Partial<SocialProofData>) => void;
}) => {
  // Metrics
  const updateMetric = (id: string, patch: Partial<CredibilityMetric>) =>
    onChange({ metrics: data.metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const removeMetric = (id: string) => onChange({ metrics: data.metrics.filter((m) => m.id !== id) });
  const addMetric = () => onChange({ metrics: [...data.metrics, { id: newId() }] });

  // Client results
  const updateResult = (id: string, patch: Partial<ClientResult>) =>
    onChange({ client_results: data.client_results.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const removeResult = (id: string) => onChange({ client_results: data.client_results.filter((r) => r.id !== id) });
  const addResult = () => onChange({ client_results: [...data.client_results, { id: newId() }] });

  // Testimonials
  const updateTesti = (id: string, patch: Partial<Testimonial>) =>
    onChange({ testimonials: data.testimonials.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const removeTesti = (id: string) => onChange({ testimonials: data.testimonials.filter((t) => t.id !== id) });
  const addTesti = () => onChange({ testimonials: [...data.testimonials, { id: newId() }] });

  // Authority assets
  const updateAsset = (id: string, patch: Partial<AuthorityAsset>) =>
    onChange({ authority_assets: data.authority_assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const removeAsset = (id: string) => onChange({ authority_assets: data.authority_assets.filter((a) => a.id !== id) });
  const addAsset = () => onChange({ authority_assets: [...data.authority_assets, { id: newId() }] });

  return (
    <div className="space-y-5">
      <SectionCard
        icon={BarChart3}
        title="Credibility Metrics"
        description="Hard numbers that anchor your authority."
        count={data.metrics.length}
        onAdd={addMetric}
        addLabel="Add Metric"
      >
        {data.metrics.length === 0 ? (
          <EmptyHint text="e.g. years in business, clients helped, revenue generated…" />
        ) : (
          data.metrics.map((m, i) => (
            <EntryShell key={m.id} index={i} onDelete={() => removeMetric(m.id)}>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Metric">
                  <Input value={m.metric ?? ""} onChange={(e) => updateMetric(m.id, { metric: e.target.value })} placeholder="Clients helped" className="h-9 text-sm" />
                </Field>
                <Field label="Value">
                  <Input value={m.value ?? ""} onChange={(e) => updateMetric(m.id, { value: e.target.value })} placeholder="312" className="h-9 text-sm" />
                </Field>
                <Field label="Short Context">
                  <Input value={m.context ?? ""} onChange={(e) => updateMetric(m.id, { context: e.target.value })} placeholder="…in the last 24 months" className="h-9 text-sm" />
                </Field>
              </div>
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={Trophy}
        title="Client Results"
        description="Structured case-study-ready outcomes."
        count={data.client_results.length}
        onAdd={addResult}
        addLabel="Add Result"
      >
        {data.client_results.length === 0 ? (
          <EmptyHint text="Add the wins you reach for in sales calls." />
        ) : (
          data.client_results.map((r, i) => (
            <EntryShell key={r.id} index={i} onDelete={() => removeResult(r.id)}>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Client Type"><Input value={r.client_type ?? ""} onChange={(e) => updateResult(r.id, { client_type: e.target.value })} className="h-9 text-sm" /></Field>
                <Field label="Timeframe"><Input value={r.timeframe ?? ""} onChange={(e) => updateResult(r.id, { timeframe: e.target.value })} placeholder="90 days" className="h-9 text-sm" /></Field>
                <Field label="Problem">
                  <AutoTextarea value={r.problem ?? ""} onChange={(e) => updateResult(r.id, { problem: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Result Achieved">
                  <AutoTextarea value={r.result_achieved ?? ""} onChange={(e) => updateResult(r.id, { result_achieved: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Short Explanation">
                  <AutoTextarea value={r.explanation ?? ""} onChange={(e) => updateResult(r.id, { explanation: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Measurable Outcome">
                  <Input value={r.measurable_outcome ?? ""} onChange={(e) => updateResult(r.id, { measurable_outcome: e.target.value })} placeholder="+312% MRR" className="h-9 text-sm" />
                </Field>
              </div>
              <Field label="Quote / Testimonial">
                <AutoTextarea value={r.quote ?? ""} onChange={(e) => updateResult(r.id, { quote: e.target.value })} rows={2} className="text-sm resize-none" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Proof Type">
                  <Select value={r.proof_type ?? ""} onValueChange={(v) => updateResult(r.id, { proof_type: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {PROOF_TYPE_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
                <LinkField value={r.external_link} onChange={(v) => updateResult(r.id, { external_link: v })} />
              </div>
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={Quote}
        title="Testimonials"
        description="Reusable quotes by tone and outcome."
        count={data.testimonials.length}
        onAdd={addTesti}
        addLabel="Add Testimonial"
      >
        {data.testimonials.length === 0 ? (
          <EmptyHint text="Add quotes you can plug into ads, sales pages and emails." />
        ) : (
          data.testimonials.map((t, i) => (
            <EntryShell key={t.id} index={i} onDelete={() => removeTesti(t.id)}>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Client Name"><Input value={t.client_name ?? ""} onChange={(e) => updateTesti(t.id, { client_name: e.target.value })} className="h-9 text-sm" /></Field>
                <Field label="Client Type"><Input value={t.client_type ?? ""} onChange={(e) => updateTesti(t.id, { client_type: e.target.value })} className="h-9 text-sm" /></Field>
              </div>
              <Field label="Testimonial Quote">
                <AutoTextarea value={t.quote ?? ""} onChange={(e) => updateTesti(t.id, { quote: e.target.value })} rows={3} className="text-sm resize-none" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Main Outcome">
                  <Input value={t.main_outcome ?? ""} onChange={(e) => updateTesti(t.id, { main_outcome: e.target.value })} className="h-9 text-sm" />
                </Field>
                <Field label="Tone">
                  <Select value={t.tone ?? ""} onValueChange={(v) => updateTesti(t.id, { tone: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select tone…" /></SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <LinkField value={t.external_link} onChange={(v) => updateTesti(t.id, { external_link: v })} />
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={BadgeCheck}
        title="Authority Assets"
        description="Press, podcasts, awards, certifications, partnerships…"
        count={data.authority_assets.length}
        onAdd={addAsset}
        addLabel="Add Asset"
      >
        {data.authority_assets.length === 0 ? (
          <EmptyHint text="Add anything that signals expertise and recognition." />
        ) : (
          data.authority_assets.map((a, i) => (
            <EntryShell key={a.id} index={i} onDelete={() => removeAsset(a.id)}>
              <Field label="Asset Name">
                <Input value={a.name ?? ""} onChange={(e) => updateAsset(a.id, { name: e.target.value })} placeholder="My First Million podcast appearance" className="h-9 text-sm" />
              </Field>
              <Field label="Description">
                <AutoTextarea value={a.description ?? ""} onChange={(e) => updateAsset(a.id, { description: e.target.value })} rows={2} className="text-sm resize-none" />
              </Field>
              <Field label="Why It Matters">
                <AutoTextarea value={a.why_it_matters ?? ""} onChange={(e) => updateAsset(a.id, { why_it_matters: e.target.value })} rows={2} className="text-sm resize-none" />
              </Field>
              <LinkField value={a.external_link} onChange={(v) => updateAsset(a.id, { external_link: v })} />
            </EntryShell>
          ))
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================================
// Tab 3 — Objections & Beliefs
// ============================================================================

const ObjectionsTab = ({
  data,
  onChange,
}: {
  data: ObjectionsBeliefsData;
  onChange: (patch: Partial<ObjectionsBeliefsData>) => void;
}) => {
  const updateObj = (id: string, patch: Partial<Objection>) =>
    onChange({ objections: data.objections.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const removeObj = (id: string) => onChange({ objections: data.objections.filter((o) => o.id !== id) });
  const addObj = () => onChange({ objections: [...data.objections, { id: newId() }] });

  const updateFail = (id: string, patch: Partial<FailedSolution>) =>
    onChange({ failed_solutions: data.failed_solutions.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const removeFail = (id: string) => onChange({ failed_solutions: data.failed_solutions.filter((o) => o.id !== id) });
  const addFail = () => onChange({ failed_solutions: [...data.failed_solutions, { id: newId() }] });

  const updateFaq = (id: string, patch: Partial<FAQ>) =>
    onChange({ faqs: data.faqs.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const removeFaq = (id: string) => onChange({ faqs: data.faqs.filter((o) => o.id !== id) });
  const addFaq = () => onChange({ faqs: [...data.faqs, { id: newId() }] });

  return (
    <div className="space-y-5">
      <SectionCard
        icon={MessageSquareWarning}
        title="Common Objections"
        description="Capture objections + how to reframe them."
        count={data.objections.length}
        onAdd={addObj}
        addLabel="Add Objection"
      >
        {data.objections.length === 0 ? (
          <EmptyHint text={`e.g. "I don't have time" — capture the belief, the rebuttal and the proof.`} />
        ) : (
          data.objections.map((o, i) => (
            <EntryShell key={o.id} index={i} onDelete={() => removeObj(o.id)}>
              <Field label="Objection">
                <Input value={o.objection ?? ""} onChange={(e) => updateObj(o.id, { objection: e.target.value })} className="h-9 text-sm" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Why People Believe This">
                  <AutoTextarea value={o.why_believed ?? ""} onChange={(e) => updateObj(o.id, { why_believed: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Reframe / Rebuttal">
                  <AutoTextarea value={o.reframe ?? ""} onChange={(e) => updateObj(o.id, { reframe: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Supporting Proof">
                  <AutoTextarea value={o.supporting_proof ?? ""} onChange={(e) => updateObj(o.id, { supporting_proof: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Emotional Concern Behind It">
                  <AutoTextarea value={o.emotional_concern ?? ""} onChange={(e) => updateObj(o.id, { emotional_concern: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
              </div>
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={AlertTriangle}
        title="Failed Previous Solutions"
        description="What they tried before and why your approach is different."
        count={data.failed_solutions.length}
        onAdd={addFail}
        addLabel="Add Solution"
      >
        {data.failed_solutions.length === 0 ? (
          <EmptyHint text="Knowing what didn't work helps the AI position you against alternatives." />
        ) : (
          data.failed_solutions.map((o, i) => (
            <EntryShell key={o.id} index={i} onDelete={() => removeFail(o.id)}>
              <Field label="What They Tried">
                <Input value={o.what_tried ?? ""} onChange={(e) => updateFail(o.id, { what_tried: e.target.value })} className="h-9 text-sm" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Why It Failed">
                  <AutoTextarea value={o.why_failed ?? ""} onChange={(e) => updateFail(o.id, { why_failed: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Why Your Approach Is Different">
                  <AutoTextarea value={o.why_different ?? ""} onChange={(e) => updateFail(o.id, { why_different: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
              </div>
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={MessageSquareWarning}
        title="FAQ / Common Questions"
        count={data.faqs.length}
        onAdd={addFaq}
        addLabel="Add FAQ"
      >
        {data.faqs.length === 0 ? (
          <EmptyHint text="Pre-empt the questions people always ask." />
        ) : (
          data.faqs.map((o, i) => (
            <EntryShell key={o.id} index={i} onDelete={() => removeFaq(o.id)}>
              <Field label="Question">
                <Input value={o.question ?? ""} onChange={(e) => updateFaq(o.id, { question: e.target.value })} className="h-9 text-sm" />
              </Field>
              <Field label="Answer">
                <AutoTextarea value={o.answer ?? ""} onChange={(e) => updateFaq(o.id, { answer: e.target.value })} rows={3} className="text-sm resize-none" />
              </Field>
            </EntryShell>
          ))
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================================
// Tab 4 — Educational Messaging
// ============================================================================

const EducationalTab = ({
  data,
  onChange,
}: {
  data: EducationalMessagingData;
  onChange: (patch: Partial<EducationalMessagingData>) => void;
}) => {
  const updateLesson = (id: string, patch: Partial<ValueLesson>) =>
    onChange({ lessons: data.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const removeLesson = (id: string) => onChange({ lessons: data.lessons.filter((l) => l.id !== id) });
  const addLesson = () => onChange({ lessons: [...data.lessons, { id: newId() }] });

  const updateMistake = (id: string, patch: Partial<CommonMistake>) =>
    onChange({ mistakes: data.mistakes.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const removeMistake = (id: string) => onChange({ mistakes: data.mistakes.filter((l) => l.id !== id) });
  const addMistake = () => onChange({ mistakes: [...data.mistakes, { id: newId() }] });

  const updateShift = (id: string, patch: Partial<BeliefShift>) =>
    onChange({ belief_shifts: data.belief_shifts.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const removeShift = (id: string) => onChange({ belief_shifts: data.belief_shifts.filter((l) => l.id !== id) });
  const addShift = () => onChange({ belief_shifts: [...data.belief_shifts, { id: newId() }] });

  return (
    <div className="space-y-5">
      <SectionCard
        icon={Lightbulb}
        title="Value Lessons"
        description="Reusable insights for content, nurture and education."
        count={data.lessons.length}
        onAdd={addLesson}
        addLabel="Add Lesson"
      >
        {data.lessons.length === 0 ? (
          <EmptyHint text="Each lesson becomes raw material for emails, posts, VSLs, ads…" />
        ) : (
          data.lessons.map((l, i) => (
            <EntryShell key={l.id} index={i} onDelete={() => removeLesson(l.id)}>
              <Field label="Lesson Title">
                <Input value={l.title ?? ""} onChange={(e) => updateLesson(l.id, { title: e.target.value })} className="h-9 text-sm" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Main Topic"><Input value={l.main_topic ?? ""} onChange={(e) => updateLesson(l.id, { main_topic: e.target.value })} className="h-9 text-sm" /></Field>
                <Field label="Common Challenge"><Input value={l.common_challenge ?? ""} onChange={(e) => updateLesson(l.id, { common_challenge: e.target.value })} className="h-9 text-sm" /></Field>
                <Field label="Core Insight">
                  <AutoTextarea value={l.core_insight ?? ""} onChange={(e) => updateLesson(l.id, { core_insight: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Why This Matters">
                  <AutoTextarea value={l.why_matters ?? ""} onChange={(e) => updateLesson(l.id, { why_matters: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Main Breakthrough Lesson">
                  <AutoTextarea value={l.breakthrough_lesson ?? ""} onChange={(e) => updateLesson(l.id, { breakthrough_lesson: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="CTA Goal">
                  <Select value={l.cta_goal ?? ""} onValueChange={(v) => updateLesson(l.id, { cta_goal: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select goal…" /></SelectTrigger>
                    <SelectContent>
                      {CTA_GOAL_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={AlertTriangle}
        title="Common Mistakes"
        count={data.mistakes.length}
        onAdd={addMistake}
        addLabel="Add Mistake"
      >
        {data.mistakes.length === 0 ? (
          <EmptyHint text="Mistakes prospects make = great hooks for ads and content." />
        ) : (
          data.mistakes.map((m, i) => (
            <EntryShell key={m.id} index={i} onDelete={() => removeMistake(m.id)}>
              <Field label="Mistake">
                <Input value={m.mistake ?? ""} onChange={(e) => updateMistake(m.id, { mistake: e.target.value })} className="h-9 text-sm" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Why People Make It">
                  <AutoTextarea value={m.why_made ?? ""} onChange={(e) => updateMistake(m.id, { why_made: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Better Approach">
                  <AutoTextarea value={m.better_approach ?? ""} onChange={(e) => updateMistake(m.id, { better_approach: e.target.value })} rows={2} className="text-sm resize-none" />
                </Field>
              </div>
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={RefreshCw}
        title="Key Belief Shifts"
        count={data.belief_shifts.length}
        onAdd={addShift}
        addLabel="Add Shift"
      >
        {data.belief_shifts.length === 0 ? (
          <EmptyHint text="The 'Old vs New' belief frame fuels great copy." />
        ) : (
          data.belief_shifts.map((s, i) => (
            <EntryShell key={s.id} index={i} onDelete={() => removeShift(s.id)}>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Old Belief"><AutoTextarea value={s.old_belief ?? ""} onChange={(e) => updateShift(s.id, { old_belief: e.target.value })} rows={2} className="text-sm resize-none" /></Field>
                <Field label="New Belief"><AutoTextarea value={s.new_belief ?? ""} onChange={(e) => updateShift(s.id, { new_belief: e.target.value })} rows={2} className="text-sm resize-none" /></Field>
              </div>
              <Field label="Why This Shift Matters">
                <AutoTextarea value={s.why_matters ?? ""} onChange={(e) => updateShift(s.id, { why_matters: e.target.value })} rows={2} className="text-sm resize-none" />
              </Field>
            </EntryShell>
          ))
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================================
// Main module
// ============================================================================

const ProofAuthoritySection = ({ data, onChange, saving }: Props) => {
  const progress = calcProofAuthorityProgress(data);

  const updateAuthority = useCallback(
    (patch: Partial<AuthorityPositioningData>) => onChange({ authority: { ...data.authority, ...patch } }),
    [data.authority, onChange],
  );
  const updateSocial = useCallback(
    (patch: Partial<SocialProofData>) => onChange({ social_proof: { ...data.social_proof, ...patch } }),
    [data.social_proof, onChange],
  );
  const updateObj = useCallback(
    (patch: Partial<ObjectionsBeliefsData>) => onChange({ objections: { ...data.objections, ...patch } }),
    [data.objections, onChange],
  );
  const updateEdu = useCallback(
    (patch: Partial<EducationalMessagingData>) => onChange({ educational: { ...data.educational, ...patch } }),
    [data.educational, onChange],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-display font-bold text-foreground">Proof & Authority</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Build the centralized trust, proof and persuasion library that powers every funnel, page and message.
            </p>
          </div>
          {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
        </div>

        <Tabs defaultValue="authority" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 h-auto">
            <TabsTrigger value="authority" className="gap-1.5"><BadgeCheck className="w-3.5 h-3.5" />Authority Positioning</TabsTrigger>
            <TabsTrigger value="social" className="gap-1.5"><Users2 className="w-3.5 h-3.5" />Social Proof</TabsTrigger>
            <TabsTrigger value="objections" className="gap-1.5"><MessageSquareWarning className="w-3.5 h-3.5" />Objections & Beliefs</TabsTrigger>
            <TabsTrigger value="educational" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" />Educational</TabsTrigger>
          </TabsList>
          <TabsContent value="authority"><AuthorityTab data={data.authority} onChange={updateAuthority} /></TabsContent>
          <TabsContent value="social"><SocialProofTab data={data.social_proof} onChange={updateSocial} /></TabsContent>
          <TabsContent value="objections"><ObjectionsTab data={data.objections} onChange={updateObj} /></TabsContent>
          <TabsContent value="educational"><EducationalTab data={data.educational} onChange={updateEdu} /></TabsContent>
        </Tabs>

        <div className="mt-6 px-1">
          <Progress value={progress} className="h-1" />
        </div>
      </div>
    </div>
  );
};

export default ProofAuthoritySection;
