// Stage D editor + Stage E presentation of the Builder package (presentation only).
import { ChevronDown, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PackageWrite } from "@shared/offerIntelligence/builderStages";
import {
  PACKAGE_SECTIONS, groupPackage, entryWrites, isEmpty, findWrite, itemMap, displayValue,
  type PackageEntry, type ListItemEntry, type PackageSectionId,
} from "@/lib/offers/packagePresentation";
import { cn } from "@/lib/utils";

const Tag = ({ tone = "muted", children }: { tone?: "muted" | "primary" | "warn"; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
    tone === "primary" && "bg-primary/10 text-primary", tone === "warn" && "bg-destructive/10 text-destructive", tone === "muted" && "bg-muted text-muted-foreground")}>{children}</span>
);

const provenance = (ws: PackageWrite[]) => ws.some((w) => w.edited) ? <Tag tone="primary">Edited by you</Tag> : <Tag>Proposed</Tag>;
const rowsFor = (v: string) => Math.min(6, Math.max(1, Math.ceil(v.length / 70)));

// ---- Stage D ----------------------------------------------------------------------

interface EditorProps {
  writes: PackageWrite[]; values: Record<string, string>; busy: boolean;
  onChange: (id: string, v: string) => void; onToggle: (ids: string[], include: boolean) => void;
}

