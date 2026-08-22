// =============================================================================
// applyBlueprintWrites — takes a batch of Coach-proposed field writes and
// merges them into the correct JSON columns of business_blueprints for the
// given sub-account. Used by the Coach "Apply all" action for section/global
// scope. Client-side write (RLS scoped to the user's sub-account).
// =============================================================================

import { supabase } from "@/integrations/supabase/client";
import {
  BLUEPRINT_COLUMNS,
  BLUEPRINT_FIELD_BY_PATH,
  BLUEPRINT_LISTS,
} from "@shared/blueprintRegistry";
import { emptyOfferDesign } from "@/components/business-blueprint/offerDesignTypes";

export interface BlueprintWrite {
  /** Dot-path relative to the blueprint row, e.g. "customer_clarity.avatar_who"
   *  or "offer_stack.angle.hook" or "proof_authority.authority.headline". */
  path: string;
  /** Human-readable label — shown in the Apply card. */
  label: string;
  /** The value to write. Strings only for now. */
  value: string;
}

type BlueprintPatch = Record<string, Record<string, any>>;

// Columns the registry owns, plus the legacy `growth_system` column that is
// still present on the row.
const ROOT_COLUMNS = new Set<string>([...BLUEPRINT_COLUMNS, "growth_system"]);

const WRITABLE_LIST_PREFIXES = BLUEPRINT_LISTS.filter((l) => l.aiWritable).map((l) => l.basePath);

/**
 * A write is accepted when the registry knows the exact path, or when it
 * targets an item of a registry-declared repeatable list at ANY index
 * (the registry only enumerates the first N indices for the prompt).
 */
function isWritablePath(path: string): boolean {
  const field = BLUEPRINT_FIELD_BY_PATH[path];
  if (field) return field.aiWritable;
  return WRITABLE_LIST_PREFIXES.some((prefix) => /^\d+\./.test(path.slice(prefix.length + 1)) && path.startsWith(`${prefix}.`));
}

const isIndex = (segment: string) => /^\d+$/.test(segment);

const NUMBER_PATH_RE = /^(offer_stack\.pricing\.core_price|offer_stack\.pricing\.premium_upgrade\.price|offer_stack\.pricing\.recurring_offer\.monthly_price|offer_stack\.pricing\.payment_plans\.\d+\.amount)$/;
const BOOLEAN_PATHS = new Set([
  "offer_stack.pricing.recurring_enabled",
  "offer_stack.pricing.premium_enabled",
]);


