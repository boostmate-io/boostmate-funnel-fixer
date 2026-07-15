// AI Coach chat edge function — ONE engine for every scope.
// Scopes: blueprint.field | blueprint.section | copy.component | funnel.node | global
// Handles multi-turn coaching, tool-calling (proposals, quick replies, memory),
// and persists messages + facts to Lovable Cloud.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  BLUEPRINT_FIELDS,
  BLUEPRINT_SUB_BLOCKS,
  renderBlueprintFieldPathsPrompt,
  type BlueprintFieldKind,
} from "../_shared/blueprintSchema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAIN_OFFER_STEP1_WRITE_PATHS = new Set([
  "offer_stack.angle.core_outcome",
  "offer_stack.angle.core_promise.desired_outcome",
  "offer_stack.angle.main_offer_name",
  "offer_stack.angle.short_description",
]);

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
- Respect the current field kind. If the target kind is "tags" or "chips", proposed values MUST be a short comma-separated list of items, never a paragraph.
- If the field already has content, do NOT ignore it — ask what to sharpen, expand, or reframe.
- If the field is empty, ask 1-2 grounding questions first, then draft.
- If the user asks for examples, inspiration, sharpening, expansion, rewriting, generation, or a concrete suggestion, call propose_field_value in the same turn. Do not answer with only more quick replies.
- When you have enough information, call the propose_field_value tool with a polished draft. Do not include the drafted answer inside your prose reply — put it only in the tool call.
- After a draft is proposed, invite the user to Replace / Refine / Keep chatting.
- Drafts must be written IN THE USER'S VOICE. No hype language.`;

const GUIDED_WALKTHROUGH = `# Guided walkthrough vs direct fill — CRITICAL

Detect the user's intent BEFORE proposing any Blueprint writes.

1. DIRECT FILL — the user names a specific field, sub-block or section AND uses a write verb ("vul in", "fill in", "draft", "generate", "schrijf", "write", "invullen", "uitwerken"), or asks for a full bulk fill ("vul alles in", "fill it all in", "just draft everything").
   → Behave as before: call propose_blueprint_writes in the SAME turn for the exact scope named.

2. GUIDED WALKTHROUGH — the user asks for HELP building/creating/designing something without naming one specific field ("help me create my main offer", "help me build my offer", "walk me through", "coach me through", "begeleid me", "help me met opstellen", "laten we samen…").
   → Do NOT call propose_blueprint_writes yet.
   → Turn 1: (a) give a one-line roadmap of the steps you will walk through, (b) open Step 1 with 2-3 sentences of best-practice context (pull from the Knowledge base), (c) ask 1-2 sharp grounding questions. NO writes in this turn.
   → Following turns: react to the user's answer, sharpen the thinking, then — when the user confirms the current step feels right or gives you enough to draft — call propose_blueprint_writes for ONLY the 1-3 fields that belong to THAT step. Never batch fields from multiple steps in one turn.
   → After each Apply/Dismiss (visible in "Already handled"): open the NEXT step in the sequence with fresh best-practice context and questions. Do not re-propose handled fields.
   → Keep momentum: 1-2 clarifying exchanges per step, then propose. Do not loop endlessly on one step.

If unsure which mode applies, default to GUIDED. A user who wanted a bulk dump will say "just fill it all in" — then switch to DIRECT FILL.`;

const COACH_BLUEPRINT_SECTION = `You are coaching the user on an ENTIRE Business Blueprint section, not one field.

- Do NOT call propose_field_value — there is no single field to replace.
- Diagnose gaps and weaknesses in the section as a whole.
- SCOPE OF WRITES — CRITICAL:
  • If the user names ONE specific field (e.g. "vul het veld 'traits or mindset that define them' in", "fill in the pain field"), propose writes ONLY for that single field. Do NOT add unrelated fields to the same proposal.
  • If the user names a sub-block or whole section ("fill in the ideal client avatar", "vul de sectie in"), propose writes for EVERY field in that block that is currently empty — do NOT stop after 1 or 2 fields.
  • Never mix: don't answer a single-field request with a batch that touches other fields.
- RESPECT FIELD KIND: every field has a kind (see the field paths list). For a "tags" or "chips" field, the value MUST be a short comma-separated list of items (e.g. "ambitious, self-directed, growth-hungry") — never a paragraph. For "textarea" fields, write full prose.
- Ask sharp questions one at a time when direction is unclear.

${GUIDED_WALKTHROUGH}`;

const COACH_GLOBAL = `You are the user's on-demand Growth Strategist. No specific field or section is in focus.

- Do NOT call propose_field_value.
- Answer anything about their business: strategy, positioning, offers, funnels, copy, growth.
- Ground every answer in what you know from their Blueprint and remembered facts.
- SCOPE OF WRITES — CRITICAL:
  • If the user names ONE specific field, propose writes ONLY for that field. Do NOT include unrelated fields.
  • If the user names a whole section or sub-block, propose writes for EVERY empty field in it — never a partial subset.
- RESPECT FIELD KIND: for "tags"/"chips" fields, the value MUST be a short comma-separated list of items (e.g. "ambitious, self-directed, growth-hungry") — never a paragraph. For "textarea" fields, write full prose.
- If something important is missing from the Blueprint, say so and suggest where to add it.

${GUIDED_WALKTHROUGH}`;




// The prompt fragment listing every writable field path is generated from the
// shared blueprint schema. To add a field, edit
// supabase/functions/_shared/blueprintSchema.ts — this string updates itself.
const BLUEPRINT_FIELD_PATHS = renderBlueprintFieldPathsPrompt();

// In-memory cache for admin-editable prompts (per edge instance, 60s TTL).
type KnowledgeBlock = { name: string; content: string };
type PromptSet = {
  base: string;
  field: string;
  section: string;
  global: string;
  knowledgeBlocks: KnowledgeBlock[];
};
const PROMPT_FALLBACK: PromptSet = {
  base: COACH_BASE,
  field: COACH_BLUEPRINT_FIELD,
  section: COACH_BLUEPRINT_SECTION,
  global: COACH_GLOBAL,
  knowledgeBlocks: [],
};
let promptCache: { at: number; prompts: PromptSet } | null = null;
const PROMPT_TTL_MS = 60_000;