export function PackageEditor({ writes, values, busy, onChange, onToggle }: EditorProps) {
  const groups = groupPackage(writes);
  const val = (w: PackageWrite) => values[w.id] ?? w.value;
  const name = findWrite(writes, ["main_offer_name", "offer_name", "name"]);
  const desc = findWrite(writes, ["short_description", "description"]);
  const price = writes.find((w) => /price/.test(w.path) && !/\.new_\d+\./.test(w.path));
  const included = writes.filter((w) => w.include).length;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-2">
        <p className="text-xs text-muted-foreground">Offer at a glance</p>
        <h2 className="text-xl font-display font-bold text-foreground break-words">{(name && val(name)) || "Untitled offer"}</h2>
        {desc && val(desc) && <p className="text-sm text-muted-foreground">{val(desc)}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {price && val(price) && <Tag tone="primary">Proposed price: {val(price)}</Tag>}
          <Tag>{included} of {writes.length} elements included</Tag>
        </div>
      </div>
      {PACKAGE_SECTIONS.map((sec) => {
        const entries = groups[sec.id];
        if (!entries.length) return null;
        const filled = entries.filter((e) => !isEmpty(e, values));
        const empty = entries.filter((e) => isEmpty(e, values));
        return (
          <details key={sec.id} open className="group rounded-xl border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
              <span className="flex-1 min-w-0">
                <span className="block font-display font-semibold text-foreground">{sec.title}</span>
                <span className="block text-xs text-muted-foreground">{sec.hint}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border p-4 space-y-3">
              {sec.id === "pricing" && (
                <p className="text-xs rounded-lg bg-muted/60 px-3 py-2 text-foreground flex gap-2"><ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
                  Prices and guarantees are proposals, not validated market figures. Review every guarantee carefully before offering it to buyers — leave it out if you can't honour it.</p>
              )}
              {filled.map((e) => <EntryEditor key={e.kind === "field" ? e.write.id : e.key} e={e} sec={sec.id} val={val} busy={busy} onChange={onChange} onToggle={onToggle} />)}
              {empty.length > 0 && (
                <details className="rounded-lg border border-dashed border-border">
                  <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">{empty.length} empty field{empty.length > 1 ? "s" : ""} — add details if you want</summary>
                  <div className="p-3 space-y-3">{empty.map((e) => <EntryEditor key={e.kind === "field" ? e.write.id : e.key} e={e} sec={sec.id} val={val} busy={busy} onChange={onChange} onToggle={onToggle} />)}</div>
                </details>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
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
      <span className="text-sm font-medium text-foreground">{title}</span>
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
  const pick = (s: string[]) => { const w = findWrite(inc.filter((x) => !/\.(new_\d+|[0-9a-f-]{8,})\./i.test(x.path)), s); if (w) used.add(w.id); return w?.value; };
  const name = pick(["main_offer_name", "offer_name", "name"]);
  const desc = pick(["short_description"]);
  const promise = pick(["core_promise.desired_outcome", "core_outcome", "promise"]);
  const timeline = pick(["delivery_timeline", "duration", "timeframe"]);
  const price = (() => { const w = inc.find((x) => /price/.test(x.path) && !/\.new_\d+\./.test(x.path)); if (w) used.add(w.id); return w?.value; })();
  const audience = extras?.audience?.audience as string | undefined;
  const groups = groupPackage(inc.filter((w) => !used.has(w.id)));
  const pos: any[] = extras?.problemObstacleSolutions ?? [];

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap gap-2"><Tag tone="primary">{tierLabel}</Tag><Tag>Proposed offer · internal blueprint</Tag></div>
        <h2 className="text-2xl font-display font-bold text-foreground break-words">{name || "Untitled offer"}</h2>
        {desc && <p className="text-sm text-muted-foreground max-w-prose">{desc}</p>}
        {extras?.positioning?.statement && <p className="text-sm text-foreground max-w-prose"><span className="text-muted-foreground">Positioning (not yet verified): </span>{extras.positioning.statement}</p>}
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {promise && <Fact k="Core promise" v={promise} wide />}
          {audience && <Fact k="Audience" v={audience} wide />}
          {timeline && <Fact k="Duration" v={displayValue(timeline)} />}
          {price && <Fact k="Proposed investment" v={displayValue(price)} />}
        </dl>
      </header>

      {pos.length > 0 && (
        <Panel title="The transformation">
          <ol className="space-y-2">{pos.map((p, i) => (
            <li key={i} className="grid sm:grid-cols-3 gap-2 text-sm">
              <span className="rounded-lg bg-muted/50 p-2"><span className="block text-[11px] text-muted-foreground">Problem</span>{p.problem}</span>
              <span className="rounded-lg bg-muted/50 p-2"><span className="block text-[11px] text-muted-foreground">Obstacle</span>{p.obstacle}</span>
              <span className="rounded-lg bg-primary/5 p-2"><span className="block text-[11px] text-muted-foreground">Solution</span>{p.solution}</span>
            </li>))}</ol>
        </Panel>
      )}

      {PACKAGE_SECTIONS.map((sec) => {
        const entries = groups[sec.id];
        if (!entries.length) return null;
        const fields = entries.filter((e): e is Extract<PackageEntry, { kind: "field" }> => e.kind === "field");
        const lists = new Map<string, ListItemEntry[]>();
        entries.forEach((e) => { if (e.kind === "item") lists.set(e.listPath, [...(lists.get(e.listPath) ?? []), e]); });
        const isPricing = sec.id === "pricing";
        return (
          <Panel key={sec.id} title={FINAL_TITLES[sec.id]}>
            {fields.length > 0 && (
              <dl className="grid sm:grid-cols-2 gap-3">
                {fields.map((f) => <Fact key={f.write.id} k={f.write.label} v={displayValue(f.write.value)} wide={f.write.value.length > 80}
                  warn={isPricing && /guarantee/.test(f.write.path)} />)}
              </dl>
            )}
            {[...lists.values()].map((items) => <ListView key={items[0].listPath} items={items} />)}
            {isPricing && extras?.pricingRationale?.reasoning && (
              <details className="rounded-lg border border-border">
                <summary className="cursor-pointer px-3 py-2 text-sm text-foreground">Why this price (estimate)</summary>
                <div className="px-3 pb-3 space-y-1.5 text-sm text-foreground">
                  <p>{extras.pricingRationale.reasoning}</p>
                  {extras.pricingRationale.assumptions?.length > 0 && <p className="text-xs text-muted-foreground">Assumptions: {extras.pricingRationale.assumptions.join(" · ")}</p>}
                </div>
              </details>
            )}
            {sec.id === "value" && extras?.bonusRationales?.length > 0 && (
              <ul className="space-y-1 text-sm text-foreground">{extras.bonusRationales.map((b: any, i: number) => <li key={i}><span className="font-medium">{b.bonusName}:</span> {b.reason}</li>)}</ul>
            )}
          </Panel>
        );
      })}
      {extras?.assumptions?.length > 0 && (
        <Panel title="Assumptions behind this package">
          <ul className="space-y-1.5 text-sm text-foreground">{extras.assumptions.map((a: any, i: number) => <li key={i}>{a.statement}{a.howToValidate && <span className="text-xs text-muted-foreground"> — validate: {a.howToValidate}</span>}</li>)}</ul>
        </Panel>
      )}
    </div>
  );
}

const FINAL_TITLES: Record<PackageSectionId, string> = {
  overview: "Offer positioning", method: "The unique method", delivery: "What's included & program roadmap",
  value: "Value & risk reduction", pricing: "Investment & risk reversal",
};

function ListView({ items }: { items: ListItemEntry[] }) {
  const label = items[0].listLabel;
  const isSteps = /(pillar|milestone|phase|step|module)/i.test(items[0].listPath);
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h3>
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
const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3"><h2 className="text-base font-display font-semibold text-foreground">{title}</h2>{children}</section>
);
const Fact = ({ k, v, wide, warn }: { k: string; v: string; wide?: boolean; warn?: boolean }) => (
  <div className={cn("rounded-lg p-3 min-w-0", warn ? "border border-destructive/40 bg-destructive/5" : "bg-muted/40", wide && "sm:col-span-2")}>
    <dt className="text-[11px] text-muted-foreground flex items-center gap-1.5">{k}{warn && <Tag tone="warn">Proposed — review before offering</Tag>}</dt>
    <dd className="text-sm text-foreground whitespace-pre-wrap break-words">{v}</dd>
  </div>
);
