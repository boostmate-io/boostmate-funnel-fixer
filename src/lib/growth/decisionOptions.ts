// Growth Roadmap V2 — decision option catalogs.
//
// Step 6 minimal inline decision pickers. Each decision task has a fixed set
// of valid values (or free text for chosenProcess). The picker writes the
// selected value through `cycleService.setWorkspaceState` under the same
// dotted key referenced by the seeded activation/completion conditions.
//
// Longer-term the Build Guide layer will replace these pickers with rich UX;
// the key/value contract remains the same.

export interface DecisionOption {
  value: string;
  label: string;
  hint?: string;
}

export interface DecisionSpec {
  /** Dotted key inside `growth_workspace_state.state` (also matches
   *  `extras.<...>` in the condition context). */
  stateKey: string;
  /** Free text input when true; otherwise `options` drives a Select. */
  freeText?: boolean;
  options?: DecisionOption[];
  placeholder?: string;
}

export const DECISION_SPECS: Record<string, DecisionSpec> = {
  "validate-choose-path": {
    stateKey: "validate.chosenPath",
    options: [
      { value: "warm_outreach", label: "Warm outreach" },
      { value: "cold_outreach", label: "Cold outreach" },
      { value: "content", label: "Content" },
      { value: "paid", label: "Paid ads" },
      { value: "partnerships", label: "Partnerships" },
      { value: "existing_audience", label: "Existing audience" },
      { value: "other", label: "Other" },
    ],
  },
  "attract-choose-channel": {
    stateKey: "attract.chosenChannel",
    options: [
      { value: "warm_outreach", label: "Warm outreach" },
      { value: "cold_outreach", label: "Cold outreach" },
      { value: "content", label: "Content" },
      { value: "paid", label: "Paid ads" },
      { value: "partnerships", label: "Partnerships" },
      { value: "existing_audience", label: "Existing audience" },
      { value: "other", label: "Other" },
    ],
  },
  "optimize-identify-bottleneck": {
    stateKey: "optimize.chosenBottleneck",
    options: [
      { value: "lead_quality", label: "Lead quality" },
      { value: "lead_to_conversation", label: "Lead → conversation rate" },
      { value: "sales_conversion", label: "Sales conversion" },
      { value: "funnel_conversion", label: "Funnel conversion" },
      { value: "followup_nurture", label: "Follow-up / nurture" },
      { value: "offer_conversion", label: "Offer conversion" },
      { value: "revenue_per_lead", label: "Revenue per lead" },
    ],
  },
  "scale-choose-lever": {
    stateKey: "scale.chosenLever",
    options: [
      { value: "paid_spend", label: "Increase paid spend" },
      { value: "outbound_volume", label: "Increase outbound volume" },
      { value: "content_velocity", label: "Increase content velocity" },
      { value: "channel_reach", label: "Extend reach on current channel" },
      { value: "second_channel", label: "Add a second channel" },
      { value: "partnership_expansion", label: "Expand partnerships" },
    ],
  },
  "systemize-choose-process": {
    stateKey: "systemize.chosenProcess",
    freeText: true,
    placeholder: "e.g. Weekly sales pipeline review",
  },
  "systemize-choose-path": {
    stateKey: "systemize.chosenPath",
    options: [
      { value: "delegate", label: "Delegate" },
      { value: "automate", label: "Automate" },
      { value: "eliminate", label: "Eliminate" },
    ],
  },
};

export function isDecisionTask(slug: string): boolean {
  return slug in DECISION_SPECS;
}

/** Read the current decision value from a workspace-state snapshot. */
export function readDecisionValue(
  state: Record<string, unknown> | null | undefined,
  slug: string,
): string | undefined {
  const spec = DECISION_SPECS[slug];
  if (!spec || !state) return undefined;
  const parts = spec.stateKey.split(".");
  let cur: unknown = state;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" && cur.length > 0 ? cur : undefined;
}

/** Build the JSON patch that stores a decision value under its dotted key. */
export function buildDecisionPatch(
  stateKey: string,
  value: string,
): Record<string, unknown> {
  const segments = stateKey.split(".");
  let patch: Record<string, unknown> = { [segments[segments.length - 1]]: value };
  for (let i = segments.length - 2; i >= 0; i--) {
    patch = { [segments[i]]: patch };
  }
  return patch;
}

/** Slugs of the reassess tasks per stage — status is derived, not toggled. */
export const REASSESS_SLUGS = new Set<string>([
  "validate-reassess",
  "attract-reassess",
  "optimize-reassess",
  "scale-reassess",
  "systemize-reassess",
]);