const RESERVED_PROMPT_NAMES = new Set([
  "coach:base",
  "coach:blueprint-field",
  "coach:blueprint-section",
  "coach:global",
]);

// -----------------------------------------------------------------------------
// Blueprint field/sub-block lookups derived from the shared schema
// -----------------------------------------------------------------------------

type CoachFieldKind = "textarea" | "tags" | "chips";

function coachKind(kind: BlueprintFieldKind): CoachFieldKind {
  if (kind === "tags") return "tags";
  if (kind === "chips-single" || kind === "chips-multi") return "chips";
  return "textarea";
}

interface CoachFieldMeta {
  kind: CoachFieldKind;
  label: string;
  aliases: string[];
  aiWritable: boolean;
}

const BLUEPRINT_FIELD_META: Record<string, CoachFieldMeta> = Object.fromEntries(
  BLUEPRINT_FIELDS.map((f) => [
    f.path,
    { kind: coachKind(f.kind), label: f.label, aliases: f.aliases, aiWritable: f.aiWritable },
  ]),
);

const BLUEPRINT_KEY_TO_PATH = new Map(BLUEPRINT_FIELDS.map((f) => [f.key, f.path]));

const BLUEPRINT_SUB_BLOCK_PATHS: Record<string, string[]> = Object.fromEntries(
  BLUEPRINT_SUB_BLOCKS.map((s) => [s.id, s.fieldPaths]),
);

