// AI Coach chat edge function
// Handles multi-turn coaching conversations scoped to a target
// (e.g. one Blueprint field). Persists messages and returns the next
// assistant turn including any tool-call parts (proposed answers, quick replies).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// -----------------------------------------------------------------------------
// System prompt composition (composable blocks — later moved to DB)
// -----------------------------------------------------------------------------

const COACH_BASE = `You are the Boostmate AI Coach — a warm, sharp Growth Strategist who helps founders sharpen their business thinking.

Principles:
- Ask targeted, insightful questions. Never dump a wall of questions.
- Reference what the user already wrote elsewhere in their Business Blueprint when relevant.
- Be concise. One or two thoughts per turn.
- When you have enough information, call the propose_field_value tool with a polished draft. Do not include the drafted answer inside your prose reply — put it only in the tool call.
- After a draft is proposed, invite the user to Replace / Refine / Keep chatting.
- If the user seems stuck, offer 2-3 concrete quick replies via suggest_quick_replies.`;

const COACH_BLUEPRINT_FIELD = `You are coaching the user on a single Business Blueprint field.

- Understand the field's intent (label + helper) before asking anything.
- If the field already has content, do NOT ignore it — ask what to sharpen, expand, or reframe.
- If the field is empty, ask 1-2 grounding questions first, then draft.
- Drafts must be written IN THE USER'S VOICE (first person or their business tone). No hype language.
- Keep drafts to the length/style the field expects (short line vs paragraph).`;

function buildSystemPrompt(context: any): string {
  const parts: string[] = [COACH_BASE];

  if (context?.scope === "blueprint.field") {
    parts.push(COACH_BLUEPRINT_FIELD);
  }

  if (context?.target) {
    const t = context.target;
    parts.push(
      `# Current target\n- Field: ${t.label}\n- Field id: ${t.id}${t.helper ? `\n- Helper: ${t.helper}` : ""}\n- Current value: ${
        t.currentValue?.trim() ? `"${t.currentValue}"` : "(empty)"
      }`,
    );
  }

  if (context?.businessContext?.blueprintSnapshot) {
    const bp = context.businessContext.blueprintSnapshot;
    const summary = {
      customer_clarity: bp.customer_clarity,
      offer_angle: bp.offer_stack?.angle,
      offer_stack: bp.offer_stack?.stack,
      pricing: bp.offer_stack?.pricing,
      proof_authority: bp.proof_authority,
    };
    parts.push(
      `# Business Blueprint context (JSON — reference sparingly)\n${JSON.stringify(summary, null, 2)}`,
    );
  }

  return parts.join("\n\n---\n\n");
}

// -----------------------------------------------------------------------------
// Tools
// -----------------------------------------------------------------------------

const tools = [
  {
    type: "function",
    function: {
      name: "propose_field_value",
      description:
        "Propose a polished value for the current field. Call this only when you have enough information to write a strong version.",
      parameters: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "The exact text to place in the field, written in the user's voice.",
          },
          reasoning: {
            type: "string",
            description: "One short sentence: why this draft works.",
          },
        },
        required: ["value", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_quick_replies",
      description:
        "Offer 2-4 short suggested replies the user can click. Use when the user might be stuck or when steering the conversation.",
      parameters: {
        type: "object",
        properties: {
          replies: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["replies"],
        additionalProperties: false,
      },
    },
  },
];

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return jsonResponse({ error: "LOVABLE_API_KEY not configured" }, 500);

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return jsonResponse({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { conversationId, context, messages } = body ?? {};

    if (!conversationId || !Array.isArray(messages)) {
      return jsonResponse({ error: "conversationId and messages required" }, 400);
    }

    // Verify conversation ownership
    const { data: conv, error: convErr } = await supabase
      .from("ai_coach_conversations")
      .select("id, user_id, sub_account_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) return jsonResponse({ error: "Conversation not found" }, 404);
    if (conv.user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

    // Build LLM messages
    const systemPrompt = buildSystemPrompt(context);
    const llmMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : "",
      })),
    ];

    // Call Lovable AI Gateway (OpenAI-compatible)
    const gatewayRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: llmMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text();
      const status = gatewayRes.status;
      if (status === 429) return jsonResponse({ error: "AI rate limit reached. Please retry shortly." }, 429);
      if (status === 402) return jsonResponse({ error: "AI credits exhausted. Please top up in Settings." }, 402);
      return jsonResponse({ error: `AI gateway error: ${errText}` }, 502);
    }

    const gatewayJson = await gatewayRes.json();
    const assistantMsg = gatewayJson?.choices?.[0]?.message ?? {};
    const assistantText: string = assistantMsg.content ?? "";
    const toolCalls: any[] = assistantMsg.tool_calls ?? [];

    // Build UI parts
    const parts: any[] = [];
    if (assistantText.trim()) parts.push({ type: "text", text: assistantText });

    for (const tc of toolCalls) {
      const name = tc.function?.name;
      let args: any = {};
      try {
        args = JSON.parse(tc.function?.arguments ?? "{}");
      } catch {
        // ignore
      }
      if (name === "propose_field_value") {
        parts.push({ type: "proposal", value: args.value ?? "", reasoning: args.reasoning ?? "" });
      } else if (name === "suggest_quick_replies") {
        parts.push({ type: "quick_replies", replies: Array.isArray(args.replies) ? args.replies : [] });
      }
    }

    if (parts.length === 0) {
      parts.push({ type: "text", text: "…" });
    }

    // Persist the last user message (if not already persisted) + assistant message
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUser && !lastUser._persisted) {
      await supabase.from("ai_coach_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUser.content ?? "",
        parts: [{ type: "text", text: lastUser.content ?? "" }],
      });
    }

    const { data: savedAssistant } = await supabase
      .from("ai_coach_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantText,
        parts,
      })
      .select("id, role, content, parts, created_at")
      .single();

    await supabase
      .from("ai_coach_conversations")
      .update({
        updated_at: new Date().toISOString(),
        context_snapshot: context ?? {},
      })
      .eq("id", conversationId);

    return jsonResponse({ message: savedAssistant });
  } catch (err: any) {
    console.error("coach-chat error", err);
    return jsonResponse({ error: err?.message ?? "Internal error" }, 500);
  }
});