function coerceForPath(path: string, value: any): any {
  if (BOOLEAN_PATHS.has(path)) {
    if (typeof value === "boolean") return value;
    const s = String(value ?? "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }
  if (NUMBER_PATH_RE.test(path)) {
    if (typeof value === "number") return Number.isFinite(value) ? value : "";
    const s = String(value ?? "").trim();
    if (!s) return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  }
  return value;
}

function setDeep(target: Record<string, any>, segments: string[], value: any) {
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const nextKey = segments[i + 1];
    if (typeof cursor[key] !== "object" || cursor[key] === null) {
      cursor[key] = isIndex(nextKey) ? [] : {};
    }
    cursor = cursor[key];
  }
  cursor[segments[segments.length - 1]] = value;
}


function normalizeFrameworkPillars(patch: BlueprintPatch) {
  const pillars = (patch.offer_stack as any)?.angle?.framework?.pillars;
  if (!Array.isArray(pillars)) return;
  (patch.offer_stack as any).angle.framework.pillars = Array.from(
    { length: pillars.length },
    (_, index) => {
      const pillar = pillars[index] ?? {};
      return {
        id: pillar?.id || crypto.randomUUID(),
        name: pillar?.name ?? "",
        description: pillar?.description ?? "",
      };
    },
  );
}

function normalizeOfferStackLists(patch: BlueprintPatch) {
  const stack = (patch.offer_stack as any)?.stack;
  if (!stack || typeof stack !== "object") return;

  if (Array.isArray(stack.deliverables)) {
    stack.deliverables = stack.deliverables.map((item: any) => ({
      id: item?.id || crypto.randomUUID(),
      name: item?.name ?? "",
      description: item?.description ?? "",
      delivery_types: Array.isArray(item?.delivery_types) ? item.delivery_types : [],
      frequency: item?.frequency ?? "weekly",
    }));
  }

  if (Array.isArray(stack.resources)) {
    stack.resources = stack.resources.map((item: any) => ({
      id: item?.id || crypto.randomUUID(),
      name: item?.name ?? "",
      resource_type: item?.resource_type ?? "",
      description: item?.description ?? "",
    }));
  }

  if (Array.isArray(stack.support_channels)) {
    stack.support_channels = stack.support_channels.map((item: any) => ({
      id: item?.id || crypto.randomUUID(),
      name: item?.name ?? "",
      description: item?.description ?? "",
      frequency: item?.frequency ?? "",
    }));
  }

  if (Array.isArray(stack.bonuses)) {
    stack.bonuses = stack.bonuses.map((item: any) => ({
      id: item?.id || crypto.randomUUID(),
      name: item?.name ?? "",
      description: item?.description ?? "",
      perceived_value: item?.perceived_value ?? "",
    }));
  }

  if (Array.isArray(stack.milestones)) {
    stack.milestones = stack.milestones.map((item: any, index: number) => ({
      id: item?.id || crypto.randomUUID(),
      phase_name: item?.phase_name ?? `Phase ${index + 1}`,
      description: item?.description ?? "",
      expected_outcome: item?.expected_outcome ?? "",
    }));
  }
}

function normalizePricingLists(patch: BlueprintPatch) {
  const pricing = (patch.offer_stack as any)?.pricing;
  if (!pricing || typeof pricing !== "object") return;

  if (Array.isArray(pricing.payment_plans)) {
    pricing.payment_plans = pricing.payment_plans.map((item: any) => ({
      id: item?.id || crypto.randomUUID(),
      type: item?.type || (item?.custom_label ? "custom" : "full_pay"),
      custom_label: item?.custom_label ?? "",
      amount: item?.amount ?? "",
      duration: item?.duration ?? "",
    }));
  }
}

function normalizeArrayWithIds(arr: any, defaults: Record<string, any>) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((item: any) => ({
    ...defaults,
    ...(item ?? {}),
    id: item?.id || crypto.randomUUID(),
  }));
}

function normalizeProofAuthorityLists(patch: BlueprintPatch) {
  const pa = (patch.proof_authority as any);
  if (!pa || typeof pa !== "object") return;

  if (pa.authority && typeof pa.authority === "object") {
    pa.authority.founder_stories = normalizeArrayWithIds(pa.authority.founder_stories, {
      title: "", before: "", challenge: "", breakthrough: "", learned: "",
      after: "", core_lesson: "", emotional_theme: "", external_link: "",
    });
  }

  if (pa.social_proof && typeof pa.social_proof === "object") {
    pa.social_proof.metrics = normalizeArrayWithIds(pa.social_proof.metrics, {
      metric: "", value: "", context: "",
    });
    pa.social_proof.client_results = normalizeArrayWithIds(pa.social_proof.client_results, {
      client_type: "", problem: "", result_achieved: "", timeframe: "",
      explanation: "", measurable_outcome: "", quote: "", proof_type: "", external_link: "",
    });
    pa.social_proof.testimonials = normalizeArrayWithIds(pa.social_proof.testimonials, {
      client_name: "", client_type: "", quote: "", main_outcome: "", tone: "", external_link: "",
    });
    pa.social_proof.authority_assets = normalizeArrayWithIds(pa.social_proof.authority_assets, {
      name: "", description: "", why_it_matters: "", external_link: "",
    });
  }

  if (pa.objections && typeof pa.objections === "object") {
    pa.objections.objections = normalizeArrayWithIds(pa.objections.objections, {
      objection: "", why_believed: "", reframe: "", supporting_proof: "", emotional_concern: "",
    });
    pa.objections.failed_solutions = normalizeArrayWithIds(pa.objections.failed_solutions, {
      what_tried: "", why_failed: "", why_different: "",
    });
    pa.objections.faqs = normalizeArrayWithIds(pa.objections.faqs, {
      question: "", answer: "",
    });
  }

  if (pa.educational && typeof pa.educational === "object") {
    pa.educational.lessons = normalizeArrayWithIds(pa.educational.lessons, {
      title: "", main_topic: "", common_challenge: "", core_insight: "",
      why_matters: "", breakthrough_lesson: "", cta_goal: "", external_link: "",
    });
    pa.educational.mistakes = normalizeArrayWithIds(pa.educational.mistakes, {
      mistake: "", why_made: "", better_approach: "",
    });
    pa.educational.belief_shifts = normalizeArrayWithIds(pa.educational.belief_shifts, {
      old_belief: "", new_belief: "", why_matters: "",
    });
  }
}