const BLUEPRINT_SUB_BLOCK_ALIASES: Record<string, string[]> = Object.fromEntries(
  BLUEPRINT_SUB_BLOCKS.map((s) => [s.id, s.aliases]),
);

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
    const knowledgeBlocks: KnowledgeBlock[] = (blocks ?? [])
      .filter((b: any) => b?.name && !RESERVED_PROMPT_NAMES.has(b.name) && typeof b.content === "string" && b.content.trim().length > 0)
      .map((b: any) => ({ name: b.name as string, content: b.content as string }));
    const prompts: PromptSet = {
      base: byName.get("coach:base") || PROMPT_FALLBACK.base,
      field: byName.get("coach:blueprint-field") || PROMPT_FALLBACK.field,
      section: byName.get("coach:blueprint-section") || PROMPT_FALLBACK.section,
      global: byName.get("coach:global") || PROMPT_FALLBACK.global,
      knowledgeBlocks,
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
  messages: any[] = [],
  handledDecisions: Array<{ path: string; decision: string }> = [],
): string {
  const parts: string[] = [prompts.base];

  const uiLocale = (context?.businessContext?.locale ?? "en").toString().toLowerCase().slice(0, 2);
  const explicit = explicitLanguageInstruction(messages);
  const effectiveLang = explicit ?? (uiLocale === "nl" ? "nl" : "en");
  const langName = effectiveLang === "nl" ? "Dutch (Nederlands)" : "English";
  const explicitNote = explicit
    ? `\n\nThe user just gave an EXPLICIT language instruction in their latest message. This overrides the UI language. Reply — and regenerate any prior drafts/proposals — in ${langName}.`
    : "";
  parts.push(
    `# Language\nReply in ${langName}. All prose, quick replies, remembered fact values and proposed field drafts MUST be in ${langName}, regardless of the language the user writes in. The only exception: keep JSON keys and path strings (e.g. remember_fact "key", propose_blueprint_writes "path") in English snake_case.${explicitNote}`,
  );

  // General LLM-like behaviour rules for follow-ups.
  parts.push(
    `# Follow-up behaviour — behave like a normal assistant
- If the user reacts to your previous proposal with a short modifier ("in English", "korter", "less hype", "more concrete", "again", "opnieuw", "shorter", "translate to X"), REGENERATE that proposal using the SAME tool and the SAME field paths, applying the requested change. Do NOT ask them to be more specific.
- If the user corrects the target without a verb ("no, the other tab", "nee die andere", "Pain & Friction tab") after you proposed writes, treat it as continuing the previous action for the newly-named scope.
- If the user asks a question about your prior proposal ("why?", "waarom?"), answer in text — do NOT call a tool.
- If the user gives an explicit language instruction, respect it above the UI language and regenerate prior drafts in that language.
- Never respond with only quick replies when the user gave a direct instruction — either call the appropriate tool or answer in text.`,
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

  // Admin-curated knowledge blocks (any instruction block linked to the
  // coach-chat AI action whose name is NOT one of the four reserved prompt
  // slots). Use these as expert reference material — e.g. how to build a
  // high-ticket offer, webinar funnel playbook, VSL scripting, etc.
  if (prompts.knowledgeBlocks && prompts.knowledgeBlocks.length > 0) {
    const kb = prompts.knowledgeBlocks
      .map((b) => `## ${b.name}\n${b.content}`)
      .join("\n\n");
    parts.push(
      `# Knowledge base (reference material)\nUse the material below as expert reference whenever the user's question relates to its topic. Apply it as strategic guidance — do not quote it verbatim, do not mention that you are consulting a knowledge base.\n\n${kb}`,
    );
  }


  if (context?.target) {
    parts.push(`# Current target\n${JSON.stringify(context.target, null, 2)}`);
  }

  if (context?.businessContext?.blueprintSnapshot) {
    parts.push(`# Current Business Blueprint JSON\n${JSON.stringify(context.businessContext.blueprintSnapshot, null, 2)}`);
  }

  const listSection = context?.target?.listSection;
  if (listSection && typeof listSection === "object") {
    const fields = Array.isArray(listSection.itemFields) ? listSection.itemFields : [];
    const suggested = Array.isArray(listSection.suggestedCount) && listSection.suggestedCount.length === 2
      ? `${listSection.suggestedCount[0]}–${listSection.suggestedCount[1]}`
      : "3–5";
    const fieldLines = fields
      .map((f: any) => `  - ${f.key} (${f.kind ?? "text"}) — ${f.label}${f.helper ? `: ${f.helper}` : ""}`)
      .join("\n");
    parts.push(
      `# List section mode — CRITICAL
You are helping the user populate a LIST inside their Business Blueprint.
List label: ${listSection.label ?? context?.target?.label ?? ""}
Base path: ${listSection.basePath}
Currently ${listSection.currentCount ?? 0} item(s) exist.

Each item in this list has these fields:
${fieldLines}

When the user asks you to suggest / generate / propose / fill / draft items for this list, call the propose_blueprint_writes tool ONCE with one write per (item, field) pair. Use paths of exactly this form:
  <basePath>.new_0.<fieldKey>
  <basePath>.new_1.<fieldKey>
  ...
Every proposed item MUST include a value for every listed field. Suggested item count: ${suggested} unless the user specifies otherwise. If the user asks for inspiration or examples, still propose concrete list items as Blueprint writes — do not answer with only quick replies. Label each write "Item <n> — <field label>". Do NOT write to any other Blueprint path in this turn.`,
    );
  } else if (context?.scope === "blueprint.section" || context?.scope === "global") {
    // Soft preferred-paths hint (not a hard filter). The sanitizer still enforces
    // the tab-prefix guard and the "already handled" guard, but no longer drops
    // writes just because they fall outside the regex-detected preference.
    const preferredPaths = preferredBlueprintWritePaths(context, messages);
    const priorPaths = priorAssistantWritePaths(messages);
    if (preferredPaths && preferredPaths.size > 0) {
      parts.push(
        `# Likely write target (hint, not a hard rule)\nBased on the user's latest instruction, they most likely want Blueprint writes for these path(s):\n${[
          ...preferredPaths,
        ]
          .map((path) => `- ${path} — ${BLUEPRINT_FIELD_META[path]?.kind ?? "textarea"} — ${BLUEPRINT_FIELD_META[path]?.label ?? path}`)
          .join(
            "\n",
          )}\nUse these unless the user clearly asked for something else. Do not silently add unrelated fields.`,
      );
    } else if (priorPaths.length > 0) {
      parts.push(
        `# Prior proposed paths\nYour previous turn proposed writes for these paths:\n${priorPaths
          .map((p) => `- ${p}`)
          .join(
            "\n",
          )}\nIf the user's latest message is a modifier ("in English", "shorter", "less hype", "again", etc.), regenerate proposals for these SAME paths with the requested change.`,
      );
    }
    const tabPrefix = context?.scope === "global" ? null : targetRootPrefix(context);
    if (tabPrefix) {
      parts.push(
        `# Active Blueprint tab — hard scope\nThe user is currently working inside "${tabPrefix}". EVERY path in propose_blueprint_writes MUST start with "${tabPrefix}.". Writes to any other tab will be discarded.`,
      );
    }
  }

  if (memoryFacts.length > 0) {
    parts.push(
      `# Remembered business facts\n${memoryFacts
        .map((fact) => `- ${fact.key}: ${fact.value}`)
        .join("\n")}`,
    );
  }

  if (handledDecisions.length > 0) {
    parts.push(
      `# Already handled in this conversation — HARD CONSTRAINT\nThe user has already accepted or dismissed proposals for these Blueprint paths. Do NOT include any of them in propose_blueprint_writes again unless the user explicitly asks to redo that specific field.\n${handledDecisions
        .map((d) => `- ${d.path} (${d.decision})`)
        .join("\n")}`,
    );
  }

  return parts.join("\n\n---\n\n");
}

// -----------------------------------------------------------------------------
// Explicit language detection — a user instruction to reply in a specific
// language overrides the UI locale for this turn.
// -----------------------------------------------------------------------------

function explicitLanguageInstruction(messages: any[]): "en" | "nl" | null {
  const latest = latestUserText(messages);
  if (!latest) return null;
  const t = latest.toLowerCase();
  const wantsEnglish =
    /\b(in\s+(het\s+)?english|in\s+het\s+engels|in\s+engels|english\s+please|please\s+in\s+english|switch\s+to\s+english|translate\s+to\s+english|not\s+dutch|geen\s+nederlands)\b/i.test(
      latest,
    ) || /nee\s+in\s+het\s+engels/i.test(t);
  if (wantsEnglish) return "en";
  const wantsDutch =
    /\b(in\s+(the\s+)?dutch|in\s+het\s+nederlands|in\s+nederlands|nederlands\s+(graag|please)|switch\s+to\s+dutch|translate\s+to\s+dutch|not\s+english|geen\s+engels)\b/i.test(
      latest,
    );
  if (wantsDutch) return "nl";
  return null;
}

// Paths the previous assistant turn proposed writes for (used to regenerate
// on short follow-ups like "in English" / "korter").
function priorAssistantWritePaths(messages: any[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "assistant") continue;
    const parts = Array.isArray(m?.parts) ? m.parts : [];
    const bp = parts.find((p: any) => p?.type === "blueprint_writes");
    if (bp && Array.isArray(bp.writes)) {
      return bp.writes.map((w: any) => String(w?.path ?? "")).filter(Boolean);
    }
    return [];
  }
  return [];
}


function recentConversationText(messages: any[], limit = 10): string {
  return messages
    .slice(-limit)
    .map((m: any) => {
      const role = m?.role === "assistant" ? "assistant" : "user";
      const content = typeof m?.content === "string" ? m.content : serializeAssistantForModel(m);
      return `${role}: ${content}`;
    })
    .join("\n");
}


function assistantRecentlyDiscussedMainOfferStep1(messages: any[]): boolean {
  return messages
    .slice(-8)
    .some((m: any) => {
      if (m?.role !== "assistant") return false;
      const text = `${String(m?.content ?? "")}\n${serializeAssistantForModel(m)}`;
      return /\bstep\s*1\b/i.test(text) && /(core\s+outcome|target\s+client|core\s+promise|main\s+offer)/i.test(text);
    });
}


