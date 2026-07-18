// Build a ConditionContext snapshot from raw workspace records.
// Kept intentionally light — callers pass whatever rows they already have.

import type { ConditionContext } from "./taskTypes";
import type { GrowthAssessmentRow, GrowthStage } from "./types";

interface BuildInput {
  stage?: GrowthStage;
  assessment?: GrowthAssessmentRow | null;
  blueprint?: Record<string, unknown> | null;
  offers?: Array<{ tier?: string | null; is_published?: boolean | null }> | null;
  funnels?: Array<{ is_published?: boolean | null; share_token?: string | null }> | null;
  analyticsEntries?: Array<{ entry_date?: string | null }> | null;
  extras?: Record<string, unknown>;
}

function nonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return Boolean(v);
}

export function buildConditionContext(input: BuildInput): ConditionContext {
  const {
    stage,
    assessment,
    blueprint,
    offers,
    funnels,
    analyticsEntries,
    extras,
  } = input;

  const bp = (blueprint ?? {}) as Record<string, unknown>;
  const offerList = offers ?? [];
  const funnelList = funnels ?? [];
  const entries = analyticsEntries ?? [];

  let lastEntryDays: number | undefined;
  if (entries.length > 0) {
    const latest = entries
      .map((e) => (e.entry_date ? new Date(e.entry_date).getTime() : NaN))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => b - a)[0];
    if (typeof latest === "number") {
      lastEntryDays = Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
    }
  }

  return {
    stage: stage ?? assessment?.computed_stage,
    assessment: {
      hasActive: !!assessment,
      stage: assessment?.computed_stage,
      scores: assessment?.stage_scores,
      answers: assessment?.answers as Record<string, unknown> | undefined,
    },
    blueprint: {
      hasMainOffer: nonEmpty(bp["main_offer"]) || nonEmpty(bp["mainOffer"]),
      hasIcp: nonEmpty(bp["ideal_client_avatar"]) || nonEmpty(bp["icp"]),
      hasCorePromise: nonEmpty(bp["core_promise"]) || nonEmpty(bp["desired_outcome"]),
      hasPricing: nonEmpty(bp["pricing"]),
      hasProof: nonEmpty(bp["proof"]) || nonEmpty(bp["testimonials"]),
      completionPct: typeof bp["completion_pct"] === "number" ? (bp["completion_pct"] as number) : undefined,
    },
    offers: {
      count: offerList.length,
      hasHighTicket: offerList.some((o) => ["premium", "core"].includes(String(o.tier ?? ""))),
      hasLowMidTicket: offerList.some((o) => ["low_ticket", "mid_ticket"].includes(String(o.tier ?? ""))),
      hasFree: offerList.some((o) => String(o.tier ?? "") === "free"),
    },
    funnels: {
      count: funnelList.length,
      hasPublished: funnelList.some((f) => f.is_published === true || !!f.share_token),
    },
    analytics: {
      hasEntries: entries.length > 0,
      lastEntryDays,
    },
    extras: extras ?? {},
  };
}
