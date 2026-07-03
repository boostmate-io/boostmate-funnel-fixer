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
- If the user seems stuck, offer 2-3 concrete quick replies via suggest_quick_replies.
- Never answer a direct request to fill, draft, update, or write Blueprint fields with only quick replies. A direct write request must produce a Blueprint write proposal.`;

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
- When the user asks to fill in a WHOLE section or sub-block (e.g. "fill in Customer Clarity", "vul de sectie in", "fill in the ideal client avatar"), propose writes for EVERY field in that section/sub-block that is currently empty — do NOT stop after 1 or 2 fields. Consult the Blueprint field paths list for the full set of fields per section.
- Ask sharp questions one at a time when direction is unclear.`;

const COACH_GLOBAL = `You are the user's on-demand Growth Strategist. No specific field or section is in focus.

- Do NOT call propose_field_value.
- Answer anything about their business: strategy, positioning, offers, funnels, copy, growth.
- Ground every answer in what you know from their Blueprint and remembered facts.
- If the user asks you to fill in / draft / vullen / invullen / uitwerken of Blueprint fields, you MUST call the propose_blueprint_writes tool with concrete drafts. Do not just describe what you would write — call the tool. The user will click Apply to actually save.
- When they ask to fill a whole section or sub-block, propose writes for EVERY field in that section that is currently empty — never a partial subset.
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

// In-memory cache for admin-editable prompts (per edge instance, 60s TTL).
type PromptSet = { base: string; field: string; section: string; global: string };
const PROMPT_FALLBACK: PromptSet = {
  base: COACH_BASE,
  field: COACH_BLUEPRINT_FIELD,
  section: COACH_BLUEPRINT_SECTION,
  global: COACH_GLOBAL,
};
let promptCache: { at: number; prompts: PromptSet } | null = null;
const PROMPT_TTL_MS = 60_000;

async function loadCoachPrompts(supabase: any): Promise<PromptSet> {
  if (promptCache && Date.now() - promptCache.at < PROMPT_TTL_MS) return promptCache.prompts;
  try {
    const { data: action } = await supabase
      .from("ai_actions")
      .select("id")
      .eq("slug", "coach-chat")
      .eq("is_active", true)
      .maybeSingle();
    if (!action?.id) return PROMPT_FALLBACK;

    const { data: links } = await supabase
      .from("ai_action_instruction_blocks")
      .select("instruction_block_id")
      .eq("ai_action_id", action.id);
    const ids = (links ?? []).map((l: any) => l.instruction_block_id);
    if (ids.length === 0) return PROMPT_FALLBACK;

    const { data: blocks } = await supabase
      .from("ai_instruction_blocks")
      .select("name, content")
      .in("id", ids);

    const byName = new Map<string, string>((blocks ?? []).map((b: any) => [b.name, b.content]));
    const prompts: PromptSet = {
      base: byName.get("coach:base") || PROMPT_FALLBACK.base,
      field: byName.get("coach:blueprint-field") || PROMPT_FALLBACK.field,
      section: byName.get("coach:blueprint-section") || PROMPT_FALLBACK.section,
      global: byName.get("coach:global") || PROMPT_FALLBACK.global,
    };
    promptCache = { at: Date.now(), prompts };
    return prompts;
  } catch (err) {
    console.error("[coach-chat] loadCoachPrompts failed, using fallback:", err);
    return PROMPT_FALLBACK;
  }
}

function buildSystemPrompt(
  context: any,
  memoryFacts: Array<{ key: string; value: string }>,
  prompts: PromptSet,
): string {
  const parts: string[] = [prompts.base];

  const locale = (context?.businessContext?.locale ?? "en").toString().toLowerCase().slice(0, 2);
  const langName = locale === "nl" ? "Dutch (Nederlands)" : "English";
  parts.push(
    `# Language\nAlways reply in ${langName}. All prose, quick replies, remembered fact values and proposed field drafts MUST be in ${langName}, regardless of the language the user writes in. The only exception: keep JSON keys and path strings (e.g. remember_fact "key", propose_blueprint_writes "path") in English snake_case.`,
  );

  if (context?.scope === "blueprint.field") {
    parts.push(prompts.field);
  } else if (context?.scope === "blueprint.section") {
    parts.push(prompts.section);
    parts.push(BLUEPRINT_FIELD_PATHS);
  } else if (context?.scope === "global") {
    parts.push(prompts.global);
    parts.push(BLUEPRINT_FIELD_PATHS);
  }
...
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

const WRITE_INTENT_RE =
  /\b(fill|draft|generate|write|update|complete|create|make|set|apply|invul|invullen|vul|vullen|uitwerk|uitwerken|schrijf|maak|werk uit|bijwerk|aanvul|aanvullen)\b/i;
const NOT_FILLED_RE = /\b(not filled|isn['’]?t filled|nothing happened|niet ingevuld|niets ingevuld|er gebeurt niets|werkt niet)\b/i;
const BLUEPRINT_AREA_RE =
  /\b(customer clarity|dream client|avatar|icp|pain|problem|desire|goal|transformation|offer|pricing|proof|authority|growth system|blueprint|sectie|section|veld|field)\b/i;

function isBlueprintWriteIntent(scope: string | undefined, messages: any[]) {
  if (scope !== "blueprint.section" && scope !== "global") return false;
  const userMessages = messages.filter((m: any) => m?.role !== "assistant");
  const latest = String(userMessages.at(-1)?.content ?? "");
  const recent = userMessages
    .slice(-4)
    .map((m: any) => String(m?.content ?? ""))
    .join("\n");

  if (WRITE_INTENT_RE.test(latest) && BLUEPRINT_AREA_RE.test(latest)) return true;
  if (NOT_FILLED_RE.test(latest) && (WRITE_INTENT_RE.test(recent) || BLUEPRINT_AREA_RE.test(recent))) return true;
  return false;
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
    const prompts = await loadCoachPrompts(supabase);
    const systemPrompt = buildSystemPrompt(context, memoryFacts, prompts);
    const llmMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : "",
      })),
    ];

    const tools = toolsForScope(context?.scope);
    const shouldForceBlueprintWrites = isBlueprintWriteIntent(context?.scope, messages);

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
        tool_choice: shouldForceBlueprintWrites
          ? { type: "function", function: { name: "propose_blueprint_writes" } }
          : "auto",
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
