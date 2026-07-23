// =============================================================================
// AuthorityContentSection (file: ProofAuthoritySection.tsx) — "Authority & Content".
// V3: 3 tabs — Authority Positioning · Social Proof · Stories & Lessons.
// Objections & Beliefs moved to the offer level (see OfferEditor "Objections / FAQ").
// Text-first. No file uploads. Optional external links only.
// =============================================================================

import { useState } from "react";
import {
  Award, Users2, BookOpen, Plus, Trash2, Link as LinkIcon,
  Sparkles, Shield, Star, BadgeCheck, BarChart3, Quote, Trophy, Lightbulb, Check, Info,
  MessageSquare,
} from "lucide-react";
import CoachPanel from "@/components/coach/CoachPanel";
import { buildBlueprintSectionContext } from "@/lib/coach/buildContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { BlueprintRow } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelectChips from "./offer/MultiSelectChips";
import OfferAssociationPicker from "./offer/OfferAssociationPicker";
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
  type ValueLesson,
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

type TabId = "authority" | "social" | "stories";

const TABS: { id: TabId; label: string; icon: typeof Award; description: string; insight: string }[] = [
  {
    id: "authority",
    label: "Authority Positioning",
    icon: BadgeCheck,
    description: "Define how your authority should be perceived in the market.",
    insight: "Strong positioning is the foundation. Without clarity on your authority type and credibility, all other proof feels generic.",
  },
  {
    id: "social",
    label: "Social Proof Library",
    icon: Users2,
    description: "Reusable proof assets — metrics, results, testimonials and authority signals.",
    insight: "AI copy is only as persuasive as the proof you feed it. Specific numbers, named clients and structured outcomes outperform vague claims every time.",
  },
  {
    id: "stories",
    label: "Stories & Lessons",
    icon: BookOpen,
    description: "Reusable narrative arcs and value lessons for nurture, VSLs, webinars and content.",
    insight: "Stories and lessons are the raw material of every great campaign. Capture them once, reuse them everywhere.",
  },
];

// ===== Shared building blocks =====