function isMainOfferStep1BlueprintUpdateRequest(scope: string | undefined, messages: any[]): boolean {
  if (scope !== "blueprint.section" && scope !== "global") return false;
  const latest = latestUserText(messages);
  if (!latest.trim()) return false;
  const recent = recentConversationText(messages, 12);

  const asksForBlueprintUpdates =
    /\bblueprint\s+(updates?|writes?|proposals?)\b/i.test(latest) ||
    /\bpropos(?:e|ed|ing)\s+blueprint\b/i.test(latest) ||
    /\b(update|updates|writes|proposals?)\s+(?:for|as\s+discussed\s+in|from)\s+(?:step\s*)?1\b/i.test(latest) ||
    /\bshouldn['’]?t\s+you\s+(?:need\s+to\s+)?propos(?:e|ed|ing)\b/i.test(latest) ||
    /\bgeef\s+(?:me\s+)?(?:de\s+)?blueprint\s+updates\b/i.test(latest);

  const mentionsStep1 =
    /\bstep\s*1\b/i.test(latest) ||
    /(core\s+outcome|target\s+client|core\s+promise)/i.test(latest) ||
    (/\b(this|current|deze|huidige)\s+step\b/i.test(latest) && assistantRecentlyDiscussedMainOfferStep1(messages));

  const mainOfferContext = /(main\s+offer|offer|core\s+outcome|target\s+client|core\s+promise|\bstep\s*1\b)/i.test(recent);

  const confirmationAfterStep1 =
    /^(ok(?:e|ay)?|cool|looks\s+good|good|yes|ja|prima|top|next(?:\s+step)?|go\s+ahead)[.!\s]*$/i.test(latest.trim()) &&
    assistantRecentlyDiscussedMainOfferStep1(messages) &&
    !priorAssistantHadWrites(messages);

  return mainOfferContext && ((asksForBlueprintUpdates && mentionsStep1) || confirmationAfterStep1);
}


function renderForcedStep1BlueprintWritesPrompt() {
  return `# Mandatory current action — Main Offer Step 1 Blueprint updates
The latest user message is asking for the Blueprint updates for Step 1 of the guided Main Offer walkthrough.

You MUST call propose_blueprint_writes in this turn. Do not answer with prose only. Do not ask "can you be more specific?". Use the prior conversation, remembered facts, and Blueprint snapshot to draft the best Step 1 values.

Use ONLY these Blueprint paths:
- offer_stack.angle.core_outcome — Core Outcome
- offer_stack.angle.core_promise.desired_outcome — Desired Outcome (Core Promise)
- offer_stack.angle.main_offer_name — Main Offer Name
- offer_stack.angle.short_description — Short Offer Description

Prefer 2-4 writes. If the conversation contains enough context for only one or two fields, still propose those concrete writes. Keep values polished, specific, and in the user's language/voice.`;
}


function renderForcedStep1RetryPrompt() {
  return `Your previous attempt did not produce accepted Blueprint writes. Retry now and call propose_blueprint_writes with valid writes only. Use exactly these allowed paths and no others: ${[
    ...MAIN_OFFER_STEP1_WRITE_PATHS,
  ].join(", ")}. Do not ask a clarifying question.`;
}


function latestUserText(messages: any[]): string {
  return String([...messages].reverse().find((m: any) => m?.role !== "assistant")?.content ?? "");
}

// The last user message may include a large pasted context block followed by
// a short instruction ("... fill in the ideal client avatar tab."). Scope
// detection must key off the INSTRUCTION, not the pasted context, otherwise
// alias substrings inside the paste can steal the scope. This helper returns
// only the trailing instruction segment of the latest user message.
function latestInstructionText(messages: any[]): string {
  const raw = latestUserText(messages);
  if (!raw) return "";
  // Split into sentence-ish chunks on line breaks and terminal punctuation,
  // preserving the sentence content.
  const chunks = raw
    .split(/(?:\r?\n|(?<=[.!?])\s+)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (chunks.length === 0) return raw;
  // Prefer the last chunk containing a write-intent verb (+ its neighbour),
  // otherwise fall back to the last ~2 chunks.
  const lastWriteIdx = (() => {
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (WRITE_INTENT_RE.test(chunks[i])) return i;
    }
    return -1;
  })();
  if (lastWriteIdx >= 0) {
    const start = Math.max(0, lastWriteIdx - 1);
    return chunks.slice(start, lastWriteIdx + 1).join(" ");
  }
  return chunks.slice(-2).join(" ");
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'“”‘’`]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalBlueprintPath(rawPath: string): string {
  const path = String(rawPath ?? "").trim();
  if (BLUEPRINT_FIELD_META[path]) return path;
  const key = path.split(".").at(-1) ?? path;
  return BLUEPRINT_KEY_TO_PATH.get(key) ?? path;
}


function requestedSingleBlueprintPath(messages: any[]): { path: string; needleLen: number } | null {
  const latest = latestInstructionText(messages);
  if (!WRITE_INTENT_RE.test(latest)) return null;

  const normalized = normalizeForMatch(latest);
  const matches = Object.entries(BLUEPRINT_FIELD_META)
    .map(([path, meta]) => {
      const normalizedPath = normalizeForMatch(path);
      const normalizedKey = normalizeForMatch(path.split(".").at(-1) ?? path);
      const aliases = [meta.label, ...meta.aliases].map(normalizeForMatch);
      const candidates = [normalizedPath, normalizedKey, ...aliases].filter((needle) => needle.length > 2);
      let bestScore = 0;
      let bestLen = 0;
      candidates.forEach((needle, index) => {
        if (!normalized.includes(needle)) return;
        const score = index <= 1 ? 100 + needle.length : 20 + needle.length;
        if (score > bestScore) {
          bestScore = score;
          bestLen = needle.length;
        }
      });
      return { path, score: bestScore, needleLen: bestLen };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return null;
  if (matches.length > 1 && matches[0].score === matches[1].score) return null;
  return { path: matches[0].path, needleLen: matches[0].needleLen };
}

function getDeepValue(source: any, path: string): unknown {
  return path.split(".").reduce((cursor, key) => cursor?.[key], source);
}

function isEmptyBlueprintValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function latestUserAsksForEmptyOnly(messages: any[]): boolean {
  return /\b(empty|blank|unfilled|missing|remaining|leeg|leegstaande|lege|ontbrekend|resterend|nog niet ingevuld)\b/i.test(
    latestInstructionText(messages),
  );
}

const TAB_OR_SECTION_RE = /\b(tab|tabs|section|sectie|secties|blok|sub[-\s]?block|sub[-\s]?blok)\b/i;

function requestedBlueprintSubBlock(messages: any[]): { block: string; needleLen: number } | null {
  const latest = latestInstructionText(messages);
  // Sub-block detection accepts either a real write verb OR the presence of
  // "tab"/"section" language, so correction turns like
  // "nee, de Ideal Client Avatar tab" still work.
  if (!WRITE_INTENT_RE.test(latest) && !TAB_OR_SECTION_RE.test(latest)) return null;

  const normalized = normalizeForMatch(latest);
  const matches = Object.entries(BLUEPRINT_SUB_BLOCK_ALIASES)
    .map(([block, aliases]) => {
      let bestScore = 0;
      let bestLen = 0;
      aliases
        .map(normalizeForMatch)
        .filter((needle) => needle.length > 2)
        .forEach((needle) => {
          if (!normalized.includes(needle)) return;
          const score = 20 + needle.length;
          if (score > bestScore) {
            bestScore = score;
            bestLen = needle.length;
          }
        });
      return { block, score: bestScore, needleLen: bestLen };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return null;
  if (matches.length > 1 && matches[0].score === matches[1].score) return null;
  return { block: matches[0].block, needleLen: matches[0].needleLen };
}

function targetRootPrefix(context: any): string | null {
  const target = context?.target;
  const id = String(target?.id ?? "");
  const listBase = typeof target?.listSection?.basePath === "string" ? target.listSection.basePath : "";
  const candidate = listBase || id;

  if (candidate.startsWith("offer_stack.stack")) return "offer_stack.stack";
  if (candidate.startsWith("offer_stack.pricing")) return "offer_stack.pricing";
  if (candidate.startsWith("offer_stack.angle")) return "offer_stack.angle";
  if (candidate.startsWith("offer_ecosystem")) return "offer_ecosystem";
  if (candidate.startsWith("customer_clarity")) return "customer_clarity";
  if (candidate.startsWith("growth_system")) return "growth_system";
  if (candidate.startsWith("proof_authority")) return "proof_authority";

  const label = normalizeForMatch(String(target?.label ?? ""));
  if (label.includes("offer stack")) return "offer_stack.stack";
  if (label.includes("pricing")) return "offer_stack.pricing";
  if (label.includes("ecosystem")) return "offer_ecosystem";
  if (label.includes("offer angle") || label.includes("angle")) return "offer_stack.angle";
  if (label.includes("customer clarity")) return "customer_clarity";
  if (label.includes("growth system")) return "growth_system";
  if (label.includes("proof") || label.includes("authority")) return "proof_authority";

  return null;
}

function filterPathsToCurrentTarget(paths: Set<string> | null, context: any): Set<string> | null {
  if (!paths) return null;
  const prefix = targetRootPrefix(context);
  if (!prefix || context?.scope === "global") return paths;
  return new Set([...paths].filter((path) => path === prefix || path.startsWith(`${prefix}.`)));
}

function preferredBlueprintWritePaths(context: any, messages: any[]): Set<string> | null {
  const instruction = latestInstructionText(messages);
  const mentionsTabWord = TAB_OR_SECTION_RE.test(instruction);

  const subBlock = requestedBlueprintSubBlock(messages);
  const singleField = requestedSingleBlueprintPath(messages);

  // Sub-block wins if the user literally said "tab"/"section", or if its
  // matched alias is at least as specific as any matched single-field alias.
  const preferSubBlock =
    subBlock &&
    (mentionsTabWord || !singleField || subBlock.needleLen >= singleField.needleLen);

  if (preferSubBlock && subBlock) {
    const snapshot = context?.businessContext?.blueprintSnapshot;
    const paths = BLUEPRINT_SUB_BLOCK_PATHS[subBlock.block] ?? [];
    const emptyPaths = paths.filter((path) => isEmptyBlueprintValue(getDeepValue(snapshot, path)));
    // If every path already has a value, still allow overwrite for those the
    // user asked to (re)fill by falling back to the full path set.
    const scoped = emptyPaths.length > 0 ? emptyPaths : paths;
    return filterPathsToCurrentTarget(new Set(scoped), context);
  }

  if (singleField) return filterPathsToCurrentTarget(new Set([singleField.path]), context);

  if (subBlock) {
    const snapshot = context?.businessContext?.blueprintSnapshot;
    const paths = BLUEPRINT_SUB_BLOCK_PATHS[subBlock.block] ?? [];
    const emptyPaths = paths.filter((path) => isEmptyBlueprintValue(getDeepValue(snapshot, path)));
    const scoped = emptyPaths.length > 0 ? emptyPaths : paths;
    return filterPathsToCurrentTarget(new Set(scoped), context);
  }

  return null;
}


function cleanTagCandidate(value: string): string {
  return value
    .replace(/^[-–—•\d.)\s]+/g, "")
    .replace(/\b(they|them|their|clients|customers|women|people|mensen|klanten|vrouwen|ze|zij)\b\s*/gi, "")
    .replace(/\b(are|is|have|has|tend to be|tend to|often|usually|mostly|zijn|hebben|vaak|meestal)\b\s*/gi, "")
    .replace(/\b(who|that|die)\b\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?;:]+$/g, "")
    .trim();
}

function normalizeTagOrChipValue(raw: string): string {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const commaItems = text.split(/[,;\n•]+/).map(cleanTagCandidate).filter(Boolean);
  const alreadyList = commaItems.length >= 2 && commaItems.every((item) => item.split(/\s+/).length <= 7);
  const sourceItems = alreadyList
    ? commaItems
    : text
        .replace(/[.!?]+/g, ",")
        .split(/[,;\n•]+|\s+\b(?:and|or|but|en|of|maar)\b\s+/i)
        .map(cleanTagCandidate)
        .filter(Boolean);

  const seen = new Set<string>();
  const items = sourceItems
    .map((item) => item.split(/\s+/).slice(0, 7).join(" ").trim())
    .filter((item) => {
      if (item.length < 2) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  return items.join(", ");
}

function normalizeFieldValue(path: string, value: string): string {
  const meta = BLUEPRINT_FIELD_META[path];
  if (meta?.kind === "tags" || meta?.kind === "chips") return normalizeTagOrChipValue(value);
  if (path === "offer_stack.angle.core_promise.timeframe" || path === "offer_stack.stack.delivery_timeline") return normalizeTimeframeValue(value);
  return String(value ?? "").trim();
}

function normalizeTimeframeValue(value: string): string {
  const raw = String(value ?? "").trim().toLowerCase();
  const compact = raw.replace(/\s+/g, "_").replace(/-/g, "_");
  const allowed = new Set(["7_days", "30_days", "60_days", "90_days", "6_months", "12_months", "custom"]);
  if (allowed.has(compact)) return compact;
  if (/\b7\b/.test(raw) && /\b(day|days|dag|dagen)\b/.test(raw)) return "7_days";
  if (/\b30\b/.test(raw) && /\b(day|days|dag|dagen)\b/.test(raw)) return "30_days";
  if (/\b60\b/.test(raw) && /\b(day|days|dag|dagen)\b/.test(raw)) return "60_days";
  if (/\b90\b/.test(raw) && /\b(day|days|dag|dagen)\b/.test(raw)) return "90_days";
  if (/\b6\b/.test(raw) && /\b(month|months|maand|maanden)\b/.test(raw)) return "6_months";
  if (/\b12\b/.test(raw) && /\b(month|months|maand|maanden)\b/.test(raw)) return "12_months";
  return raw ? "90_days" : "";
}

function normalizeCurrentFieldProposal(context: any, value: string): string {
  const kind = context?.target?.kind;
  if (kind === "tags" || kind === "chips") return normalizeTagOrChipValue(value);

  const targetId = String(context?.target?.id ?? "");
  const path = canonicalBlueprintPath(targetId);
  return normalizeFieldValue(path, value);
}

function sanitizeBlueprintWrites(
  writesArg: any,
  messages: any[],
  context: any,
  handledPaths: Set<string> = new Set(),
  allowedPaths: Set<string> | null = null,
) {
  if (!Array.isArray(writesArg)) return [];

  const listSection = context?.target?.listSection;
  if (listSection && typeof listSection === "object") {
    const base: string = String(listSection.basePath ?? "").replace(/\.$/, "");
    const fieldKeys = new Set<string>(
      (Array.isArray(listSection.itemFields) ? listSection.itemFields : []).map((f: any) => String(f.key)),
    );
    const fieldLabelByKey = new Map<string, string>(
      (Array.isArray(listSection.itemFields) ? listSection.itemFields : []).map((f: any) => [
        String(f.key),
        String(f.label ?? f.key),
      ]),
    );
    const out: { path: string; label: string; value: string }[] = [];
    for (const raw of writesArg) {
      if (!raw || typeof raw.path !== "string" || typeof raw.value !== "string") continue;
      const path = String(raw.path);
      if (!path.startsWith(`${base}.`)) continue;
      const rest = path.slice(base.length + 1).split(".");
      if (rest.length !== 2) continue;
      const [itemKey, fieldKey] = rest;
      if (!/^new_\d+$/.test(itemKey)) continue;
      if (!fieldKeys.has(fieldKey)) continue;
      const value = String(raw.value ?? "").trim();
      if (!value) continue;
      const itemIdx = Number(itemKey.slice(4)) + 1;
      const label = String(raw.label ?? `Item ${itemIdx} — ${fieldLabelByKey.get(fieldKey) ?? fieldKey}`);
      out.push({ path, label, value });
    }
    return out;
  }

  const emptyOnly = latestUserAsksForEmptyOnly(messages);
  const tabPrefix = context?.scope === "global" ? null : targetRootPrefix(context);
  const byPath = new Map<string, { path: string; label: string; value: string }>();

  // Ecosystem writes use a virtual path shape:
  //   offer_ecosystem.<tier>.new_<n>.<name|description|core_outcome>
  // They resolve to inserts in the `offers` table at apply time.
  const ECOSYSTEM_TIERS = new Set(["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"]);
  const ECOSYSTEM_FIELDS = new Set(["name", "description", "core_outcome"]);
  const ECOSYSTEM_FIELD_LABELS: Record<string, string> = {
    name: "Offer Name",
    description: "Description",
    core_outcome: "Core Outcome",
  };
  const isEcosystemWrite = (path: string) => {
    const parts = path.split(".");
    return (
      parts.length === 4 &&
      parts[0] === "offer_ecosystem" &&
      ECOSYSTEM_TIERS.has(parts[1]) &&
      /^new_\d+$/.test(parts[2]) &&
      ECOSYSTEM_FIELDS.has(parts[3])
    );
  };

  for (const raw of writesArg) {
    if (!raw || typeof raw.path !== "string" || typeof raw.value !== "string") continue;
    const rawPath = String(raw.path);

    if (isEcosystemWrite(rawPath)) {
      if (tabPrefix && tabPrefix !== "offer_ecosystem") continue;
      const value = String(raw.value ?? "").trim();
      if (!value) continue;
      const [, tier, itemKey, fieldKey] = rawPath.split(".");
      const itemIdx = Number(itemKey.slice(4)) + 1;
      const label = String(
        raw.label ?? `${tier.replace("_", " ")} — Offer ${itemIdx} — ${ECOSYSTEM_FIELD_LABELS[fieldKey] ?? fieldKey}`,
      );
      if (!byPath.has(rawPath)) byPath.set(rawPath, { path: rawPath, label, value });
      continue;
    }

    const path = canonicalBlueprintPath(rawPath);
    const meta = BLUEPRINT_FIELD_META[path];
    // Hard rules only: unknown paths, non-writable fields, already-handled paths.
    if (!meta || !meta.aiWritable) continue;
    if (allowedPaths && !allowedPaths.has(path)) continue;
    if (handledPaths.has(path)) continue;
    // Hard tab-scope guard stays: when a Blueprint tab is in focus, never
    // accept writes leaking into other tabs (prevents cross-tab UI confusion).
    if (tabPrefix && path !== tabPrefix && !path.startsWith(`${tabPrefix}.`)) continue;
    if (emptyOnly && !isEmptyBlueprintValue(getDeepValue(context?.businessContext?.blueprintSnapshot, path))) continue;

    const value = normalizeFieldValue(path, raw.value);
    if (!value) continue;

    const label = String(raw.label ?? meta.label ?? path);
    if (!byPath.has(path)) byPath.set(path, { path, label, value });
  }

  return [...byPath.values()];
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
  if (scope === "blueprint.section" || scope === "global") {
    // Always expose the writes tool; the model decides when to use it based on
    // the system prompt's follow-up rules. This makes correction/language/tone
    // modifiers ("in English", "shorter", "again") work like they would with a
    // plain LLM instead of being blocked by regex intent gating.
    return [proposeBlueprintWritesTool, ...base];
  }
  return base;
}

// Serialize the client's assistant `parts` into readable text so the model
// can see what IT proposed on prior turns. Without this, tool-only turns come
// through as empty content and the model can't reference its own drafts when
// the user follows up with "in English", "shorter", "why?", etc.
function serializeAssistantForModel(m: any): string {
  const text = typeof m?.content === "string" ? m.content : "";
  const parts = Array.isArray(m?.parts) ? m.parts : [];
  const chunks: string[] = [];
  if (text.trim()) chunks.push(text.trim());
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    if (p.type === "text") continue; // already in content
    if (p.type === "proposal") {
      chunks.push(`[proposed field value] ${String(p.value ?? "")}`);
    } else if (p.type === "blueprint_writes") {
      const writes = Array.isArray(p.writes) ? p.writes : [];
      const lines = writes.map((w: any) => `  - ${w?.path}: ${String(w?.value ?? "").replace(/\s+/g, " ").slice(0, 400)}`);
      chunks.push(`[proposed blueprint writes]\n${lines.join("\n")}`);
    } else if (p.type === "quick_replies") {
      const replies = Array.isArray(p.replies) ? p.replies : [];
      if (replies.length) chunks.push(`[suggested quick replies] ${replies.join(" | ")}`);
    } else if (p.type === "memory_saved") {
      chunks.push(`[remembered fact] ${p.key}: ${p.value}`);
    }
  }
  return chunks.join("\n\n");
}


const WRITE_INTENT_RE =
  /(?:\b(fill|draft|generate|write|update|complete|create|make|set|apply|invullen|vullen|uitwerken|schrijf|maak|bijwerk|aanvullen)\b|\binvul|\bvul|\buitwerk|werk uit)/i;
const NOT_FILLED_RE = /\b(not filled|isn['’]?t filled|nothing happened|niet ingevuld|niets ingevuld|er gebeurt niets|werkt niet)\b/i;
const BLUEPRINT_AREA_RE =
  /\b(customer clarity|dream client|avatar|icp|pain|problem|desire|goal|transformation|offer|pricing|proof|authority|growth system|blueprint|sectie|section|veld|field)\b/i;

const CORRECTION_RE =
  /\b(no|nope|nee|niet die|verkeerd|wrong|bedoelde|bedoel|instead|in plaats|rather|actually|eigenlijk)\b/i;

function priorAssistantHadWrites(messages: any[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "assistant") continue;
    const parts = Array.isArray(m?.parts) ? m.parts : [];
    if (parts.some((p: any) => p?.type === "blueprint_writes")) return true;
    // Fallback: some clients only send content strings; check for our fallback
    // text vs. the phrase "Blueprint updates" isn't reliable, so use parts.
    return false;
  }
  return false;
}

function isBlueprintWriteIntent(scope: string | undefined, messages: any[], context?: any) {
  if (scope !== "blueprint.section" && scope !== "global") return false;
  const userMessages = messages.filter((m: any) => m?.role !== "assistant");
  const latest = String(userMessages.at(-1)?.content ?? "");
  const latestInstruction = latestInstructionText(messages);
  const recent = userMessages
    .slice(-4)
    .map((m: any) => String(m?.content ?? ""))
    .join("\n");

  // In list-section mode any add/suggest/generate/examples intent triggers a write.
  if (context?.target?.listSection && (WRITE_INTENT_RE.test(latest) || /\b(suggest|suggestion|propose|proposal|voorstel|stel\s+.{0,40}\s+voor|geef|give|show|toon|ideas|idea|ideeën|idee|opties|options|examples|example|voorbeelden|voorbeeld|inspire|inspiration|inspiratie|add)\b/i.test(latest))) {
    return true;
  }

  // Primary path: write verb + blueprint area, using only the instruction tail
  // so pasted context doesn't decide intent on its own.
  if (WRITE_INTENT_RE.test(latestInstruction) && BLUEPRINT_AREA_RE.test(latestInstruction)) return true;
  // Fallback to the raw latest message for cases where our tail extractor
  // trimmed too aggressively.
  if (WRITE_INTENT_RE.test(latest) && BLUEPRINT_AREA_RE.test(latest)) return true;
  if (NOT_FILLED_RE.test(latest) && (WRITE_INTENT_RE.test(recent) || BLUEPRINT_AREA_RE.test(recent))) return true;

  // Correction turn: previous assistant proposed writes, and the user is
  // steering to a different tab/section/field. Even without a write verb,
  // this should re-trigger propose_blueprint_writes for the new scope.
  if (
    priorAssistantHadWrites(messages) &&
    (CORRECTION_RE.test(latest) || TAB_OR_SECTION_RE.test(latest) || BLUEPRINT_AREA_RE.test(latest)) &&
    (requestedBlueprintSubBlock(messages) || requestedSingleBlueprintPath(messages))
  ) {
    return true;
  }

  return false;
}

function isFieldProposalIntent(scope: string | undefined, messages: any[]) {
  if (scope !== "blueprint.field") return false;
  const latest = latestUserText(messages);
  return (
    WRITE_INTENT_RE.test(latest) ||
    /\b(example|examples|voorbeelden|voorbeeld|inspire|inspiration|inspiratie|sharpen|aanscherpen|expand|uitbreiden|rewrite|herschrijf|suggest|suggestion|propose|proposal|voorstel|geef|give)\b/i.test(latest)
  );
}


async function fetchCoachCompletion(
  lovableKey: string,
  messages: any[],
  tools: any[],
  toolChoice: any,
) {
  const gatewayRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools,
      tool_choice: toolChoice,
    }),
  });

  if (!gatewayRes.ok) {
    const errText = await gatewayRes.text();
    const status = gatewayRes.status;
    if (status === 429) throw new Error("AI_RATE_LIMIT");
    if (status === 402) throw new Error("AI_CREDITS_EXHAUSTED");
    throw new Error(`AI gateway error: ${errText}`);
  }

  const gatewayJson = await gatewayRes.json();
  return gatewayJson?.choices?.[0]?.message ?? {};
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

    // Load memory facts + previously handled Blueprint paths for this conversation
    const [{ data: memoryRows }, { data: decisionRows }] = await Promise.all([
      supabase
        .from("ai_coach_memory")
        .select("key, value")
        .eq("sub_account_id", subAccountId)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("ai_coach_proposal_decisions")
        .select("path, decision")
        .eq("conversation_id", conversationId),
    ]);
    const memoryFacts = (memoryRows ?? []) as Array<{ key: string; value: string }>;
    const handledDecisions = (decisionRows ?? []) as Array<{ path: string; decision: string }>;
    const handledPaths = new Set(handledDecisions.map((d) => d.path));

    // Build LLM messages
    const prompts = await loadCoachPrompts(supabase);
    const forceStep1BlueprintWrites = isMainOfferStep1BlueprintUpdateRequest(context?.scope, messages);
    const systemPrompt = [
      buildSystemPrompt(context, memoryFacts, prompts, messages, handledDecisions),
      forceStep1BlueprintWrites ? renderForcedStep1BlueprintWritesPrompt() : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");
    const llmMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content:
          m.role === "assistant"
            ? serializeAssistantForModel(m)
            : typeof m.content === "string"
              ? m.content
              : "",
      })),
    ];

    const tools = toolsForScope(context?.scope);
    const forcedBlueprintToolChoice = {
      type: "function",
      function: { name: "propose_blueprint_writes" },
    };

    // Call Lovable AI Gateway (OpenAI-compatible). tool_choice stays "auto":
    // the system prompt tells the model when to call which tool. Forcing a
    // tool caused correction/modifier turns to fail with a fallback bubble.
    let assistantMsg: any;
    try {
      assistantMsg = await fetchCoachCompletion(
        lovableKey,
        llmMessages,
        tools,
        forceStep1BlueprintWrites ? forcedBlueprintToolChoice : "auto",
      );
    } catch (err: any) {
      if (err?.message === "AI_RATE_LIMIT") return jsonResponse({ error: "AI rate limit reached. Please retry shortly." }, 429);
      if (err?.message === "AI_CREDITS_EXHAUSTED") return jsonResponse({ error: "AI credits exhausted. Please top up in Settings." }, 402);
      return jsonResponse({ error: err?.message ?? "AI gateway error" }, 502);
    }
    let assistantText: string = assistantMsg.content ?? "";
    let toolCalls: any[] = assistantMsg.tool_calls ?? [];

    // Build UI parts + persist memory
    const parts: any[] = [];
    const processToolCalls = async () => {
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
        const value = normalizeCurrentFieldProposal(context, args.value ?? "");
        if (value) parts.push({ type: "proposal", value, reasoning: args.reasoning ?? "" });
      } else if (
        name === "propose_blueprint_writes" &&
        (context?.scope === "blueprint.section" || context?.scope === "global")
      ) {
        const writes = sanitizeBlueprintWrites(
          args.writes,
          messages,
          context,
          forceStep1BlueprintWrites ? new Set() : handledPaths,
          forceStep1BlueprintWrites ? MAIN_OFFER_STEP1_WRITE_PATHS : null,
        );
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
    };

    await processToolCalls();

    if (forceStep1BlueprintWrites && !parts.some((p: any) => p?.type === "blueprint_writes")) {
      try {
        assistantMsg = await fetchCoachCompletion(
          lovableKey,
          [...llmMessages, { role: "user", content: renderForcedStep1RetryPrompt() }],
          tools,
          forcedBlueprintToolChoice,
        );
        assistantText = assistantMsg.content ?? "";
        toolCalls = assistantMsg.tool_calls ?? [];
        parts.length = 0;
        await processToolCalls();
      } catch (err: any) {
        if (err?.message === "AI_RATE_LIMIT") return jsonResponse({ error: "AI rate limit reached. Please retry shortly." }, 429);
        if (err?.message === "AI_CREDITS_EXHAUSTED") return jsonResponse({ error: "AI credits exhausted. Please top up in Settings." }, 402);
        // Keep falling through to the targeted fallback below.
      }
    }

    if (forceStep1BlueprintWrites && !parts.some((p: any) => p?.type === "blueprint_writes")) {
      parts.length = 0;
    }

    if (parts.length === 0) {
      const explicit = explicitLanguageInstruction(messages);
      const uiLocale = (context?.businessContext?.locale ?? "en").toString().toLowerCase().slice(0, 2);
      const nl = (explicit ?? (uiLocale === "nl" ? "nl" : "en")) === "nl";
      const priorPaths = priorAssistantWritePaths(messages);
      let text: string;
      if (forceStep1BlueprintWrites) {
        text = nl
          ? "Ik had hier Step 1 Blueprint updates moeten voorstellen, maar kon net geen geldige update-card maken. Geef me nog één keer de kernbelofte of het concrete resultaat uit Step 1, dan zet ik die direct om naar Blueprint updates."
          : "I should have proposed Step 1 Blueprint updates here, but I couldn't create a valid update card. Give me the core promise or concrete outcome from Step 1 once more and I'll turn it directly into Blueprint updates.";
      } else if (priorPaths.length > 0) {
        text = nl
          ? "Ik heb je vorige voorstel niet kunnen herzien. Kan je aangeven wat er anders moet (bv. taal, toon, lengte)?"
          : "I couldn't revise my previous proposal. Can you say what should change (e.g. language, tone, length)?";
      } else {
        text = nl
          ? "Kan je iets specifieker zijn? Ik help je graag verder."
          : "Could you be a bit more specific? Happy to help.";
      }
      parts.push({ type: "text", text });
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
