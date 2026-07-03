# Fase 1 — AI Coach Implementatieplan

Doel: Coach wordt de enige AI-ingang per veld. Blueprint is de eerste consumer, maar engine, contract en UI zijn vanaf dag 1 scope-agnostisch zodat Copy, Funnel, Ads en Email er later zonder refactor bij kunnen.

---

## 1. Database schema (2 nieuwe tabellen)

### `ai_coach_conversations`
Eén thread per (user, scope, target_id). Bij heropenen van hetzelfde veld = zelfde thread.

Kolommen:
- `id` uuid PK
- `user_id` uuid (auth.users)
- `sub_account_id` uuid → sub_accounts
- `scope` text — `blueprint.field` | `copy.component` | `funnel.node` | `global` | ...
- `target_id` text — bv. `avatar_who`, of component-uuid, of `null` voor global
- `target_label` text — human-readable (bv. "Dream Outcome")
- `title` text — auto-gegenereerd na eerste turn
- `context_snapshot` jsonb — laatste bekende CoachContext (voor debugging/replay)
- `created_at`, `updated_at`
- UNIQUE(`user_id`, `scope`, `target_id`) — één thread per veld

### `ai_coach_messages`
- `id` uuid PK
- `conversation_id` uuid → ai_coach_conversations (cascade)
- `role` text — `user` | `assistant` | `system` | `tool`
- `content` text
- `parts` jsonb — AI SDK UIMessage parts (tool-calls, proposed_answer, quick_replies)
- `created_at`

### `ai_coach_memory` (structuur nu, actief gebruik in fase 2)
- `id`, `sub_account_id`, `key` text, `value` text, `source_conversation_id`, `created_at`
- Alleen tabel + RLS + GRANT. Engine schrijft er nog niet naar; dat komt in fase 2.

**RLS + GRANT** per project-standaard: scoped op `sub_account_id` via `is_sub_account_member(auth.uid(), sub_account_id)`; service_role ALL.

---

## 2. `CoachContext` contract (`src/lib/coach/types.ts`)

Universeel payload-shape dat elk touchpoint stuurt:

```
CoachScope = "blueprint.field" | "copy.component" | "funnel.node" | "global"

CoachTarget {
  id: string            // stable identifier (bv. "avatar_who")
  label: string         // "Dream Outcome"
  kind: "text" | "chips" | "tags" | "structured"
  currentValue: string | null
  helper?: string       // veld-hint uit clarityConfig
  placeholder?: string
}

CoachContext {
  scope: CoachScope
  target: CoachTarget | null       // null voor global coach
  intent: "help" | "improve" | "generate" | "freeform"
  businessContext: {
    subAccountId: string
    blueprintSnapshot: BlueprintRow | null
    activeOfferId?: string
  }
}
```

Helper: `buildBlueprintFieldContext(fieldKey, blueprint)` → `CoachContext`. Later `buildCopyComponentContext(...)`, etc. — engine hoeft niet te weten wát het is.

---

## 3. Edge function `coach-chat`

Aparte function, los van `execute-ai-action` (streaming multi-turn ≠ one-shot structured).

`supabase/functions/coach-chat/index.ts`:
- Verify JWT in-code (haal user uit access token)
- Body: `{ conversationId, context: CoachContext, messages: UIMessage[] }`
- Scope RLS: verifieer dat `conversationId` bij `auth.uid()` hoort
- Bouw system prompt uit **composable blocks** (hergebruik `ai_instruction_blocks`):
  - base: "You are Boostmate AI Coach…"
  - scope-block: `blueprint.field` specifieke coaching-instructies
  - target-block: veld-specifieke helper + huidige waarde
  - business-context-block: samengevatte blueprint als JSON
- Model: `google/gemini-3-flash-preview` via Lovable AI Gateway (AI SDK `streamText`)
- Tools (via AI SDK `tool()` met Zod):
  - `propose_field_value({ value, reasoning })` — rendert Proposed Answer card
  - `ask_clarifying_question({ question, suggestions[] })` — rendert quick-reply chips
  - `show_examples({ examples[] })` — rendert examples card
  - `reference_blueprint_field({ field, note })` — inline referentie
- `stopWhen: stepCountIs(50)`
- `toUIMessageStreamResponse({ originalMessages, onFinish })` → in `onFinish` persist alle nieuwe messages (user + assistant + parts) naar `ai_coach_messages`, update `ai_coach_conversations.updated_at` en `context_snapshot`
- CORS headers via `npm:@supabase/supabase-js@2/cors`

Nieuwe instruction blocks (via admin, seed in migratie):
- `coach.base` — rol, toon, principes
- `coach.blueprint.field` — hoe een blueprint-veld coachen (vragen stellen tot genoeg info, dan propose_field_value)

---

## 4. Client engine (`src/lib/coach/`)

