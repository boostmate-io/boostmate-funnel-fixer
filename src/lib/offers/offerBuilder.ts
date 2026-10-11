// Client for the authenticated Offer Builder function (Stages A–E + chat) and
// the final approval, which saves through the existing offer repository.
import { supabase } from "@/integrations/supabase/client";
import type { BuilderStage, Diagnosis, Understanding } from "@shared/offerIntelligence/builderSession";
import {
  conflictingEdits, fingerprint, stableStringify, type BuilderDecisions, type PackageWrite,
} from "@shared/offerIntelligence/builderStages";
import { mapGeneratedToDesign } from "@shared/offerIntelligence/designMapping";
import { normalizeOfferDesign, emptyOfferDesign, type EcosystemTier } from "@/components/business-blueprint/offerDesignTypes";
import {
  OFFER_ROW_COLUMNS, designForRow, designToRowValues, insertEcosystemOffer, saveOfferDesign, updateEcosystemOffer,
} from "./offerRepository";

export interface BuilderSession {
  id: string;
  sub_account_id: string;
  user_id: string;
  offer_id: string | null;
  tier: string;
  mode: "new" | "existing";
  stage: BuilderStage;
  status: "active" | "completed" | "abandoned";
  intake: { idea?: string };
  understanding: Understanding | null;
  context_confirmed_at: string | null;
  diagnosis: Diagnosis | null;
  decisions: BuilderDecisions | null;
  draft_design: Record<string, any> | null;
  result_offer_id: string | null;
  completed_at: string | null;
  version: number;
  created_at?: string;
  updated_at: string;
}

const MESSAGES: Record<string, string> = {
  conflict: "This session was updated elsewhere. We reloaded the latest version — please try again.",
  forbidden_workspace: "You don't have access to this workspace.",
  offer_not_found: "This offer could not be found.",
  idea_required: "Describe your offer idea first.",
  context_not_confirmed: "Confirm the working context before running the diagnosis.",
  diagnosis_required: "Run the diagnosis first.",
  decisions_required: "Make a decision on every Strengthen item first (choose, write your own, or keep as is).",
  package_required: "Generate the package first.",
  reassess_required: "Earlier stages changed. Re-run the outdated stages before approving.",
  category_changed: "This offer's category changed. Re-run Understand first.",
  stage_unavailable: "That stage isn't available yet.",
  nothing_included: "Keep at least one element in the package.",
  invalid_value: "One of the values isn't allowed for this field (e.g. a price must be a positive number). Nothing was saved.",
  empty_value: "A value can't be empty — exclude the element instead.",
  empty_custom: "Write your own alternative first.",
  ai_busy: "The AI is busy right now. Please try again in a minute.",
  ai_invalid: "The AI returned an unusable answer. Nothing was saved — please try again.",
  ai_failed: "The AI request failed. Please try again.",
  ai_malformed: "The AI request failed. Please try again.",
  ai_unavailable: "The AI is temporarily unavailable.",
  session_closed: "This session is closed.",
  save_failed: "Your message couldn't be saved. Please try again.",
};
export const builderErrorMessage = (code?: string) => (code && MESSAGES[code]) || "Something went wrong. Please try again.";

export class BuilderError extends Error {
  constructor(public code: string, public session?: BuilderSession, public details?: unknown) { super(code); }
}

async function invoke<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("offer-builder", { body });
  if (error) {
    let payload: any = null;
    try { payload = await (error as any).context?.json?.(); } catch { /* ignore */ }
    throw new BuilderError(payload?.error ?? "unknown", payload?.session, payload?.details);
  }
  return data as T;
}
const call = (body: Record<string, unknown>) => invoke<{ session: BuilderSession; resumed?: boolean }>(body);

export const startBuilderSession = (subAccountId: string, target: { offerId: string } | { tier: string }, opts: { forceNew?: boolean } = {}) =>
  call({ action: "start", sub_account_id: subAccountId, force_new: !!opts.forceNew, ...("offerId" in target ? { offer_id: target.offerId } : { tier: target.tier }) });

export type BuilderAction = "understand" | "diagnose" | "strengthen" | "package" | "final_assessment" | "save" | "approval_begin" | "approval_complete";
export const builderAction = (s: BuilderSession, action: BuilderAction, extra: Record<string, unknown> = {}) =>
  call({ action, session_id: s.id, version: s.version, ...extra });

export async function loadBuilderSession(id: string): Promise<BuilderSession | null> {
  const { data } = await supabase.from("offer_builder_sessions").select("*").eq("id", id).maybeSingle();
  return (data as unknown as BuilderSession) ?? null;
}

/** Own sessions in this workspace (active + completed), newest first. */
export async function listBuilderSessions(subAccountId: string): Promise<BuilderSession[]> {
  const { data } = await supabase.from("offer_builder_sessions").select("*")
    .eq("sub_account_id", subAccountId).in("status", ["active", "completed"]).order("updated_at", { ascending: false }).limit(30);
  return (data ?? []) as unknown as BuilderSession[];
}

// ---- Builder chat ------------------------------------------------------------

export interface BuilderChatMessage { id: string; role: "user" | "assistant"; content: string; created_at: string }
export async function loadBuilderChat(sessionId: string): Promise<BuilderChatMessage[]> {
  const { data } = await supabase.from("offer_builder_messages").select("id,role,content,created_at").eq("session_id", sessionId).order("created_at", { ascending: true }).limit(200);
  return (data ?? []) as BuilderChatMessage[];
}
export const sendBuilderChat = (s: BuilderSession, message: string) => invoke<{ reply: string }>({ action: "chat", session_id: s.id, message });

