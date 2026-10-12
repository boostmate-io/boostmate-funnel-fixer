// =============================================================================
// ValueProfileChart — reusable four-axis diamond (Before / After).
// Not-assessed dimensions are drawn as a dashed axis with a label — never as a
// low score. `large` = signature two-column view (chart + scores/inspector);
// `compact` = small chart + score chips for stages where it is secondary.
// =============================================================================

import { useState } from "react";
import {
  DIMENSION_LABELS, VALUE_CRITERIA, VALUE_PROFILE_DISCLAIMER,
  type ValueDimension, type ValueProfile,
} from "@shared/offerIntelligence/valueEquation";
import { cn } from "@/lib/utils";

// Top, right, bottom, left.
const AXES: ValueDimension[] = ["dream_outcome", "perceived_likelihood", "speed_to_value", "ease_of_achievement"];
const DIR: Record<ValueDimension, [number, number]> = {
  dream_outcome: [0, -1], perceived_likelihood: [1, 0], speed_to_value: [0, 1], ease_of_achievement: [-1, 0],
};
const SIZE = 320;
const C = SIZE / 2;
const R = 112;
const PAD_X = 100; // room for left/right labels so they never clip
const PAD_Y = 30;

const point = (d: ValueDimension, score: number) => {
  const [x, y] = DIR[d];
  return [C + x * (score / 10) * R, C + y * (score / 10) * R] as const;
};

function points(profile: ValueProfile | null | undefined) {
  if (!profile) return [];
  return AXES.filter((d) => profile.dimensions[d]?.score != null).map((d) => ({ d, p: point(d, profile.dimensions[d].score!) }));
}
const toPoly = (pts: { p: readonly [number, number] }[]) => (pts.length >= 2 ? pts.map(({ p: [x, y] }) => `${x},${y}`).join(" ") : null);

interface Props {
  before?: ValueProfile | null;
  after?: ValueProfile | null;
  className?: string;
  variant?: "large" | "compact";
  /** Optional per-dimension improvement ideas shown in the inspector. */
  improvements?: Partial<Record<ValueDimension, string[]>>;
}