- `types.ts` — CoachContext types
- `buildContext.ts` — scope-specifieke builders (start met blueprint)
- `useCoachConversation.ts` — hook die:
  - `ensureConversation(context)` → upsert row op `(user, scope, target_id)`, returnt `conversationId`
  - Laadt bestaande messages
  - Wraps `useChat` met `DefaultChatTransport` naar `${VITE_SUPABASE_URL}/functions/v1/coach-chat`
  - Chat `id` = `conversationId` (remount bij thread-switch)
  - Stuurt `{ conversationId, context }` als body extras op elke `sendMessage`

---

## 5. UI — `<CoachPanel />` refactor

`src/components/coach/CoachPanel.tsx` (nieuw, vervangt `business-blueprint/CoachPanel.tsx`):
- Side sheet (bestaande Sheet primitive), later herbruikbaar als drawer/fullscreen
- Header: scope-icoon + `target.label` + "Coach"
- Body: AI Elements chat surface
  - Installeer: `bun x ai-elements@latest add conversation message prompt-input shimmer tool`
  - `Conversation` + `ConversationContent` + `ConversationScrollButton`
  - `Message` + `MessageContent` + `MessageResponse` voor markdown
  - `Shimmer` "Denken..." tijdens `submitted`
  - `Tool` (collapsed default) voor tool-call inspectie
- **Custom part renderers** voor tool outputs:
  - `ProposedAnswerCard` — toont voorgestelde value + knoppen: `Replace field` · `Refine` · `Keep chatting`
  - `QuickReplies` — chips onder assistant message; klik = `sendMessage({ text: chip })`
  - `ExamplesCard` — genummerde voorbeelden
- Composer: `PromptInput` + `PromptInputTextarea` + `PromptInputFooter` met `PromptInputSubmit`
- Opener: als thread leeg is, injecteer eerste assistant-turn client-side (uit context) met contextuele intro + 3 quick-reply chips (`Stel me vragen`, `Geef voorbeelden`, `Ik heb al ideeën`)
- "Replace field" callback → parent `onApply(value)` → schrijft naar blueprint via bestaande `updateCustomerClarity` / `updateOfferDesign` / etc.

---

## 6. Blueprint integratie

`FieldCard.tsx` en `AngleField.tsx`:
- **Verwijder Improve-knop** en de bijbehorende `handleImprove` + `handleGenerate` stubs
- Één knop: `Coach` (bestaand icoon MessageSquare)
- `onCoach` opent nieuwe `<CoachPanel />` met `buildBlueprintFieldContext(field.key, blueprint)`
- `onApply` callback vervangt de field-waarde

`CustomerClaritySection.tsx` en de andere sections:
- Wire één `<CoachPanel />` op section-niveau (open/close state + huidig veld) ipv per-veld sheet
- Bij apply → juiste `update*`-functie op basis van scope

Verwijder ongebruikte imports (`Wand2`, `Sparkles`, `Loader2` uit FieldCard voor Improve-flow).

---

## 7. Migraties + seeds

1. Migration: `ai_coach_conversations`, `ai_coach_messages`, `ai_coach_memory` + RLS + GRANT
2. Insert (via insert tool): 2 nieuwe rows in `ai_instruction_blocks` (`coach.base`, `coach.blueprint.field`)

---

## 8. Toekomst-hooks (nu al meegenomen, niet gebouwd)

- `CoachScope` als union — nieuwe scopes = nieuwe builder + nieuwe instruction block, engine ongewijzigd
- `<CoachPanel />` accepteert `container="sheet" | "drawer" | "fullscreen"` prop (fase 1 alleen sheet geïmplementeerd)
- `ai_coach_memory` tabel staat klaar
- Edge function system-prompt-compositie is data-driven via `ai_instruction_blocks` → nieuwe scope = geen code-deploy nodig voor prompt-tuning

---

## Buiten scope (bewust, voor latere fases)

- Copy/Funnel/Ads/Email consumers
- Globale altijd-aanwezige Coach-bubbel
- Proactieve nudges / background jobs
- Actief schrijven naar `ai_coach_memory` (extractie van feiten uit gesprekken)
- Multi-thread lijst UI (fase 1 = 1 thread per veld, automatisch geladen bij opening)

---

## Bestandsoverzicht

Nieuw:
- `supabase/functions/coach-chat/index.ts`
- `src/lib/coach/types.ts`
- `src/lib/coach/buildContext.ts`
- `src/lib/coach/useCoachConversation.ts`
- `src/components/coach/CoachPanel.tsx`
- `src/components/coach/ProposedAnswerCard.tsx`
- `src/components/coach/QuickReplies.tsx`
- `src/components/ai-elements/*` (via AI Elements CLI)

Gewijzigd:
- `src/components/business-blueprint/FieldCard.tsx` (Improve weg)
- `src/components/business-blueprint/offer/AngleField.tsx` (Improve weg)
- `src/components/business-blueprint/CustomerClaritySection.tsx` (+ overige sections) — nieuwe CoachPanel wiring
- Migration + instruction-block seeds

Verwijderd/vervangen:
- `src/components/business-blueprint/CoachPanel.tsx` (oude wizard-versie)
