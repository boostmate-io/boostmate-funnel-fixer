# Coach prompts beheerbaar maken via Admin > AI

## Doel
De 4 hardcoded Coach system-prompts in `supabase/functions/coach-chat/index.ts` (`COACH_BASE`, `COACH_BLUEPRINT_FIELD`, `COACH_BLUEPRINT_SECTION`, `COACH_GLOBAL`) verhuizen naar de bestaande AI Actions / Instruction Blocks tabellen, zodat ze zichtbaar en bewerkbaar zijn in **Admin > AI**. De Coach zelf blijft streamen via `coach-chat` (tool-calling + streaming), maar leest zijn prompts on-demand uit de database.

## Aanpak

### 1. Seed data in de database (via `insert` tool, geen migratie — schema bestaat al)
- Maak 4 rijen in `ai_instruction_blocks`:
  - `coach-base` — inhoud = huidige `COACH_BASE`
  - `coach-blueprint-field` — inhoud = `COACH_BLUEPRINT_FIELD`
  - `coach-blueprint-section` — inhoud = `COACH_BLUEPRINT_SECTION`
  - `coach-global` — inhoud = `COACH_GLOBAL`
- Maak 1 rij in `ai_actions`:
  - `slug: coach-chat`, `name: "AI Coach"`, `type: coach` (of `chat`), `is_active: true`
  - `prompt_template` leeg / uitleg-only (de blocks vormen de system-prompt)
  - `model_settings`: `{ model: "google/gemini-3-flash-preview", supports_streaming: true, supports_tools: true }`
- Koppel de 4 blocks aan de action via `ai_action_instruction_blocks` met `sort_order` 1..4. `coach-base` altijd eerst; de 3 scope-varianten daarna (de edge function kiest er 1).

### 2. `coach-chat` edge function aanpassen
- Blijft een aparte streaming-endpoint (past niet op `execute-ai-action`, dat is request/response).
- Bij elke call:
  1. Fetch action `coach-chat` + linked instruction blocks (zelfde patroon als `execute-ai-action`).
  2. Map blocks by slug: `base`, `field`, `section`, `global`.
  3. Bouw system-prompt = `base` + (scope-specifieke block op basis van `context.scope`) + de bestaande locale/`# Language` directive + de dynamische businessContext-injectie.
- Fallback: als de action/blocks niet gevonden worden (bv. seed nog niet gedraaid), gebruik de huidige hardcoded strings zodat de Coach nooit stukgaat.
- Kleine in-memory cache (bv. 60s TTL per edge-instance) zodat we niet elke user-message 5 queries doen.

### 3. Verwijder hardcoded constants
- `COACH_BASE`/`FIELD`/`SECTION`/`GLOBAL` blijven staan als **fallback-defaults** (constants), niet meer als primaire bron. Dit voorkomt regressie bij lege DB.

### 4. Admin UI
- Geen wijzigingen nodig: `AdminAIActions.tsx` en `AdminInstructionBlocks.tsx` tonen automatisch de nieuwe rijen. Admin kan tekst live editen; volgende Coach-message pakt de nieuwe versie (na cache-TTL of function cold start).

## Wat NIET verandert
- Streaming flow, tool-calling (`propose_blueprint_writes`), `apply-blueprint-writes`, `useCoachChat`, `CoachPanel`, `GlobalCoachBubble`, memory-injectie, locale-detectie — allemaal ongewijzigd.
- Geen schema-migratie: bestaande tabellen (`ai_actions`, `ai_instruction_blocks`, `ai_action_instruction_blocks`) worden hergebruikt.

## Bestanden
- `supabase/functions/coach-chat/index.ts` — prompts uit DB laden met fallback + cache.
- Seed via `supabase--insert` tool (5 INSERTs: 4 blocks + 1 action, en 4 junction rows).

## Verificatie
1. Na seed: open Admin > AI → "AI Actions" tab → "AI Coach" is zichtbaar; "Instruction Blocks" tab → 4 coach-blocks zichtbaar.
2. Edit `coach-base` block, verstuur nieuwe Coach-message, controleer dat de verandering in het gedrag zichtbaar wordt (via edge function logs / gedrag).
3. Bestaande Coach-flows (blueprint field write, section write, global chat) blijven werken.
