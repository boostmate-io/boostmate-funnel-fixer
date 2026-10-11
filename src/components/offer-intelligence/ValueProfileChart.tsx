// =============================================================================
// ValueProfileChart — reusable four-axis diamond (Before / After). Not yet
// mounted in any production screen. Not-assessed dimensions are drawn as a
// dashed axis with a label — never as a low score.
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
const SIZE = 240;
const C = SIZE / 2;
const R = 90;

const point = (d: ValueDimension, score: number) => {
  const [x, y] = DIR[d];
  return [C + x * (score / 10) * R, C + y * (score / 10) * R] as const;
};

function polygon(profile: ValueProfile | null | undefined) {
  if (!profile) return null;
  const pts = AXES.filter((d) => profile.dimensions[d]?.score != null).map((d) => point(d, profile.dimensions[d].score!));
  return pts.length >= 2 ? pts.map(([x, y]) => `${x},${y}`).join(" ") : null;
}

interface Props {
  before?: ValueProfile | null;
  after?: ValueProfile | null;
  className?: string;
  /** Optional per-dimension improvement ideas shown in the inspector. */
  improvements?: Partial<Record<ValueDimension, string[]>>;
}

export default function ValueProfileChart({ before, after, className, improvements }: Props) {
  const [selected, setSelected] = useState<ValueDimension | null>(null);
  const main = after ?? before ?? null;
  const beforePoly = polygon(before);
  const afterPoly = polygon(after);
  const sel = selected && main ? main.dimensions[selected] : null;
  const label = (d: ValueDimension, p?: ValueProfile | null) => {
    const s = p?.dimensions[d]?.score;
    return s == null ? "Not assessed" : `${s}/10`;
  };

  return (
    <div className={cn("w-full max-w-md space-y-3", className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto" role="img"
        aria-label={`Value profile: ${AXES.map((d) => `${DIMENSION_LABELS[d]} ${label(d, main)}`).join(", ")}`}>
        {[2.5, 5, 7.5, 10].map((s) => (
          <polygon key={s} points={AXES.map((d) => point(d, s).join(",")).join(" ")} className="fill-none stroke-border" strokeWidth={1} />
        ))}
        {AXES.map((d) => {
          const [x, y] = point(d, 10);
          const missing = main?.dimensions[d]?.score == null;
          return <line key={d} x1={C} y1={C} x2={x} y2={y} className={missing ? "stroke-muted-foreground" : "stroke-border"} strokeDasharray={missing ? "4 4" : undefined} strokeWidth={1} data-axis={d} data-missing={missing || undefined} />;
        })}
        {beforePoly && <polygon points={beforePoly} className="fill-muted-foreground/15 stroke-muted-foreground" strokeWidth={1.5} strokeDasharray="5 3" data-profile="before" />}
        {afterPoly && <polygon points={afterPoly} className="fill-primary/20 stroke-primary" strokeWidth={2} data-profile="after" />}
        {AXES.map((d) => {
          const [x, y] = point(d, 12);
          const anchor = DIR[d][0] > 0 ? "start" : DIR[d][0] < 0 ? "end" : "middle";
          return (
            <text key={d} x={x} y={y + (DIR[d][1] > 0 ? 8 : DIR[d][1] < 0 ? -2 : 4)} textAnchor={anchor} className="fill-foreground text-[9px] font-medium">
              {DIMENSION_LABELS[d]}
            </text>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {before && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-muted-foreground" />Before</span>}
        {after && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary" />After</span>}
        <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-muted-foreground" />Not assessed</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {AXES.map((d) => (
          <button key={d} type="button" onClick={() => setSelected(selected === d ? null : d)} aria-pressed={selected === d}
            className={cn("rounded-md border px-3 py-2 text-left text-xs transition-colors", selected === d ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
            <span className="block font-medium text-foreground">{DIMENSION_LABELS[d]}</span>
            <span className="text-muted-foreground">
              {before && after ? `${label(d, before)} → ${label(d, after)}` : label(d, main)}
            </span>
          </button>
        ))}
      </div>

      {sel && selected && (
        <div className="rounded-md border border-border p-3 text-xs space-y-2" aria-live="polite">
          <p className="font-medium text-foreground">{DIMENSION_LABELS[selected]} — {sel.status === "assessed" ? `${sel.score}/10` : "Not assessed (not enough information)"}</p>
          {[["Strengths", sel.strengths], ["To improve", sel.weaknesses], ["Unknown", sel.unknown]].map(([title, list]) =>
            (list as typeof sel.strengths).length ? (
              <div key={title as string}>
                <p className="text-muted-foreground font-medium">{title as string}</p>
                <ul className="list-disc pl-4 text-foreground">
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
      )}
      <p className="text-[11px] text-muted-foreground">{VALUE_PROFILE_DISCLAIMER}</p>
    </div>
  );
}
