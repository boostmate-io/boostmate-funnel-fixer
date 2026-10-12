// Stage D editor + Stage E presentation of the Builder package (presentation only).
// Both use the same five section tabs from `PACKAGE_SECTIONS`; only the selected tab renders.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PackageWrite } from "@shared/offerIntelligence/builderStages";
import {
  PACKAGE_SECTIONS, groupPackage, entryWrites, isEmpty, findWrite, itemMap, displayValue,
  type PackageEntry, type ListItemEntry, type PackageSectionId,
} from "@/lib/offers/packagePresentation";
import { cn } from "@/lib/utils";

export const Tag = ({ tone = "muted", children }: { tone?: "muted" | "primary" | "warn"; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
    tone === "primary" && "bg-primary/10 text-primary", tone === "warn" && "bg-destructive/10 text-destructive", tone === "muted" && "bg-muted text-muted-foreground")}>{children}</span>
);

const provenance = (ws: PackageWrite[]) => ws.some((w) => w.edited) ? <Tag tone="primary">Edited by you</Tag> : <Tag>Proposed</Tag>;
const rowsFor = (v: string) => Math.min(6, Math.max(1, Math.ceil(v.length / 70)));
const isListPath = (p: string) => /\.(new_\d+|[0-9a-f][0-9a-f-]{7,})\./i.test(p);
const TAB_LABELS: Record<PackageSectionId, string> = { overview: "Overview", method: "Method", delivery: "Delivery", value: "Value & Risk", pricing: "Pricing" };

// ---- Shared section tabs ------------------------------------------------------------

function useSectionTab(available: PackageSectionId[]) {
  const [tab, setTab] = useState<PackageSectionId>(available[0] ?? "overview");
  useEffect(() => { if (available.length && !available.includes(tab)) setTab(available[0]); }, [available.join(","), tab]); // eslint-disable-line react-hooks/exhaustive-deps
  return [tab, setTab] as const;
}