export default function ValueProfileChart({ before, after, className, improvements, variant = "large" }: Props) {
  const [selected, setSelected] = useState<ValueDimension | null>(null);
  const main = after ?? before ?? null;
  const beforePts = points(before);
  const afterPts = points(after);
  const beforePoly = toPoly(beforePts);
  const afterPoly = toPoly(afterPts);
  const sel = selected && main ? main.dimensions[selected] : null;
  const score = (d: ValueDimension, p?: ValueProfile | null) => p?.dimensions[d]?.score ?? null;
  const label = (d: ValueDimension, p?: ValueProfile | null) => {
    const s = score(d, p);
    return s == null ? "Not assessed" : `${s}/10`;
  };
  const both = !!before && !!after;
  const compact = variant === "compact";

  const chart = (
    <svg viewBox={`${-PAD_X} ${-PAD_Y} ${SIZE + PAD_X * 2} ${SIZE + PAD_Y * 2}`} className="w-full h-auto" role="img"
      aria-label={`Value profile: ${AXES.map((d) => `${DIMENSION_LABELS[d]} ${both ? `${label(d, before)} to ${label(d, after)}` : label(d, main)}`).join(", ")}`}>
      {[2.5, 5, 7.5, 10].map((s) => (
        <polygon key={s} points={AXES.map((d) => point(d, s).join(",")).join(" ")} className={cn("fill-none", s === 10 ? "stroke-border" : "stroke-border/60")} strokeWidth={1} />
      ))}
      {AXES.map((d) => {
        const [x, y] = point(d, 10);
        const missing = main?.dimensions[d]?.score == null;
        return <line key={d} x1={C} y1={C} x2={x} y2={y} className={missing ? "stroke-muted-foreground" : "stroke-border"} strokeDasharray={missing ? "4 4" : undefined} strokeWidth={1} data-axis={d} data-missing={missing || undefined} />;
      })}
      {beforePoly && <polygon points={beforePoly} className={cn("stroke-muted-foreground", both ? "fill-muted-foreground/10" : "fill-primary/15 stroke-primary")} strokeWidth={both ? 1.75 : 2.5} strokeDasharray={both ? "6 4" : undefined} data-profile="before" />}
      {afterPoly && <polygon points={afterPoly} className="fill-primary/20 stroke-primary" strokeWidth={2.5} data-profile="after" />}
      {beforePts.map(({ d, p: [x, y] }) => <circle key={`b-${d}`} cx={x} cy={y} r={both ? 4 : 5} className={both ? "fill-background stroke-muted-foreground" : "fill-primary stroke-background"} strokeWidth={2} />)}
      {afterPts.map(({ d, p: [x, y] }) => <rect key={`a-${d}`} x={x - 5} y={y - 5} width={10} height={10} className="fill-primary stroke-background" strokeWidth={2} />)}
      {AXES.map((d) => {
        const [x, y] = point(d, 10);
        const [dx, dy] = DIR[d];
        const anchor = dx > 0 ? "start" : dx < 0 ? "end" : "middle";
        const lx = x + dx * 14;
        const ly = dy < 0 ? y - 26 : dy > 0 ? y + 22 : y - 4;
        const value = both ? `${label(d, before)} → ${label(d, after)}` : label(d, main);
        return (
          <g key={d} className="cursor-pointer" onClick={() => setSelected(selected === d ? null : d)}>
            <text x={lx} y={ly} textAnchor={anchor} className={cn("text-[17px] font-semibold", selected === d ? "fill-primary" : "fill-foreground")}>{DIMENSION_LABELS[d]}</text>
            <text x={lx} y={ly + 19} textAnchor={anchor} className="fill-muted-foreground text-[14px]">{value}</text>
          </g>
        );
      })}
    </svg>
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {before && <span className="flex items-center gap-1.5"><span className={cn("w-2.5 h-2.5 rounded-full border-2", both ? "border-muted-foreground bg-background" : "border-primary bg-primary")} />{both ? "Before (diagnosis)" : "Current assessment"}</span>}
      {after && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-primary" />After (final offer)</span>}
      <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-muted-foreground" />Not assessed</span>
    </div>
  );

  const cards = (
    <div className="grid grid-cols-2 gap-2">
      {AXES.map((d) => {
        const b = score(d, before), a = score(d, after);
        const delta = both && a != null && b != null ? Math.round((a - b) * 10) / 10 : null;
        return (
          <button key={d} type="button" onClick={() => setSelected(selected === d ? null : d)} aria-pressed={selected === d}
            className={cn("rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected === d ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
            <span className="block text-xs font-medium text-muted-foreground">{DIMENSION_LABELS[d]}</span>
            <span className="flex items-baseline gap-2">
              <span className="text-xl font-display font-bold text-foreground">{score(d, main) ?? "–"}</span>
              <span className="text-xs text-muted-foreground">{score(d, main) == null ? "not assessed" : "/10"}</span>
              {both && <span className={cn("ml-auto text-xs font-medium", delta != null && delta > 0 ? "text-primary" : delta != null && delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                {delta == null ? `was ${b ?? "–"}` : delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta} (was ${b})`}
              </span>}
            </span>
          </button>
        );
      })}
    </div>
  );

  const inspector = sel && selected ? (
    <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-2" aria-live="polite">
      <p className="text-sm font-medium text-foreground">{DIMENSION_LABELS[selected]} — {sel.status === "assessed" ? `${sel.score}/10` : "Not assessed (not enough information)"}</p>
      {[["Strengths", sel.strengths], ["To improve", sel.weaknesses], ["Unknown", sel.unknown]].map(([title, list]) =>
        (list as typeof sel.strengths).length ? (
          <div key={title as string}>
            <p className="text-muted-foreground font-medium">{title as string}</p>
            <ul className="list-disc pl-4 text-foreground space-y-0.5">
              {(list as typeof sel.strengths).map((a) => (
                <li key={a.criterionId}>{VALUE_CRITERIA.find((c) => c.id === a.criterionId)?.label}{a.reasoning ? ` — ${a.reasoning}` : ""}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {improvements?.[selected]?.length ? (
        <div>
          <p className="text-muted-foreground font-medium">Opportunities</p>
          <ul className="list-disc pl-4 text-foreground">{improvements[selected]!.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      ) : null}
    </div>
  ) : (
    <p className="text-xs text-muted-foreground">Select a dimension to see the reasoning per criterion.</p>
  );

  if (compact) {
    return (
      <div className={cn("w-full space-y-3", className)}>
        <div className="grid sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-4 items-center">
          {chart}
          <div className="space-y-3">{cards}{legend}</div>
        </div>
        {inspector}
        <p className="text-[11px] text-muted-foreground">{VALUE_PROFILE_DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6 items-start", className)}>
      <div className="space-y-2 min-w-0">
        <div className="mx-auto max-w-[520px]">{chart}</div>
        <div className="flex justify-center">{legend}</div>
      </div>
      <div className="space-y-3 min-w-0">
        {cards}
        {inspector}
        <p className="text-[11px] text-muted-foreground">{VALUE_PROFILE_DISCLAIMER}</p>
      </div>
    </div>
  );
}
