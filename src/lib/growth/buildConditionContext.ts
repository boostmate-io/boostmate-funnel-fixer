// Build a ConditionContext snapshot from raw workspace records.
//
// Layer-B workspace state (attestations, decisions, chosen paths) lives in
// `growth_workspace_state.state` as JSONB. Per-cycle MILESTONE timestamps
// do NOT live there — they live on the active cycle row itself
// (`growth_stage_cycles.milestone_attested_at`) so they cannot leak across
// cycles. See cycleService.attestMilestone / clearMilestone.
//
// buildConditionContext copies workspace state into `extras` and synthesizes
// `extras.reassess.<stage>.completedAfterMilestone` by comparing
// `assessment.created_at` against `cycle.milestone_attested_at`.

import type { ConditionContext, CycleSnapshot } from "./taskTypes";
import type { GrowthAssessmentRow, GrowthStage } from "./types";

interface BuildInput {
  stage?: GrowthStage;
  cycle?: CycleSnapshot | null;
  assessment?: GrowthAssessmentRow | null;
  blueprint?: Record<string, unknown> | null;
  offers?: Array<{ tier?: string | null; is_published?: boolean | null }> | null;
  funnels?: Array<{ is_published?: boolean | null; share_token?: string | null }> | null;
  analyticsEntries?: Array<{ entry_date?: string | null }> | null;
  workspaceState?: Record<string, unknown> | null;
  /** Free-form extra overrides layered on top of workspaceState. */
  extras?: Record<string, unknown>;
}

function nonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return Boolean(v);
}

function parseIso(v: unknown): number | null {
  if (typeof v !== "string" || v.length === 0) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Reassessment completion is derived, not persisted. A reassess task is
 * "completed" for the current cycle when a NEW assessment has landed AFTER
 * the milestone was attested on the active cycle.
 *
 * The flag is only meaningful for the currently active cycle's stage; other
 * stages are set to false (their reassess task is not part of the active plan).
 */
function computeReassessFlags(
  cycle: CycleSnapshot | undefined,
  assessmentCreatedAt: string | undefined,
): Record<string, { completedAfterMilestone: boolean }> {
  const stages: GrowthStage[] = ["validate", "attract", "optimize", "scale", "systemize"];
  const out: Record<string, { completedAfterMilestone: boolean }> = {};
  const assessmentAt = parseIso(assessmentCreatedAt);
  const milestoneAt = cycle ? parseIso(cycle.milestone_attested_at) : null;
  for (const s of stages) {
    const isActive = cycle?.stage === s;
    out[s] = {
      completedAfterMilestone:
        isActive && assessmentAt != null && milestoneAt != null && assessmentAt > milestoneAt,
    };
  }
  return out;
}

export function buildConditionContext(input: BuildInput): ConditionContext {
  const {
    stage,
    cycle,
    assessment,
    blueprint,
    offers,
    funnels,
    analyticsEntries,
    workspaceState,
    extras,
  } = input;

  const bp = (blueprint ?? {}) as Record<string, unknown>;
  const offerList = offers ?? [];
  const funnelList = funnels ?? [];
  const entries = analyticsEntries ?? [];
  const state = (workspaceState ?? {}) as Record<string, unknown>;

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

  const cc = (bp["customer_clarity"] ?? {}) as Record<string, unknown>;
  const os = (bp["offer_stack"] ?? {}) as Record<string, unknown>;
  const pa = (bp["proof_authority"] ?? {}) as Record<string, unknown>;

  // Extras = Layer-B workspace state + synthetic reassess flags + caller overrides.
  const reassess = computeReassessFlags(state, assessment?.created_at);
  const mergedExtras: Record<string, unknown> = {
    ...state,
    reassess: {
      ...((state["reassess"] as Record<string, unknown> | undefined) ?? {}),
      ...reassess,
    },
    ...(extras ?? {}),
  };

  return {
    stage: stage ?? assessment?.computed_stage,
    cycle: cycle ?? undefined,
    assessment: {
      hasActive: !!assessment,
      stage: assessment?.computed_stage,
      scores: assessment?.stage_scores,
      answers: assessment?.answers as Record<string, unknown> | undefined,
      createdAt: assessment?.created_at,
    },
    blueprint: {
      hasMainOffer: nonEmpty(os["main_offer"]) || nonEmpty(os["core_offer"]),
      hasIcp: nonEmpty(cc["ideal_client_avatar"]) || nonEmpty(cc["icp"]),
      hasCorePromise:
        nonEmpty(cc["core_promise"]) ||
        nonEmpty(cc["desired_outcome"]) ||
        nonEmpty(os["core_promise"]),
      hasPricing: nonEmpty(os["pricing"]),
      hasProof:
        nonEmpty(pa["testimonials"]) ||
        nonEmpty(pa["case_studies"]) ||
        nonEmpty(pa["proof"]),
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
      hasPublished: funnelList.some((f) => !!f.share_token),
    },
    analytics: {
      hasEntries: entries.length > 0,
      lastEntryDays,
    },
    extras: mergedExtras,
  };
}
