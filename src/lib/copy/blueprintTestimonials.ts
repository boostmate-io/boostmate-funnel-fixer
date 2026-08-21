import { supabase } from "@/integrations/supabase/client";

export interface BlueprintTestimonial {
  id: string;
  client_name?: string;
  client_type?: string;
  quote?: string;
  main_outcome?: string;
  tone?: string;
  offer_ids?: string[];
}

/**
 * Loads testimonials + client results from the Business Blueprint
 * (proof_authority.social_proof) for a workspace. Testimonials linked to the
 * given offer are returned first so the AI can favour the most relevant proof.
 */
export async function fetchBlueprintTestimonials(
  subAccountId: string,
  offerId?: string | null
): Promise<BlueprintTestimonial[]> {
  const { data, error } = await supabase
    .from("business_blueprints")
    .select("proof_authority")
    .eq("sub_account_id", subAccountId)
    .maybeSingle();
  if (error || !data) return [];

  const sp: any = (data as any).proof_authority?.social_proof || {};
  const testimonials: BlueprintTestimonial[] = Array.isArray(sp.testimonials)
    ? sp.testimonials.filter((t: any) => t && (t.quote || t.main_outcome))
    : [];

  // Client results with a quote also work as testimonials.
  const fromResults: BlueprintTestimonial[] = Array.isArray(sp.client_results)
    ? sp.client_results
        .filter((r: any) => r && r.quote)
        .map((r: any) => ({
          id: r.id,
          client_name: r.client_type,
          client_type: r.client_type,
          quote: r.quote,
          main_outcome: r.result_achieved,
          offer_ids: r.offer_ids,
        }))
    : [];

  const all = [...testimonials, ...fromResults];
  if (!offerId) return all;
  return [
    ...all.filter((t) => t.offer_ids?.includes(offerId)),
    ...all.filter((t) => !t.offer_ids?.includes(offerId)),
  ];
}

export function testimonialLabel(t: BlueprintTestimonial): string {
  const who = t.client_name || t.client_type || "Client";
  const quote = (t.quote || t.main_outcome || "").replace(/\s+/g, " ").trim();
  return `${who} — ${quote.slice(0, 70)}${quote.length > 70 ? "…" : ""}`;
}

/** Serialises testimonials into a compact block for the AI prompt. */
export function serializeTestimonials(list: BlueprintTestimonial[]): string {
  return list
    .map((t, i) =>
      [
        `#${i + 1} id: ${t.id}`,
        t.client_name ? `client: ${t.client_name}` : null,
        t.client_type ? `client type: ${t.client_type}` : null,
        t.main_outcome ? `main outcome: ${t.main_outcome}` : null,
        t.tone ? `tone: ${t.tone}` : null,
        t.quote ? `quote: "${t.quote}"` : null,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}
