// AI Coach chat edge function — ONE engine for every scope.
// Scopes: blueprint.field | blueprint.section | copy.component | funnel.node | global
// Handles multi-turn coaching, tool-calling (proposals, quick replies, memory),
// and persists messages + facts to Lovable Cloud.

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
// System prompt composition
// -----------------------------------------------------------------------------

const COACH_BASE = `You are the Boostmate AI Coach — a warm, sharp Growth Strategist who helps founders sharpen their business thinking.

You are the SINGLE AI interface of Boostmate. Every touchpoint in the app (a specific Blueprint field, a full section, a Copy Component, a Funnel node, or the global bubble) opens the same you. Adapt to the scope you are given.

Principles:
- Ask targeted, insightful questions. Never dump a wall of questions.
- Reference what the user already wrote elsewhere in their Business Blueprint when relevant.
- Be concise. One or two thoughts per turn.
- When you learn a durable fact about the business (positioning, ICP, offer, pricing, tone, non-negotiables, wins), call the remember_fact tool so future sessions carry that context.
- If the user seems stuck, offer 2-3 concrete quick replies via suggest_quick_replies.`;

const COACH_BLUEPRINT_FIELD = `You are coaching the user on a single Business Blueprint field.

- Understand the field's intent (label + helper) before asking anything.
- If the field already has content, do NOT ignore it — ask what to sharpen, expand, or reframe.
- If the field is empty, ask 1-2 grounding questions first, then draft.
- When you have enough information, call the propose_field_value tool with a polished draft. Do not include the drafted answer inside your prose reply — put it only in the tool call.
- After a draft is proposed, invite the user to Replace / Refine / Keep chatting.
- Drafts must be written IN THE USER'S VOICE. No hype language.`;

const COACH_BLUEPRINT_SECTION = `You are coaching the user on an ENTIRE Business Blueprint section, not one field.

- Do NOT call propose_field_value — there is no single field to replace.
- Diagnose gaps and weaknesses in the section as a whole.
- When the user asks you to fill in / draft / vullen / invullen / uitwerken of the section (or a set of fields), you MUST call the propose_blueprint_writes tool with concrete drafts for the relevant field paths. Never claim you will fill something without calling that tool in the SAME turn.
- Ask sharp questions one at a time when direction is unclear.`;

const COACH_GLOBAL = `You are the user's on-demand Growth Strategist. No specific field or section is in focus.

- Do NOT call propose_field_value.
- Answer anything about their business: strategy, positioning, offers, funnels, copy, growth.
- Ground every answer in what you know from their Blueprint and remembered facts.
- If the user asks you to fill in / draft / vullen / invullen / uitwerken of Blueprint fields, you MUST call the propose_blueprint_writes tool with concrete drafts. Do not just describe what you would write — call the tool. The user will click Apply to actually save.
- If something important is missing from the Blueprint, say so and suggest where to add it.`;

const BLUEPRINT_FIELD_PATHS = `# Blueprint field paths (use these exact dot-paths in propose_blueprint_writes)

customer_clarity.avatar_who
customer_clarity.avatar_stage
customer_clarity.avatar_traits
customer_clarity.avatar_not_fit
customer_clarity.pain_main_problem
customer_clarity.pain_daily_frustrations
customer_clarity.pain_already_tried
customer_clarity.pain_consequences
customer_clarity.desire_main_result
customer_clarity.desire_success_vision
customer_clarity.desire_why_badly
customer_clarity.transformation_point_a
customer_clarity.transformation_point_b
customer_clarity.transformation_process

offer_stack.angle.<key>   (angle fields)
offer_stack.stack.<key>   (stack fields)
offer_stack.pricing.<key> (pricing fields)
proof_authority.<sub>.<key>
growth_system.<sub>.<key>

Only write to paths that make sense for the user's request. Use the current Blueprint JSON to see what already exists and what's empty.`;

function buildSystemPrompt(context: any, memoryFacts: Array<{ key: string; value: string }>): string {
  const parts: string[] = [COACH_BASE];

  const locale = (context?.businessContext?.locale ?? "en").toString().toLowerCase().slice(0, 2);
  const langName = locale === "nl" ? "Dutch (Nederlands)" : "English";
  parts.push(
    `# Language\nAlways reply in ${langName}. All prose, quick replies, remembered fact values and proposed field drafts MUST be in ${langName}, regardless of the language the user writes in. The only exception: keep JSON keys and path strings (e.g. remember_fact "key", propose_blueprint_writes "path") in English snake_case.`,
  );

  if (context?.scope === "blueprint.field") {
    parts.push(COACH_BLUEPRINT_FIELD);
  } else if (context?.scope === "blueprint.section") {
    parts.push(COACH_BLUEPRINT_SECTION);
    parts.push(BLUEPRINT_FIELD_PATHS);
  } else if (context?.scope === "global") {
    parts.push(COACH_GLOBAL);
    parts.push(BLUEPRINT_FIELD_PATHS);
  }

  if (context?.target) {
    const t = context.target;
    parts.push(
      `# Current focus\n- Label: ${t.label}\n- Id: ${t.id}${t.helper ? `\n- Helper: ${t.helper}` : ""}${
        t.currentValue?.trim() ? `\n- Current value: "${t.currentValue}"` : "\n- Current value: (empty)"
      }`,
    );
  }

  if (context?.businessContext?.routeHint) {
    parts.push(`# Where the user opened Coach\n${context.businessContext.routeHint}`);
  }

  if (context?.businessContext?.blueprintSnapshot) {
    const bp = context.businessContext.blueprintSnapshot;
    const summary = {
      customer_clarity: bp.customer_clarity,
      offer_angle: bp.offer_stack?.angle,
      offer_stack: bp.offer_stack?.stack,
      pricing: bp.offer_stack?.pricing,
      proof_authority: bp.proof_authority,
      growth_system: bp.growth_system,
    };
    parts.push(
      `# Business Blueprint context (JSON — reference sparingly)\n${JSON.stringify(summary, null, 2)}`,
    );
  }

  if (memoryFacts.length > 0) {
    parts.push(
      `# Remembered facts about this workspace (from previous sessions)\n${memoryFacts
        .map((f) => `- ${f.key}: ${f.value}`)
        .join("\n")}`,
    );
  }

  return parts.join("\n\n---\n\n");
}