// ---- Final approval -----------------------------------------------------------

export type ApprovalResult =
  | { ok: true; offerId: string; session: BuilderSession }
  | { ok: false; conflicts: string[] }
  | { ok: false; error: string };

const norm = (d: any) => normalizeOfferDesign(d ?? emptyOfferDesign());

/**
 * Save the approved package into Offer Design. Existing offers merge the
 * approved writes onto the CURRENT saved design (unrelated, hidden fields and
 * list IDs preserved); newer edits to the same fields block unless the user
 * explicitly chose `applyToLatest`. New offers are created only here, never
 * as Primary. Idempotent across retries (session marker + design fingerprint).
 */
export async function approveBuilderSession(s: BuilderSession, opts: { applyToLatest?: boolean; userId: string }): Promise<ApprovalResult> {
  const pkg = s.decisions?.package;
  if (!pkg || !s.decisions?.final) return { ok: false, error: "not_ready" };
  const tier = s.tier as EcosystemTier;
  const writes: PackageWrite[] = pkg.writes.filter((w) => w.include);

  // Resolve the target and its current saved design.
  let target: { kind: "primary"; blueprintId: string; offerId: string } | { kind: "row"; row: any } | { kind: "new"; blueprintId: string; existing: any | null };
  let current: any;
  if (s.offer_id) {
    const { data: row } = await supabase.from("offers").select(OFFER_ROW_COLUMNS).eq("id", s.offer_id).maybeSingle();
    if (!row) return { ok: false, error: "offer_not_found" };
    if ((row as any).tier !== s.tier) return { ok: false, error: "category_changed" };
    if ((row as any).source === "blueprint_core") {
      const { data: bp } = await supabase.from("business_blueprints").select("offer_stack").eq("id", (row as any).blueprint_id).maybeSingle();
      current = norm((bp as any)?.offer_stack);
      target = { kind: "primary", blueprintId: (row as any).blueprint_id, offerId: (row as any).id };
    } else {
      current = designForRow(row as any);
      target = { kind: "row", row };
    }
  } else {
    const { data: bp } = await supabase.from("business_blueprints").select("id").eq("sub_account_id", s.sub_account_id).maybeSingle();
    if (!bp) return { ok: false, error: "no_blueprint" };
    // Retry safety: an offer created by this session earlier is reused, never duplicated.
    const { data: existing } = await supabase.from("offers").select(OFFER_ROW_COLUMNS).eq("blueprint_id", (bp as any).id).eq("data->>builder_session_id", s.id).maybeSingle();
    target = { kind: "new", blueprintId: (bp as any).id, existing };
    current = existing ? designForRow(existing as any) : norm(null);
  }

  // Already applied by an interrupted earlier attempt?
  const approval = s.decisions?.approval;
  const alreadyDone = (target.kind === "new" && !!target.existing) || (approval?.status === "applying" && approval.expected && approval.expected === fingerprint(current));

  let merged = current;
  if (!alreadyDone) {
    if (s.mode === "existing" && !opts.applyToLatest) {
      const conflicts = conflictingEdits(norm(pkg.baseDesign), current, writes);
      if (conflicts.length) return { ok: false, conflicts };
    }
    const res = mapGeneratedToDesign(tier, current, writes.map((w) => ({ path: w.path, value: w.value })));
    if (!res.ok) return { ok: false, error: "invalid_value" };
    merged = norm(res.design);
  }

  // Claim the approval (version-locked → a second tab/double click gets a conflict).
  let session: BuilderSession;
  try {
    ({ session } = await builderAction(s, "approval_begin", { expected: fingerprint(merged) }));
  } catch (e) { return { ok: false, error: (e as BuilderError).code }; }

  let offerId: string;
  if (target.kind === "new") {
    if (target.existing) offerId = target.existing.id;
    else {
      const { data: last } = await supabase.from("offers").select("sort_order").eq("blueprint_id", target.blueprintId).eq("tier", tier).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const values = designToRowValues(merged, { data: {} }, "Untitled Offer", tier);
      const { row, error } = await insertEcosystemOffer({
        name: values.name, tier, source: "blueprint_manual", blueprint_id: target.blueprintId,
        sub_account_id: s.sub_account_id, user_id: opts.userId, sort_order: ((last as any)?.sort_order ?? -1) + 1,
        data: { ...values.data, builder_session_id: s.id },
      });
      if (error || !row) return { ok: false, error: "save_failed" };
      offerId = row.id;
    }
  } else if (target.kind === "primary") {
    offerId = target.offerId;
    if (!alreadyDone) { const { error } = await saveOfferDesign({ kind: "primary", blueprintId: target.blueprintId }, merged); if (error) return { ok: false, error: "save_failed" }; }
  } else {
    offerId = target.row.id;
    if (!alreadyDone) {
      const { error } = await updateEcosystemOffer(offerId, designToRowValues(merged, target.row, target.row.name, tier));
      if (error) return { ok: false, error: "save_failed" };
    }
  }
  try {
    const done = await builderAction(session, "approval_complete", { offer_id: offerId });
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("offers:changed"));
    return { ok: true, offerId, session: done.session };
  } catch (e) { return { ok: false, error: (e as BuilderError).code }; }
}

export { stableStringify };