const ECOSYSTEM_TIERS = new Set([
  "free", "low_ticket", "mid_ticket", "core", "premium", "continuity",
]);

function partitionEcosystemWrites(writes: BlueprintWrite[]) {
  const eco: BlueprintWrite[] = [];
  const rest: BlueprintWrite[] = [];
  for (const w of writes) {
    const parts = w.path.split(".");
    if (
      parts.length === 4 &&
      parts[0] === "offer_ecosystem" &&
      ECOSYSTEM_TIERS.has(parts[1]) &&
      /^new_\d+$/.test(parts[2]) &&
      ["name", "description", "core_outcome"].includes(parts[3])
    ) {
      eco.push(w);
    } else {
      rest.push(w);
    }
  }
  return { eco, rest };
}

async function applyEcosystemWrites(
  subAccountId: string,
  writes: BlueprintWrite[],
): Promise<number> {
  if (!writes.length) return 0;

  const [{ data: bp }, { data: userData }] = await Promise.all([
    supabase
      .from("business_blueprints")
      .select("id")
      .eq("sub_account_id", subAccountId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const blueprintId = bp?.id ?? null;
  const userId = userData?.user?.id ?? null;
  if (!blueprintId || !userId) return 0;

  // Group writes by (tier, itemKey)
  const groups = new Map<string, { tier: string; fields: Record<string, string> }>();
  for (const w of writes) {
    const [, tier, itemKey, fieldKey] = w.path.split(".");
    // Core is auto-synced from tabs 1–3; never insert a manual core row.
    if (tier === "core") continue;
    const key = `${tier}::${itemKey}`;
    if (!groups.has(key)) groups.set(key, { tier, fields: {} });
    groups.get(key)!.fields[fieldKey] = String(w.value ?? "").trim();
  }

  if (groups.size === 0) return 0;

  // Fetch current max sort_order per tier so new offers append cleanly.
  const { data: existing } = await supabase
    .from("offers")
    .select("tier, sort_order")
    .eq("blueprint_id", blueprintId);
  const maxByTier = new Map<string, number>();
  for (const row of existing ?? []) {
    const cur = maxByTier.get((row as any).tier) ?? -1;
    if ((row as any).sort_order > cur) maxByTier.set((row as any).tier, (row as any).sort_order);
  }

  const payloads = [...groups.values()].map(({ tier, fields }) => {
    const next = (maxByTier.get(tier) ?? -1) + 1;
    maxByTier.set(tier, next);
    return {
      name: (fields.name || "Untitled Offer").trim() || "Untitled Offer",
      tier,
      source: "blueprint_manual" as const,
      blueprint_id: blueprintId,
      sub_account_id: subAccountId,
      user_id: userId,
      sort_order: next,
      data: {
        description: fields.description ?? "",
        core_outcome: fields.core_outcome ?? "",
        delivery_types: [],
        price: "",
      },
    };
  });

  const { error } = await supabase.from("offers").insert(payloads as any);
  if (error) {
    console.error("[applyEcosystemWrites] insert failed", error);
    return 0;
  }
  return payloads.length;
}

/**
 * Serializes every apply call. Each call does a read-modify-write on the
 * blueprint JSON columns, so two overlapping applies (e.g. the user clicking
 * "apply" on several proposed fields in quick succession) would otherwise both
 * read the same original row and the last write would silently drop the other
 * one's field.
 */
let applyQueue: Promise<unknown> = Promise.resolve();

export function applyBlueprintWrites(
  subAccountId: string,
  writes: BlueprintWrite[],
): Promise<{ applied: number; error?: string }> {
  const run = applyQueue.then(() => applyBlueprintWritesUnsafe(subAccountId, writes));
  applyQueue = run.catch(() => undefined);
  return run;
}

async function applyBlueprintWritesUnsafe(
  subAccountId: string,
  writes: BlueprintWrite[],
): Promise<{ applied: number; error?: string }> {
  if (!writes.length) return { applied: 0 };

  const { eco, rest } = partitionEcosystemWrites(writes);

  // Handle ecosystem writes (rows in `offers` table) first — they don't touch
  // the business_blueprints JSON columns.
  const ecoApplied = await applyEcosystemWrites(subAccountId, eco);

  if (rest.length === 0) {
    if (ecoApplied > 0 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("blueprint:updated", { detail: { subAccountId } }),
      );
    }
    return { applied: ecoApplied };
  }

  // 1) Load current row — every registry column plus legacy growth_system.
  const selectColumns = ["id", ...ROOT_COLUMNS].join(", ");
  const { data: row, error: loadErr } = await supabase
    .from("business_blueprints")
    .select(selectColumns)
    .eq("sub_account_id", subAccountId)
    .maybeSingle();

  if (loadErr || !row) {
    return { applied: ecoApplied, error: loadErr?.message ?? "Blueprint not found" };
  }

  // 2) Build patch column-by-column. offer_stack is seeded with the full
  // empty design shape so a Coach write into a fresh row always persists all
  // three sections (angle/stack/pricing) — readers normalize per section.
  const patch: BlueprintPatch = {};
  for (const column of ROOT_COLUMNS) {
    patch[column] =
      column === "offer_stack"
        ? { ...emptyOfferDesign(), ...((((row as any)[column] as any) ?? {})) }
        : { ...(((row as any)[column] as any) ?? {}) };
  }

  let applied = 0;
  for (const w of rest) {
    const segments = w.path.split(".").filter(Boolean);
    if (segments.length < 2) continue;
    const [root, ...tail] = segments;
    if (!ROOT_COLUMNS.has(root)) continue;
    // Registry is the source of truth for what the Coach may write.
    if (root !== "growth_system" && !isWritablePath(w.path)) {
      console.warn(`[applyBlueprintWrites] rejected unknown path "${w.path}"`);
      continue;
    }
    setDeep(patch[root], tail, coerceForPath(w.path, w.value));
    applied++;
  }


  normalizeFrameworkPillars(patch);
  normalizeOfferStackLists(patch);
  normalizePricingLists(patch);
  normalizeProofAuthorityLists(patch);

  // 3) Update
  const { error: updErr } = await supabase
    .from("business_blueprints")
    .update(patch as any)
    .eq("id", (row as any).id);

  if (updErr) return { applied: ecoApplied, error: updErr.message };

  // Broadcast so any mounted useBlueprint hook (or other listeners) reload
  // their local snapshot without a page refresh.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("blueprint:updated", { detail: { subAccountId } }),
    );
  }

  return { applied: applied + ecoApplied };
}