const SectionCard = ({
  icon: Icon, title, description, count, onAdd, addLabel, children,
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
  index, onDelete, children, badge,
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
        size="icon" variant="ghost" onClick={onDelete}
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
    {children}
  </div>
);

const Field = ({
  label, hint, children,
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
  value, onChange,
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
  data, onChange,
}: {
  data: AuthorityPositioningData;
  onChange: (patch: Partial<AuthorityPositioningData>) => void;
}) => (
  <div className="space-y-5">
    <SectionCard icon={BadgeCheck} title="Authority Type" description="How would your authority best be described?">
      <MultiSelectChips
        options={AUTHORITY_TYPE_OPTIONS}
        value={data.authority_types}
        onChange={(authority_types) => onChange({ authority_types })}
        allowCustom
      />
    </SectionCard>

    <SectionCard icon={Shield} title="Credibility Foundations" description="What underpins your credibility? Pick all that apply.">
      <MultiSelectChips
        options={CREDIBILITY_FOUNDATION_OPTIONS}
        value={data.credibility_foundations}
        onChange={(credibility_foundations) => onChange({ credibility_foundations })}
        allowCustom
      />
    </SectionCard>

    <SectionCard icon={Sparkles} title="Why Should Clients Trust You?" description="The narrative reason prospects should choose you over the alternatives.">
      <AutoTextarea
        value={data.trust_reason ?? ""}
        onChange={(e) => onChange({ trust_reason: e.target.value })}
        placeholder="e.g. I've spent the last 8 years inside 40+ coaching businesses, helping them go from inconsistent launches to predictable $50K months — using the exact systems I now teach."
        rows={4}
        className="text-sm resize-none"
      />
    </SectionCard>

    <SectionCard icon={Star} title="Signature Proof" description="The single strongest piece of proof or credibility your business has.">
      <AutoTextarea
        value={data.signature_proof ?? ""}
        onChange={(e) => onChange({ signature_proof: e.target.value })}
        placeholder="e.g. Helped 312 SaaS founders go from $0 to $30K MRR using the same playbook — featured in TechCrunch and Forbes."
        rows={3}
        className="text-sm resize-none"
      />
    </SectionCard>
  </div>
);

// ============================================================================
// Tab 2 — Social Proof Library
// ============================================================================

const SocialProofTab = ({
  data, onChange,
}: {
  data: SocialProofData;
  onChange: (patch: Partial<SocialProofData>) => void;
}) => {
  const updateMetric = (id: string, patch: Partial<CredibilityMetric>) =>
    onChange({ metrics: data.metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const removeMetric = (id: string) => onChange({ metrics: data.metrics.filter((m) => m.id !== id) });
  const addMetric = () => onChange({ metrics: [...data.metrics, { id: newId() }] });

  const updateResult = (id: string, patch: Partial<ClientResult>) =>
    onChange({ client_results: data.client_results.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const removeResult = (id: string) => onChange({ client_results: data.client_results.filter((r) => r.id !== id) });
  const addResult = () => onChange({ client_results: [...data.client_results, { id: newId() }] });

  const updateTesti = (id: string, patch: Partial<Testimonial>) =>
    onChange({ testimonials: data.testimonials.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const removeTesti = (id: string) => onChange({ testimonials: data.testimonials.filter((t) => t.id !== id) });
  const addTesti = () => onChange({ testimonials: [...data.testimonials, { id: newId() }] });

  const updateAsset = (id: string, patch: Partial<AuthorityAsset>) =>
    onChange({ authority_assets: data.authority_assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const removeAsset = (id: string) => onChange({ authority_assets: data.authority_assets.filter((a) => a.id !== id) });
  const addAsset = () => onChange({ authority_assets: [...data.authority_assets, { id: newId() }] });

  return (
    <div className="space-y-5">
      <SectionCard
        icon={BarChart3}
        title="Credibility Metrics"
        description="Hard numbers that anchor your authority — years in business, clients helped, revenue generated, audience size…"
        count={data.metrics.length}
        onAdd={addMetric}
        addLabel="Add Metric"
      >
        {data.metrics.length === 0 ? (
          <EmptyHint text="e.g. years in business, clients helped, revenue generated, audience size, retention rate…" />
        ) : (
          data.metrics.map((m, i) => (
            <EntryShell key={m.id} index={i} onDelete={() => removeMetric(m.id)}>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Metric"><Input value={m.metric ?? ""} onChange={(e) => updateMetric(m.id, { metric: e.target.value })} placeholder="Clients helped" className="h-9 text-sm" /></Field>
                <Field label="Value"><Input value={m.value ?? ""} onChange={(e) => updateMetric(m.id, { value: e.target.value })} placeholder="312" className="h-9 text-sm" /></Field>
                <Field label="Short Context"><Input value={m.context ?? ""} onChange={(e) => updateMetric(m.id, { context: e.target.value })} placeholder="…in the last 24 months" className="h-9 text-sm" /></Field>
              </div>
            </EntryShell>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={Trophy}
        title="Client Results"
        description="Structured case-study-ready outcomes you can plug into pages, ads and emails."
        count={data.client_results.length}
        onAdd={addResult}
        addLabel="Add Result"
      >
        {data.client_results.length === 0 ? (
          <EmptyHint text="Add the wins you reach for in sales calls. The more specific, the more usable." />
        ) : (
          data.client_results.map((r, i) => (
            <EntryShell key={r.id} index={i} onDelete={() => removeResult(r.id)}>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Client Type"><Input value={r.client_type ?? ""} onChange={(e) => updateResult(r.id, { client_type: e.target.value })} placeholder="SaaS founder, $0–$10K MRR" className="h-9 text-sm" /></Field>
                <Field label="Timeframe"><Input value={r.timeframe ?? ""} onChange={(e) => updateResult(r.id, { timeframe: e.target.value })} placeholder="90 days" className="h-9 text-sm" /></Field>
                <Field label="Problem">
                  <AutoTextarea value={r.problem ?? ""} onChange={(e) => updateResult(r.id, { problem: e.target.value })} placeholder="Stuck under $5K MRR, no consistent acquisition channel…" rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Result Achieved">
                  <AutoTextarea value={r.result_achieved ?? ""} onChange={(e) => updateResult(r.id, { result_achieved: e.target.value })} placeholder="Hit $32K MRR with one repeatable channel" rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Short Explanation">
                  <AutoTextarea value={r.explanation ?? ""} onChange={(e) => updateResult(r.id, { explanation: e.target.value })} placeholder="We rebuilt their ICP, redesigned the offer and installed an outbound system." rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="Measurable Outcome">
                  <Input value={r.measurable_outcome ?? ""} onChange={(e) => updateResult(r.id, { measurable_outcome: e.target.value })} placeholder="+540% MRR in 12 weeks" className="h-9 text-sm" />
                </Field>
              </div>
              <Field label="Quote / Testimonial">
                <AutoTextarea value={r.quote ?? ""} onChange={(e) => updateResult(r.id, { quote: e.target.value })} placeholder={`"This was the first system that actually moved the needle for us."`} rows={2} className="text-sm resize-none" />
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
        description="Reusable quotes — categorized by tone and main outcome."
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
                <Field label="Client Name"><Input value={t.client_name ?? ""} onChange={(e) => updateTesti(t.id, { client_name: e.target.value })} placeholder="Sarah K." className="h-9 text-sm" /></Field>
                <Field label="Client Type"><Input value={t.client_type ?? ""} onChange={(e) => updateTesti(t.id, { client_type: e.target.value })} placeholder="Health coach, 2 yrs in" className="h-9 text-sm" /></Field>
              </div>
              <Field label="Testimonial Quote">
                <AutoTextarea value={t.quote ?? ""} onChange={(e) => updateTesti(t.id, { quote: e.target.value })} placeholder={`"I went from chasing leads on Instagram to a fully booked calendar in under 60 days."`} rows={3} className="text-sm resize-none" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Main Outcome">
                  <Input value={t.main_outcome ?? ""} onChange={(e) => updateTesti(t.id, { main_outcome: e.target.value })} placeholder="Booked-out calendar in 60 days" className="h-9 text-sm" />
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
        description="Podcasts, talks, certifications, awards, press mentions, collaborations, books, media features…"
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
                <Input value={a.name ?? ""} onChange={(e) => updateAsset(a.id, { name: e.target.value })} placeholder="Guest on My First Million podcast" className="h-9 text-sm" />
              </Field>
              <Field label="Description">
                <AutoTextarea value={a.description ?? ""} onChange={(e) => updateAsset(a.id, { description: e.target.value })} placeholder="60-min interview about our founder-led GTM playbook." rows={2} className="text-sm resize-none" />
              </Field>
              <Field label="Why It Matters">
                <AutoTextarea value={a.why_it_matters ?? ""} onChange={(e) => updateAsset(a.id, { why_it_matters: e.target.value })} placeholder="Validates our methodology in front of a 2M+ founder audience." rows={2} className="text-sm resize-none" />
              </Field>
              <LinkField value={a.external_link} onChange={(v) => updateAsset(a.id, { external_link: v })} />
            </EntryShell>
          ))
        )}
      </SectionCard>
    </div>
  );
};

// (Objections & Beliefs tab removed in V3 — objections live at the offer level.)

// ============================================================================
// Tab 4 — Stories & Educational Assets
// ============================================================================

const StoriesTab = ({
  authority, educational, onChangeAuthority, onChangeEducational,
}: {
  authority: AuthorityPositioningData;
  educational: EducationalMessagingData;
  onChangeAuthority: (patch: Partial<AuthorityPositioningData>) => void;
  onChangeEducational: (patch: Partial<EducationalMessagingData>) => void;
}) => {
  const stories = authority.founder_stories;
  const updateStory = (id: string, patch: Partial<FounderStory>) =>
    onChangeAuthority({ founder_stories: stories.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeStory = (id: string) => onChangeAuthority({ founder_stories: stories.filter((s) => s.id !== id) });
  const addStory = () => onChangeAuthority({ founder_stories: [...stories, { id: newId() }] });

  const lessons = educational.lessons;
  const updateLesson = (id: string, patch: Partial<ValueLesson>) =>
    onChangeEducational({ lessons: lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const removeLesson = (id: string) => onChangeEducational({ lessons: lessons.filter((l) => l.id !== id) });
  const addLesson = () => onChangeEducational({ lessons: [...lessons, { id: newId() }] });

  return (
    <div className="space-y-5">
      <SectionCard
        icon={BookOpen}
        title="Stories"
        description="Reusable narrative arcs for nurture, VSLs, webinars, founder-led content and authority pieces."
        count={stories.length}
        onAdd={addStory}
        addLabel="Add Story"
      >
        {stories.length === 0 ? (
          <EmptyHint text="Add the most defining moments of your journey — each becomes raw material for AI copy." />
        ) : (
          stories.map((s, i) => (
            <EntryShell key={s.id} index={i} onDelete={() => removeStory(s.id)}>
              <Field label="Story Title">
                <Input
                  value={s.title ?? ""}
                  onChange={(e) => updateStory(s.id, { title: e.target.value })}
                  placeholder="From burnout to building my first 7-figure offer"
                  className="h-9 text-sm"
                />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="My before situation was">
                  <AutoTextarea
                    value={s.before ?? ""}
                    onChange={(e) => updateStory(s.id, { before: e.target.value })}
                    placeholder="Struggling to get clients consistently despite posting content every day…"
                    rows={3} className="text-sm resize-none"
                  />
                </Field>
                <Field label="The challenge I was having is">
                  <AutoTextarea
                    value={s.challenge ?? ""}
                    onChange={(e) => updateStory(s.id, { challenge: e.target.value })}
                    placeholder="I was trading time for money, working nights and weekends with no real growth."
                    rows={3} className="text-sm resize-none"
                  />
                </Field>
                <Field label="Eventually what happened that allowed me to overcome it was">
                  <AutoTextarea
                    value={s.breakthrough ?? ""}
                    onChange={(e) => updateStory(s.id, { breakthrough: e.target.value })}
                    placeholder="I rebuilt my offer around a single outcome and installed one acquisition system."
                    rows={3} className="text-sm resize-none"
                  />
                </Field>
                <Field label="In the process of the breakthrough I learned">
                  <AutoTextarea
                    value={s.learned ?? ""}
                    onChange={(e) => updateStory(s.id, { learned: e.target.value })}
                    placeholder="That clarity beats hustle — and that the offer is the marketing."
                    rows={3} className="text-sm resize-none"
                  />
                </Field>
                <Field label="My after situation was">
                  <AutoTextarea
                    value={s.after ?? ""}
                    onChange={(e) => updateStory(s.id, { after: e.target.value })}
                    placeholder="Predictable $40K/month, 4-day work week, fully booked with dream clients."
                    rows={3} className="text-sm resize-none"
                  />
                </Field>
                <Field label="Core Lesson (optional)">
                  <AutoTextarea
                    value={s.core_lesson ?? ""}
                    onChange={(e) => updateStory(s.id, { core_lesson: e.target.value })}
                    placeholder="You don't need more content. You need a clearer offer."
                    rows={3} className="text-sm resize-none"
                  />
                </Field>
              </div>
              <Field label="Emotional Theme (optional)">
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

      <SectionCard
        icon={Lightbulb}
        title="Value Lessons"
        description="Reusable insights for content, nurture, education and authority building."
        count={lessons.length}
        onAdd={addLesson}
        addLabel="Add Lesson"
      >
        {lessons.length === 0 ? (
          <EmptyHint text="Each lesson becomes raw material for emails, posts, VSLs and ads." />
        ) : (
          lessons.map((l, i) => (
            <EntryShell key={l.id} index={i} onDelete={() => removeLesson(l.id)}>
              <Field label="Lesson Title">
                <Input
                  value={l.title ?? ""}
                  onChange={(e) => updateLesson(l.id, { title: e.target.value })}
                  placeholder="Why most coaches stay stuck under $10K/month"
                  className="h-9 text-sm"
                />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="The main topic is">
                  <AutoTextarea value={l.main_topic ?? ""} onChange={(e) => updateLesson(l.id, { main_topic: e.target.value })} placeholder="Pricing and offer positioning." rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="The challenge people have is">
                  <AutoTextarea value={l.common_challenge ?? ""} onChange={(e) => updateLesson(l.id, { common_challenge: e.target.value })} placeholder="They charge by the hour and undercharge for transformations." rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="The awesome lesson about that is">
                  <AutoTextarea value={l.core_insight ?? ""} onChange={(e) => updateLesson(l.id, { core_insight: e.target.value })} placeholder="Pricing for outcome — not time — instantly repositions you as a premium expert." rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="It's especially cool because">
                  <AutoTextarea value={l.why_matters ?? ""} onChange={(e) => updateLesson(l.id, { why_matters: e.target.value })} placeholder="It removes the income ceiling without adding any hours." rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="The main breakthrough I learned was">
                  <AutoTextarea value={l.breakthrough_lesson ?? ""} onChange={(e) => updateLesson(l.id, { breakthrough_lesson: e.target.value })} placeholder="When I stopped selling sessions and started selling outcomes, my close rate doubled." rows={2} className="text-sm resize-none" />
                </Field>
                <Field label="CTA Goal (optional)">
                  <Select value={l.cta_goal ?? ""} onValueChange={(v) => updateLesson(l.id, { cta_goal: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select goal…" /></SelectTrigger>
                    <SelectContent>
                      {CTA_GOAL_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <LinkField value={l.external_link} onChange={(v) => updateLesson(l.id, { external_link: v })} />
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
  const [active, setActive] = useState<TabId>("authority");
  const [coachOpen, setCoachOpen] = useState(false);
  const { activeSubAccountId } = useWorkspace();
  const tab = TABS.find((t) => t.id === active)!;
  const Icon = tab.icon;
  const overallProgress = calcProofAuthorityProgress(data);

  const updateAuthority = (patch: Partial<AuthorityPositioningData>) =>
    onChange({ authority: { ...data.authority, ...patch } });
  const updateSocial = (patch: Partial<SocialProofData>) =>
    onChange({ social_proof: { ...data.social_proof, ...patch } });
  const updateObj = (patch: Partial<ObjectionsBeliefsData>) =>
    onChange({ objections: { ...data.objections, ...patch } });
  const updateEdu = (patch: Partial<EducationalMessagingData>) =>
    onChange({ educational: { ...data.educational, ...patch } });

  // Per-tab completion signal (used in sub-tabs)
  const tabComplete = (id: TabId): boolean => {
    if (id === "authority") {
      return data.authority.authority_types.length > 0
        && data.authority.credibility_foundations.length > 0
        && !!data.authority.trust_reason?.trim()
        && !!data.authority.signature_proof?.trim();
    }
    if (id === "social") {
      return data.social_proof.metrics.length > 0
        || data.social_proof.client_results.length > 0
        || data.social_proof.testimonials.length > 0
        || data.social_proof.authority_assets.length > 0;
    }
    if (id === "stories") {
      return data.authority.founder_stories.length > 0 || data.educational.lessons.length > 0;
    }
    return false;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky sub-tab navigation (matches Customer Clarity / Offer Design) */}
      <div className="border-b border-border bg-card px-8 shrink-0">
        <div className="max-w-6xl mx-auto flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((t) => {
            const isActive = active === t.id;
            const TIcon = t.icon;
            const complete = tabComplete(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <TIcon className="w-4 h-4" />
                <span>{t.label}</span>
                {complete && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-display font-bold text-foreground">{tab.label}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{tab.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCoachOpen(true)}
                className="gap-1.5 h-8"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Coach
              </Button>
            </div>
          </div>

          {/* Insight box */}
          <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-4 flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">
                Why this matters
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{tab.insight}</p>
            </div>
          </div>

          {active === "authority" && <AuthorityTab data={data.authority} onChange={updateAuthority} />}
          {active === "social" && <SocialProofTab data={data.social_proof} onChange={updateSocial} />}
          {active === "stories" && (
            <StoriesTab
              authority={data.authority}
              educational={data.educational}
              onChangeAuthority={updateAuthority}
              onChangeEducational={updateEdu}
            />
          )}

          <div className="mt-6 px-1">
            <Progress value={overallProgress} className="h-1" />
          </div>
        </div>
      </div>

      <CoachPanel
        open={coachOpen}
        onOpenChange={setCoachOpen}
        context={
          activeSubAccountId
            ? buildBlueprintSectionContext(
                "proof_authority",
                "Authority & Content",
                { proof_authority: data } as unknown as BlueprintRow,
                activeSubAccountId,
              )
            : null
        }
        onApplyBlueprintWrites={async (writes) => {
          if (!activeSubAccountId) return;
          const { applyBlueprintWrites } = await import("@/lib/coach/applyBlueprintWrites");
          const { toast } = await import("sonner");
          const res = await applyBlueprintWrites(activeSubAccountId, writes);
          if (res.error) toast.error(`Kon Blueprint niet bijwerken: ${res.error}`);
          else toast.success(`${res.applied} veld(en) bijgewerkt — herlaad de sectie om ze te zien`);
        }}
      />
    </div>
  );
};

export default ProofAuthoritySection;