function SectionTabs({ tabs, active, onSelect, counts, warn }: {
  tabs: PackageSectionId[]; active: PackageSectionId; onSelect: (t: PackageSectionId) => void; counts?: Partial<Record<PackageSectionId, string>>; warn?: PackageSectionId[];
}) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = tabs[(i + d + tabs.length) % tabs.length];
    onSelect(next);
    document.getElementById(`sectab-${next}`)?.focus();
  };
  return (
    <div role="tablist" aria-label="Offer sections" className="flex overflow-x-auto border-b border-border bg-muted/30">
      {tabs.map((t, i) => (
        <button key={t} id={`sectab-${t}`} role="tab" type="button" aria-selected={active === t} aria-controls={`secpanel-${t}`} tabIndex={active === t ? 0 : -1}
          onClick={() => onSelect(t)} onKeyDown={(e) => onKey(e, i)}
          className={cn("shrink-0 flex-1 min-w-[104px] px-3 py-3 text-sm border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            active === t ? "border-primary bg-card text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
          <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            {TAB_LABELS[t]}
            {warn?.includes(t) && <ShieldAlert className="w-3.5 h-3.5 text-destructive" aria-label="Contains items to review" />}
          </span>
          {counts?.[t] && <span className="block text-[10px] font-normal text-muted-foreground">{counts[t]}</span>}
        </button>
      ))}
    </div>
  );
}

function SectionPager({ tabs, active, onSelect }: { tabs: PackageSectionId[]; active: PackageSectionId; onSelect: (t: PackageSectionId) => void }) {
  const i = tabs.indexOf(active);
  if (tabs.length < 2) return null;
  const go = (t: PackageSectionId) => { onSelect(t); document.getElementById(`sectab-${t}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      {i > 0 ? <Button size="sm" variant="ghost" onClick={() => go(tabs[i - 1])}><ChevronLeft className="w-4 h-4 mr-1" />{TAB_LABELS[tabs[i - 1]]}</Button> : <span />}
      {i < tabs.length - 1 && <Button size="sm" variant="outline" onClick={() => go(tabs[i + 1])}>Next: {TAB_LABELS[tabs[i + 1]]}<ChevronRight className="w-4 h-4 ml-1" /></Button>}
    </div>
  );
}

const hasExtrasFor = (sec: PackageSectionId, ex: Record<string, any>) =>
  (sec === "overview" && (ex?.problemObstacleSolutions?.length > 0 || !!ex?.positioning?.statement || !!ex?.audience?.audience)) ||
  (sec === "value" && ex?.bonusRationales?.length > 0) ||
  (sec === "pricing" && !!ex?.pricingRationale?.reasoning);

// ---- Stage D ----------------------------------------------------------------------

interface EditorProps {
  writes: PackageWrite[]; values: Record<string, string>; busy: boolean; tierLabel: string; extras: Record<string, any>;
  onChange: (id: string, v: string) => void; onToggle: (ids: string[], include: boolean) => void;
}

export function PackageEditor({ writes, values, busy, tierLabel, extras, onChange, onToggle }: EditorProps) {
  const groups = groupPackage(writes);
  const val = (w: PackageWrite) => values[w.id] ?? w.value;
  const scalars = writes.filter((w) => !isListPath(w.path));
  const name = findWrite(scalars, ["main_offer_name", "offer_name", "name"]);
  const promise = findWrite(scalars, ["core_promise.desired_outcome", "core_outcome", "promise"]);
  const duration = findWrite(scalars, ["delivery_timeline", "duration", "timeframe"]);
  const price = scalars.find((w) => /price/.test(w.path));
  const included = writes.filter((w) => w.include).length;
  const tabs = PACKAGE_SECTIONS.map((s) => s.id).filter((id) => groups[id].length > 0 || hasExtrasFor(id, extras));
  const [tab, setTab] = useSectionTab(tabs);
  const sec = PACKAGE_SECTIONS.find((s) => s.id === tab)!;
  const entries = groups[tab] ?? [];
  const filled = entries.filter((e) => !isEmpty(e, values));
  const empty = entries.filter((e) => isEmpty(e, values));
  const counts = Object.fromEntries(tabs.map((t) => {
    const ws = groups[t].flatMap(entryWrites);
    return [t, ws.length ? `${ws.filter((w) => w.include).length}/${ws.length} included` : "notes"];
  }));
  const warnTabs = tabs.filter((t) => groups[t].some((e) => entryWrites(e).some((w) => w.include && /guarantee/.test(w.path) && val(w).trim())));
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-2">
        <div className="flex flex-wrap gap-2"><Tag tone="primary">{tierLabel}</Tag><Tag>{included} of {writes.length} elements included</Tag></div>
        <h2 className="text-xl font-display font-bold text-foreground break-words">{(name && val(name)) || "Untitled offer"}</h2>
        {promise && val(promise) && <p className="text-sm text-muted-foreground line-clamp-2">{val(promise)}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {duration && val(duration) && <Tag>Duration: {displayValue(val(duration))}</Tag>}
          {price && val(price) && <Tag tone="primary">Proposed price: {val(price)}</Tag>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
      <SectionTabs tabs={tabs} active={tab} onSelect={setTab} counts={counts} warn={warnTabs} />

      <div role="tabpanel" id={`secpanel-${tab}`} aria-labelledby={`sectab-${tab}`} className="p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">{sec.title}</h3>
          <p className="text-xs text-muted-foreground">{sec.hint}</p>
        </div>
        {tab === "pricing" && (
          <p className="text-xs rounded-lg bg-muted/60 px-3 py-2 text-foreground flex gap-2"><ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
            Prices and guarantees are proposals, not validated market figures. Review every guarantee carefully before offering it to buyers — leave it out if you can't honour it.</p>
        )}
        {filled.map((e) => <EntryEditor key={e.kind === "field" ? e.write.id : e.key} e={e} sec={tab} val={val} busy={busy} onChange={onChange} onToggle={onToggle} />)}
        {empty.length > 0 && (
          <details className="rounded-lg border border-dashed border-border">
            <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">{empty.length} empty field{empty.length > 1 ? "s" : ""} — add details if you want</summary>
            <div className="p-3 space-y-3">{empty.map((e) => <EntryEditor key={e.kind === "field" ? e.write.id : e.key} e={e} sec={tab} val={val} busy={busy} onChange={onChange} onToggle={onToggle} />)}</div>
          </details>
        )}
        <SectionExtras sec={tab} extras={extras} />
        <SectionPager tabs={tabs} active={tab} onSelect={setTab} />
      </div>
      </div>
    </div>
  );
}

/** Strategist explanations attached to a section (read-only, not saved to Offer Design). */
function SectionExtras({ sec, extras: ex }: { sec: PackageSectionId; extras: Record<string, any> }) {
  if (sec === "overview") return (
    <>
      {ex?.positioning?.statement && <Note title="Positioning (not yet verified)"><p>{ex.positioning.statement}</p></Note>}
      {ex?.problemObstacleSolutions?.length > 0 && <Transformation pos={ex.problemObstacleSolutions} />}
    </>
  );
  if (sec === "value" && ex?.bonusRationales?.length > 0) return (
    <Note title="Why these bonuses"><ul className="space-y-1">{ex.bonusRationales.map((b: any, i: number) => <li key={i}><span className="font-medium">{b.bonusName}:</span> {b.reason}</li>)}</ul></Note>
  );
  if (sec === "pricing" && ex?.pricingRationale?.reasoning) return (
    <details className="rounded-lg border border-border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">Why this price (estimate)</summary>
      <div className="px-3 pb-3 space-y-1.5 text-sm text-foreground">
        <p>{ex.pricingRationale.reasoning}</p>
        {ex.pricingRationale.assumptions?.length > 0 && <p className="text-xs text-muted-foreground">Assumptions: {ex.pricingRationale.assumptions.join(" · ")}</p>}
      </div>
    </details>
  );
  return null;
}

function EntryEditor({ e, sec, val, busy, onChange, onToggle }: { e: PackageEntry; sec: PackageSectionId; val: (w: PackageWrite) => string } & Pick<EditorProps, "busy" | "onChange" | "onToggle">) {
  const ws = entryWrites(e);
  const on = ws.some((w) => w.include);
  const isGuarantee = sec === "pricing" && ws.some((w) => /guarantee/.test(w.path));
  const toggle = (
    <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" disabled={busy} onClick={() => onToggle(ws.map((w) => w.id), !on)}
      aria-label={`${on ? "Leave out" : "Include"} ${e.kind === "field" ? e.write.label : `${e.listLabel} ${e.index}`}`}>
      {on ? <><EyeOff className="w-3.5 h-3.5 mr-1" />Leave out</> : <><Eye className="w-3.5 h-3.5 mr-1" />Include</>}
    </Button>
  );
  const head = (title: string) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {provenance(ws)}
      {isGuarantee && <Tag tone="warn">Needs your review</Tag>}
      {!on && <Tag tone="warn">Left out</Tag>}
      <span className="ml-auto">{toggle}</span>
    </div>
  );
  if (e.kind === "field") {
    const w = e.write;
    return (
      <div className={cn("rounded-lg border p-3 space-y-2", isGuarantee ? "border-destructive/40" : "border-border", !on && "opacity-60")}>
        {head(w.label)}
        <Textarea id={`pw-${w.id}`} aria-label={w.label} rows={rowsFor(val(w))} value={val(w)} disabled={!w.include} onChange={(ev) => onChange(w.id, ev.target.value)} />
      </div>
    );
  }
  return (
    <div className={cn("rounded-lg border border-border bg-background p-3 space-y-2", !on && "opacity-60")}>
      {head(`${e.listLabel} ${e.index}`)}
      <div className="grid gap-2 sm:grid-cols-2">
        {e.fields.map((f) => (
          <div key={f.write.id} className={cn("space-y-1", (f.sub === "description" || val(f.write).length > 60) && "sm:col-span-2")}>
            <label htmlFor={`pw-${f.write.id}`} className="text-xs text-muted-foreground">{f.label}</label>
            <Textarea id={`pw-${f.write.id}`} rows={rowsFor(val(f.write))} value={val(f.write)} disabled={!f.write.include} onChange={(ev) => onChange(f.write.id, ev.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Stage E ----------------------------------------------------------------------

export function FinalOfferPresentation({ writes, tierLabel, extras }: { writes: PackageWrite[]; tierLabel: string; extras: Record<string, any> }) {
  const inc = writes.filter((w) => w.include && w.value.trim());
  const used = new Set<string>();
  const scalars = inc.filter((x) => !isListPath(x.path));
  const pick = (s: string[]) => { const w = findWrite(scalars, s); if (w) used.add(w.id); return w?.value; };
  const name = pick(["main_offer_name", "offer_name", "name"]);
  const desc = pick(["short_description"]);
  const promise = pick(["core_promise.desired_outcome", "core_outcome", "promise"]);
  const timeline = pick(["delivery_timeline", "duration", "timeframe"]);
  const price = (() => { const w = scalars.find((x) => /price/.test(x.path)); if (w) used.add(w.id); return w?.value; })();
  const audience = extras?.audience?.audience as string | undefined;
  const groups = groupPackage(inc.filter((w) => !used.has(w.id)));
  const tabs = PACKAGE_SECTIONS.map((s) => s.id).filter((id) => groups[id].length > 0 || hasExtrasFor(id, extras));
  const [tab, setTab] = useSectionTab(tabs);
  const entries = groups[tab] ?? [];
  const fields = entries.filter((e): e is Extract<PackageEntry, { kind: "field" }> => e.kind === "field");
  const lists = new Map<string, ListItemEntry[]>();
  entries.forEach((e) => { if (e.kind === "item") lists.set(e.listPath, [...(lists.get(e.listPath) ?? []), e]); });
  const isPricing = tab === "pricing";
  const guaranteeIncluded = inc.some((w) => /guarantee/.test(w.path));

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap gap-2"><Tag tone="primary">{tierLabel}</Tag><Tag>Proposed offer · internal blueprint</Tag></div>
        <h2 className="text-2xl font-display font-bold text-foreground break-words">{name || "Untitled offer"}</h2>
        {desc && <p className="text-sm text-muted-foreground max-w-prose">{desc}</p>}
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {promise && <Fact k="Core promise" v={promise} wide />}
          {timeline && <Fact k="Duration" v={displayValue(timeline)} />}
          {price && <Fact k="Proposed investment" v={displayValue(price)} />}
        </dl>
        {guaranteeIncluded && (
          <p className="text-xs rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-foreground flex gap-2"><ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
            This offer includes a proposed guarantee. Review it in the Pricing tab before approving.</p>
        )}
      </header>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
      <SectionTabs tabs={tabs} active={tab} onSelect={setTab} warn={guaranteeIncluded ? ["pricing"] : []} />

      <section role="tabpanel" id={`secpanel-${tab}`} aria-labelledby={`sectab-${tab}`} className="p-4 sm:p-6 space-y-5">
        <h3 className="text-lg font-display font-semibold text-foreground">{FINAL_TITLES[tab]}</h3>
        {tab === "overview" && (audience || extras?.positioning?.statement) && (
          <dl className="grid sm:grid-cols-2 gap-3">
            {audience && <Fact k="Audience" v={audience} wide />}
            {extras?.positioning?.statement && <Fact k="Positioning (not yet verified)" v={extras.positioning.statement} wide />}
          </dl>
        )}
        {fields.length > 0 && (
          <dl className="grid sm:grid-cols-2 gap-3">
            {fields.map((f) => <Fact key={f.write.id} k={f.write.label} v={displayValue(f.write.value)} wide={f.write.value.length > 80}
              warn={isPricing && /guarantee/.test(f.write.path)} />)}
          </dl>
        )}
        {[...lists.values()].map((items) => <ListView key={items[0].listPath} items={items} />)}
        {tab === "overview" && extras?.problemObstacleSolutions?.length > 0 && <Transformation pos={extras.problemObstacleSolutions} />}
        {tab === "value" && extras?.bonusRationales?.length > 0 && (
          <Note title="Why these bonuses"><ul className="space-y-1">{extras.bonusRationales.map((b: any, i: number) => <li key={i}><span className="font-medium">{b.bonusName}:</span> {b.reason}</li>)}</ul></Note>
        )}
        {isPricing && extras?.pricingRationale?.reasoning && (
          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm text-foreground">Why this price (estimate)</summary>
            <div className="px-3 pb-3 space-y-1.5 text-sm text-foreground">
              <p>{extras.pricingRationale.reasoning}</p>
              {extras.pricingRationale.assumptions?.length > 0 && <p className="text-xs text-muted-foreground">Assumptions: {extras.pricingRationale.assumptions.join(" · ")}</p>}
            </div>
          </details>
        )}
        <SectionPager tabs={tabs} active={tab} onSelect={setTab} />
      </section>
      </div>
    </div>
  );
}

const FINAL_TITLES: Record<PackageSectionId, string> = {
  overview: "Offer positioning & transformation", method: "The unique method", delivery: "What's included & program roadmap",
  value: "Value & risk reduction", pricing: "Investment & risk reversal",
};

function Transformation({ pos }: { pos: any[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">The transformation</h4>
      <ol className="space-y-2">{pos.map((p, i) => (
        <li key={i} className="grid sm:grid-cols-3 gap-2 text-sm">
          <span className="rounded-lg bg-muted/50 p-2"><span className="block text-[11px] text-muted-foreground">Problem</span>{p.problem}</span>
          <span className="rounded-lg bg-muted/50 p-2"><span className="block text-[11px] text-muted-foreground">Obstacle</span>{p.obstacle}</span>
          <span className="rounded-lg bg-primary/5 p-2"><span className="block text-[11px] text-muted-foreground">Solution</span>{p.solution}</span>
        </li>))}</ol>
    </div>
  );
}

function ListView({ items }: { items: ListItemEntry[] }) {
  const label = items[0].listLabel;
  const isSteps = /(pillar|milestone|phase|step|module)/i.test(items[0].listPath);
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{label}</h4>
      {isSteps ? (
        <ol className="relative space-y-3 border-l-2 border-primary/30 pl-5 ml-2">
          {items.map((it, i) => { const m = itemMap(it); return (
            <li key={it.key} className="relative">
              <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{i + 1}</span>
              <p className="text-sm font-medium text-foreground">{m.name || m.phase_name || `${label} ${i + 1}`}</p>
              {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
              {m.expected_outcome && <p className="text-xs text-foreground mt-1"><span className="text-muted-foreground">Expected outcome (not guaranteed): </span>{m.expected_outcome}</p>}
              <Rest it={it} skip={["name", "phase_name", "description", "expected_outcome"]} />
            </li>); })}
        </ol>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {items.map((it, i) => { const m = itemMap(it); return (
            <div key={it.key} className="rounded-lg border border-border bg-background p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">{m.name || `${label} ${i + 1}`}</p>
              {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
              <Rest it={it} skip={["name", "description"]} />
            </div>); })}
        </div>
      )}
    </div>
  );
}
const Rest = ({ it, skip }: { it: ListItemEntry; skip: string[] }) => {
  const rest = it.fields.filter((f) => !skip.includes(f.sub) && f.write.value.trim());
  return rest.length ? <p className="flex flex-wrap gap-1.5 pt-1">{rest.map((f) => <Tag key={f.write.id}>{f.label}: {displayValue(f.write.value)}</Tag>)}</p> : null;
};
const Note = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm text-foreground"><p className="text-[11px] text-muted-foreground">{title}</p>{children}</div>
);
const Fact = ({ k, v, wide, warn }: { k: string; v: string; wide?: boolean; warn?: boolean }) => (
  <div className={cn("rounded-lg p-3 min-w-0", warn ? "border border-destructive/40 bg-destructive/5" : "bg-muted/40", wide && "sm:col-span-2")}>
    <dt className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">{k}{warn && <Tag tone="warn">Proposed — review before offering</Tag>}</dt>
    <dd className="text-sm text-foreground whitespace-pre-wrap break-words">{v}</dd>
  </div>
);