// -----------------------------------------------------------------------------
// Tools
// -----------------------------------------------------------------------------

const proposeFieldValueTool = {
  type: "function",
  function: {
    name: "propose_field_value",
    description:
      "Propose a polished value for the current field. Only for blueprint.field scope. Do not call for section or global scopes.",
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
};

const suggestQuickRepliesTool = {
  type: "function",
  function: {
    name: "suggest_quick_replies",
    description:
      "Offer 2-4 short suggested replies the user can click. Use when the user might be stuck or when steering the conversation.",
    parameters: {
      type: "object",
      properties: {
        replies: { type: "array", items: { type: "string" } },
      },
      required: ["replies"],
      additionalProperties: false,
    },
  },
};

const rememberFactTool = {
  type: "function",
  function: {
    name: "remember_fact",
    description:
      "Persist a durable fact about the user's business so future Coach sessions carry it. Use for positioning, ICP, offer, pricing, tone, non-negotiables, wins — NOT for transient chat details.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Short stable key, e.g. 'primary_icp' or 'pricing_stance'.",
        },
        value: {
          type: "string",
          description: "The fact itself, in one sentence.",
        },
      },
      required: ["key", "value"],
      additionalProperties: false,
    },
  },
};

const proposeBlueprintWritesTool = {
  type: "function",
  function: {
    name: "propose_blueprint_writes",
    description:
      "Propose one or more concrete Blueprint field writes as a batch. Use for section/global scope when the user asks to fill in, draft, or generate blueprint content. The user must click Apply — you do NOT write directly. Use the dot-path field paths provided in the system prompt.",
    parameters: {
      type: "object",
      properties: {
        writes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Dot-path, e.g. 'customer_clarity.avatar_who'.",
              },
              label: {
                type: "string",
                description: "Human label for the field, shown to the user.",
              },
              value: {
                type: "string",
                description: "The exact text to write into the field, in the user's voice.",
              },
            },
            required: ["path", "label", "value"],
            additionalProperties: false,
          },
        },
        reasoning: {
          type: "string",
          description: "One short sentence: why these drafts.",
        },
      },
      required: ["writes"],
      additionalProperties: false,
    },
  },
};

function toolsForScope(scope: string | undefined) {
  const base = [suggestQuickRepliesTool, rememberFactTool];
  if (scope === "blueprint.field") return [proposeFieldValueTool, ...base];
  if (scope === "blueprint.section" || scope === "global")
    return [proposeBlueprintWritesTool, ...base];
  return base;
}

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

    const subAccountId = conv.sub_account_id as string;

    // Load memory facts for this workspace
    const { data: memoryRows } = await supabase
      .from("ai_coach_memory")
      .select("key, value")
      .eq("sub_account_id", subAccountId)
      .order("updated_at", { ascending: false })
      .limit(30);
    const memoryFacts = (memoryRows ?? []) as Array<{ key: string; value: string }>;

    // Build LLM messages
    const systemPrompt = buildSystemPrompt(context, memoryFacts);
    const llmMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : "",
      })),
    ];

    const tools = toolsForScope(context?.scope);

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

    // Build UI parts + persist memory
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
      if (name === "propose_field_value" && context?.scope === "blueprint.field") {
        parts.push({ type: "proposal", value: args.value ?? "", reasoning: args.reasoning ?? "" });
      } else if (
        name === "propose_blueprint_writes" &&
        (context?.scope === "blueprint.section" || context?.scope === "global")
      ) {
        const writes = Array.isArray(args.writes)
          ? args.writes
              .filter((w: any) => w && typeof w.path === "string" && typeof w.value === "string")
              .map((w: any) => ({
                path: String(w.path),
                label: String(w.label ?? w.path),
                value: String(w.value),
              }))
          : [];
        if (writes.length > 0) {
          parts.push({ type: "blueprint_writes", writes, reasoning: args.reasoning ?? "" });
        }
      } else if (name === "suggest_quick_replies") {
        parts.push({ type: "quick_replies", replies: Array.isArray(args.replies) ? args.replies : [] });
      } else if (name === "remember_fact") {
        const key = String(args.key ?? "").trim();
        const value = String(args.value ?? "").trim();
        if (key && value) {
          // Upsert by (sub_account_id, key)
          const { data: existing } = await supabase
            .from("ai_coach_memory")
            .select("id")
            .eq("sub_account_id", subAccountId)
            .eq("key", key)
            .maybeSingle();

          if (existing?.id) {
            await supabase
              .from("ai_coach_memory")
              .update({ value, source_conversation_id: conversationId, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("ai_coach_memory").insert({
              sub_account_id: subAccountId,
              key,
              value,
              source_conversation_id: conversationId,
            });
          }
          parts.push({ type: "memory_saved", key, value });
        }
      }
    }

    if (parts.length === 0) {
      parts.push({ type: "text", text: "…" });
    }

    // Persist the last user message + assistant message
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
