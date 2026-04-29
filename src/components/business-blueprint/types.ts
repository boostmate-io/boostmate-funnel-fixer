export interface CustomerClarityData {
  // Ideal Customer Avatar
  avatar_who?: string;
  avatar_stage?: string;
  avatar_traits?: string;
  avatar_not_fit?: string;
  // Pain & Friction
  pain_main_problem?: string;
  pain_daily_frustrations?: string;
  pain_already_tried?: string;
  pain_consequences?: string;
  // Desire & Goals
  desire_main_result?: string;
  desire_success_vision?: string;
  desire_why_badly?: string;
  // Transformation
  transformation_point_a?: string;
  transformation_point_b?: string;
  transformation_process?: string;
  // Deprecated (kept optional for backwards compatibility with existing rows)
  avatar_type?: string;
  avatar_niche?: string;
  pain_blockers?: string;
  pain_why_failed?: string;
  desire_dream_scenario?: string;
  desire_emotional_change?: string;
  desire_lifestyle?: string;
  transformation_external?: string;
  transformation_internal?: string;
  transformation_possible?: string;
}

export interface BlueprintRow {
  id: string;
  sub_account_id: string;
  user_id: string;
  customer_clarity: CustomerClarityData;
  offer_stack: Record<string, any>;
  growth_system: Record<string, any>;
  brand_strategy: Record<string, any>;
  proof_authority: Record<string, any>;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export type SectionId = "customer-clarity" | "offer-design" | "growth-system" | "brand-strategy" | "proof-authority";
export type ClaritySubBlock = "avatar" | "pain" | "desire" | "transformation";

export const CLARITY_FIELDS: Record<ClaritySubBlock, (keyof CustomerClarityData)[]> = {
  avatar: ["avatar_who", "avatar_stage", "avatar_traits", "avatar_not_fit"],
  pain: ["pain_main_problem", "pain_daily_frustrations", "pain_already_tried", "pain_consequences"],
  desire: ["desire_main_result", "desire_success_vision", "desire_why_badly"],
  transformation: ["transformation_point_a", "transformation_point_b", "transformation_process"],
};

export function calculateSubBlockProgress(data: CustomerClarityData, block: ClaritySubBlock): number {
  const fields = CLARITY_FIELDS[block];
  const filled = fields.filter((f) => (data[f] || "").toString().trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

export function calculateClarityProgress(data: CustomerClarityData): number {
  const blocks: ClaritySubBlock[] = ["avatar", "pain", "desire", "transformation"];
  const total = blocks.reduce((acc, b) => acc + calculateSubBlockProgress(data, b), 0);
  return Math.round(total / blocks.length);
}
