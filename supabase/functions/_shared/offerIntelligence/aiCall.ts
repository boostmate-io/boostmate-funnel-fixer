// One AI call for an Offer Intelligence operation (structured tool output).
// Shared by the public generator and the authenticated Builder function.

import { buildOperationInstructions, buildOperationInput, OPERATION_OUTPUT_SCHEMAS, type OfferOperation, type OperationContext } from "./operations.ts";

declare const Deno: { env: { get(k: string): string | undefined } };

export const OFFER_INTELLIGENCE_MODEL = "google/gemini-2.5-flash";

export type AiErrorCode = "ai_not_configured" | "ai_busy" | "ai_unavailable" | "ai_failed" | "ai_malformed" | "ai_truncated" | "ai_wrong_tool";
export type AiCallResult = { ok: true; raw: unknown } | { ok: false; status: number; error: AiErrorCode };

/** Technical output problems a single fresh attempt can plausibly fix. */
export const RECOVERABLE_AI_ERRORS: AiErrorCode[] = ["ai_truncated", "ai_wrong_tool", "ai_malformed"];

/**
 * Pure: extract the `deliver` tool arguments from a chat-completions body.
 * Rejects output cut off by the token cap and calls to any other tool
 * (e.g. Gemini's built-in python interpreter wrapping the call as code),
 * so they are never mistaken for invalid business content.
 */
export function parseDeliverResponse(data: any): AiCallResult {
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === "length") return { ok: false, status: 502, error: "ai_truncated" };
  const call = choice?.message?.tool_calls?.[0];
  if (!call) return { ok: false, status: 502, error: "ai_malformed" };
  if (call.function?.name !== "deliver") return { ok: false, status: 502, error: "ai_wrong_tool" };
  try {
    const raw = JSON.parse(call.function?.arguments ?? "null");
    if (!raw || typeof raw !== "object") return { ok: false, status: 502, error: "ai_malformed" };
    return { ok: true, raw };
  } catch { return { ok: false, status: 502, error: "ai_malformed" }; }
}

export async function runOfferOperation(op: OfferOperation, ctx: OperationContext, opts: { extraInstructions?: string; maxTokens?: number } = {}): Promise<AiCallResult> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { ok: false, status: 500, error: "ai_not_configured" };
  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OFFER_INTELLIGENCE_MODEL, temperature: 0.4, max_tokens: opts.maxTokens ?? 3000,
        messages: [
          { role: "system", content: buildOperationInstructions(op, ctx) + (opts.extraInstructions ? `\n\n${opts.extraInstructions}` : "") },
          { role: "user", content: buildOperationInput(ctx) },
        ],
        tools: [{ type: "function", function: { name: "deliver", description: `Return the ${op} result`, parameters: OPERATION_OUTPUT_SCHEMAS[op] } }],
        tool_choice: { type: "function", function: { name: "deliver" } },
      }),
    });
  } catch { return { ok: false, status: 502, error: "ai_unavailable" }; }
  if (resp.status === 429) return { ok: false, status: 429, error: "ai_busy" };
  if (resp.status === 402 || resp.status === 403) return { ok: false, status: 503, error: "ai_unavailable" };
  if (!resp.ok) { console.error("offer-intelligence ai", op, resp.status, (await resp.text()).slice(0, 300)); return { ok: false, status: 502, error: "ai_failed" }; }
  let data: unknown;
  try { data = await resp.json(); } catch { return { ok: false, status: 502, error: "ai_malformed" }; }
  const parsed = parseDeliverResponse(data);
  if (!parsed.ok) console.warn("offer-intelligence ai output", op, (parsed as { error: string }).error);
  return parsed;
}
