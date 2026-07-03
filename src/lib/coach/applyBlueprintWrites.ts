// =============================================================================
// applyBlueprintWrites — takes a batch of Coach-proposed field writes and
// merges them into the correct JSON columns of business_blueprints for the
// given sub-account. Used by the Coach "Apply all" action for section/global
// scope. Client-side write (RLS scoped to the user's sub-account).
// =============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface BlueprintWrite {
  /** Dot-path relative to the blueprint row, e.g. "customer_clarity.avatar_who"
   *  or "offer_stack.angle.hook" or "proof_authority.authority.headline". */
  path: string;
  /** Human-readable label — shown in the Apply card. */
  label: string;
  /** The value to write. Strings only for now. */
  value: string;
}

type BlueprintPatch = {
  customer_clarity?: Record<string, any>;
  offer_stack?: Record<string, any>;
  growth_system?: Record<string, any>;
  proof_authority?: Record<string, any>;
};

const ROOT_COLUMNS = new Set([
  "customer_clarity",
  "offer_stack",
  "growth_system",
  "proof_authority",
]);

function setDeep(target: Record<string, any>, segments: string[], value: any) {
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (typeof cursor[key] !== "object" || cursor[key] === null || Array.isArray(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[segments[segments.length - 1]] = value;
}

export async function applyBlueprintWrites(
  subAccountId: string,
  writes: BlueprintWrite[],
): Promise<{ applied: number; error?: string }> {
  if (!writes.length) return { applied: 0 };

  // 1) Load current row
  const { data: row, error: loadErr } = await supabase
    .from("business_blueprints")
    .select("id, customer_clarity, offer_stack, growth_system, proof_authority")
    .eq("sub_account_id", subAccountId)
    .maybeSingle();

  if (loadErr || !row) {
    return { applied: 0, error: loadErr?.message ?? "Blueprint not found" };
  }

  // 2) Build patch column-by-column
  const patch: BlueprintPatch = {
    customer_clarity: { ...(row.customer_clarity as any) },
    offer_stack: { ...(row.offer_stack as any) },
    growth_system: { ...(row.growth_system as any) },
    proof_authority: { ...(row.proof_authority as any) },
  };

  let applied = 0;
  for (const w of writes) {
    const segments = w.path.split(".").filter(Boolean);
    if (segments.length < 2) continue;
    const [root, ...rest] = segments;
    if (!ROOT_COLUMNS.has(root)) continue;
    setDeep((patch as any)[root], rest, w.value);
    applied++;
  }

  // 3) Update
  const { error: updErr } = await supabase
    .from("business_blueprints")
    .update(patch as any)
    .eq("id", row.id);

  if (updErr) return { applied: 0, error: updErr.message };
  return { applied };
}
