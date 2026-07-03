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
- When you have enough information, call the propose_field_value tool with a polished draft. Do not include the drafted answer inside your prose reply — put it only in the tool call.
- After a draft is proposed, invite the user to Replace / Refine / Keep chatting.
- Drafts must be written IN THE USER'S VOICE. No hype language.`;

const COACH_BLUEPRINT_SECTION = `You are coaching the user on an ENTIRE Business Blueprint section, not one field.

- Do NOT call propose_field_value — there is no single field to replace.
- Diagnose gaps and weaknesses in the section as a whole.
- When the user asks you to fill in / draft / vullen / invullen / uitwerken of the section (or a set of fields), you MUST call the propose_blueprint_writes tool with concrete drafts for the relevant field paths. Never claim you will fill something without calling that tool in the SAME turn.
- SCOPE OF WRITES — CRITICAL:
  • If the user names ONE specific field (e.g. "vul het veld 'traits or mindset that define them' in", "fill in the pain field"), propose writes ONLY for that single field. Do NOT add unrelated fields to the same proposal.
  • If the user names a sub-block or whole section ("fill in the ideal client avatar", "vul de sectie in"), propose writes for EVERY field in that block that is currently empty — do NOT stop after 1 or 2 fields.
  • Never mix: don't answer a single-field request with a batch that touches other fields.
- RESPECT FIELD KIND: every field has a kind (see the field paths list). For a "tags" or "chips" field, the value MUST be a short comma-separated list of items (e.g. "ambitious, self-directed, growth-hungry") — never a paragraph. For "textarea" fields, write full prose.
- Ask sharp questions one at a time when direction is unclear.`;

const COACH_GLOBAL = `You are the user's on-demand Growth Strategist. No specific field or section is in focus.

- Do NOT call propose_field_value.
- Answer anything about their business: strategy, positioning, offers, funnels, copy, growth.
- Ground every answer in what you know from their Blueprint and remembered facts.
- If the user asks you to fill in / draft / vullen / invullen / uitwerken of Blueprint fields, you MUST call the propose_blueprint_writes tool with concrete drafts. Do not just describe what you would write — call the tool. The user will click Apply to actually save.
- SCOPE OF WRITES — CRITICAL:
  • If the user names ONE specific field, propose writes ONLY for that field. Do NOT include unrelated fields.
  • If the user names a whole section or sub-block, propose writes for EVERY empty field in it — never a partial subset.
- RESPECT FIELD KIND: for "tags"/"chips" fields, the value MUST be a short comma-separated list of items (e.g. "ambitious, self-directed, growth-hungry") — never a paragraph. For "textarea" fields, write full prose.
- If something important is missing from the Blueprint, say so and suggest where to add it.`;


// The prompt fragment listing every writable field path is generated from the
// shared blueprint schema. To add a field, edit
// supabase/functions/_shared/blueprintSchema.ts — this string updates itself.
const BLUEPRINT_FIELD_PATHS = renderBlueprintFieldPathsPrompt();

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
  messages: any[] = [],
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
Every proposed item MUST include a value for every listed field. Suggested item count: ${suggested} unless the user specifies otherwise. Label each write "Item <n> — <field label>". Do NOT write to any other Blueprint path in this turn.`,
    );
  } else {
    const allowedPaths = allowedBlueprintWritePaths(context, messages);
    if (allowedPaths && allowedPaths.size > 0) {
      parts.push(
        `# Current write target — hard constraint\nFor the user's latest request, propose Blueprint writes ONLY for these path(s):\n${[
          ...allowedPaths,
        ]
          .map((path) => `- ${path} — ${BLUEPRINT_FIELD_META[path]?.kind ?? "textarea"} — ${BLUEPRINT_FIELD_META[path]?.label ?? path}`)
          .join("\n")}\nDo not write to any other Blueprint path.`,
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

  return parts.join("\n\n---\n\n");
}

function latestUserText(messages: any[]): string {
  return String([...messages].reverse().find((m: any) => m?.role !== "assistant")?.content ?? "");
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

function requestedSingleBlueprintPath(messages: any[]): string | null {
  const latest = latestUserText(messages);
  if (!WRITE_INTENT_RE.test(latest)) return null;

  const normalized = normalizeForMatch(latest);
  const matches = Object.entries(BLUEPRINT_FIELD_META)
    .map(([path, meta]) => {
    const normalizedPath = normalizeForMatch(path);
    const normalizedKey = normalizeForMatch(path.split(".").at(-1) ?? path);
    const aliases = [meta.label, ...meta.aliases].map(normalizeForMatch);
      const candidates = [normalizedPath, normalizedKey, ...aliases].filter((needle) => needle.length > 2);
      const bestScore = candidates.reduce((best, needle, index) => {
        if (!normalized.includes(needle)) return best;
        const score = index <= 1 ? 100 + needle.length : 20 + needle.length;
        return Math.max(best, score);
      }, 0);
      return { path, score: bestScore };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return null;
  if (matches.length > 1 && matches[0].score === matches[1].score) return null;
  return matches[0].path;
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
    latestUserText(messages),
  );
}

function requestedBlueprintSubBlock(messages: any[]): string | null {
  const latest = latestUserText(messages);
  if (!WRITE_INTENT_RE.test(latest)) return null;

  const normalized = normalizeForMatch(latest);
  const matches = Object.entries(BLUEPRINT_SUB_BLOCK_ALIASES)
    .map(([block, aliases]) => {
      const score = aliases
        .map(normalizeForMatch)
        .filter((needle) => needle.length > 2)
        .reduce((best, needle) => (normalized.includes(needle) ? Math.max(best, 20 + needle.length) : best), 0);
      return { block, score };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return null;
  if (matches.length > 1 && matches[0].score === matches[1].score) return null;
  return matches[0].block;
}

function allowedBlueprintWritePaths(context: any, messages: any[]): Set<string> | null {
  const requestedPath = requestedSingleBlueprintPath(messages);
  if (requestedPath) return new Set([requestedPath]);

  const requestedBlock = requestedBlueprintSubBlock(messages);
  if (!requestedBlock) return null;

  const snapshot = context?.businessContext?.blueprintSnapshot;
  const paths = BLUEPRINT_SUB_BLOCK_PATHS[requestedBlock] ?? [];
  const emptyPaths = paths.filter((path) => isEmptyBlueprintValue(getDeepValue(snapshot, path)));
  return new Set(emptyPaths);
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
  if (path === "offer_stack.angle.core_promise.timeframe") return normalizeTimeframeValue(value);
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

function sanitizeBlueprintWrites(writesArg: any, messages: any[], context: any) {
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

  const allowedPaths = allowedBlueprintWritePaths(context, messages);
  const emptyOnly = latestUserAsksForEmptyOnly(messages);
  const byPath = new Map<string, { path: string; label: string; value: string }>();

  if (allowedPaths && allowedPaths.size === 0) return [];

  for (const raw of writesArg) {
    if (!raw || typeof raw.path !== "string" || typeof raw.value !== "string") continue;
    const path = canonicalBlueprintPath(raw.path);
    const meta = BLUEPRINT_FIELD_META[path];
    // Reject unknown paths and paths flagged non-writable in the shared schema.
    if (!meta || !meta.aiWritable) continue;
    if (allowedPaths && !allowedPaths.has(path)) continue;
    if (!allowedPaths && emptyOnly && !isEmptyBlueprintValue(getDeepValue(context?.businessContext?.blueprintSnapshot, path))) continue;

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
  if (scope === "blueprint.section" || scope === "global")
    return [proposeBlueprintWritesTool, ...base];
  return base;
}

const WRITE_INTENT_RE =
  /(?:\b(fill|draft|generate|write|update|complete|create|make|set|apply|invullen|vullen|uitwerken|schrijf|maak|bijwerk|aanvullen)\b|\binvul|\bvul|\buitwerk|werk uit)/i;
const NOT_FILLED_RE = /\b(not filled|isn['’]?t filled|nothing happened|niet ingevuld|niets ingevuld|er gebeurt niets|werkt niet)\b/i;
const BLUEPRINT_AREA_RE =
  /\b(customer clarity|dream client|avatar|icp|pain|problem|desire|goal|transformation|offer|pricing|proof|authority|growth system|blueprint|sectie|section|veld|field)\b/i;

function isBlueprintWriteIntent(scope: string | undefined, messages: any[], context?: any) {
  if (scope !== "blueprint.section" && scope !== "global") return false;
  const userMessages = messages.filter((m: any) => m?.role !== "assistant");
  const latest = String(userMessages.at(-1)?.content ?? "");
  const recent = userMessages
    .slice(-4)
    .map((m: any) => String(m?.content ?? ""))
    .join("\n");

  // In list-section mode any add/suggest/generate intent triggers a write.
  if (context?.target?.listSection && (WRITE_INTENT_RE.test(latest) || /\b(suggest|voorstel|stel voor|geef|give|show|toon|ideas|ideeën|opties|options|add)\b/i.test(latest))) {
    return true;
  }

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
    const systemPrompt = buildSystemPrompt(context, memoryFacts, prompts, messages);
    const llmMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : "",
      })),
    ];

    const tools = toolsForScope(context?.scope);
    const shouldForceBlueprintWrites = isBlueprintWriteIntent(context?.scope, messages, context);

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
        const value = normalizeCurrentFieldProposal(context, args.value ?? "");
        if (value) parts.push({ type: "proposal", value, reasoning: args.reasoning ?? "" });
      } else if (
        name === "propose_blueprint_writes" &&
        (context?.scope === "blueprint.section" || context?.scope === "global")
      ) {
        const writes = sanitizeBlueprintWrites(args.writes, messages, context);
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
      const locale = (context?.businessContext?.locale ?? "en").toString().toLowerCase().slice(0, 2);
      parts.push({
        type: "text",
        text: shouldForceBlueprintWrites
          ? locale === "nl"
            ? "Ik kon hiervoor geen passende Blueprint-updates maken. Probeer het nog één keer met de naam van de sectie of het veld."
            : "I couldn't create matching Blueprint updates for that. Please try once more with the section or field name."
          : "…",
      });
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
