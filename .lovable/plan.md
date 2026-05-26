
# Outreach AI → Admin AI Actions

## Doel
De hardcoded prompt + model call in `supabase/functions/generate-outreach-messages/index.ts` vervangen door een AI Action die je via de Admin UI (AI Actions + Instruction Blocks) kan beheren — zonder de outreach-specifieke business logic (DB lookups, message inserts, status updates) kwijt te raken.

## Architectuur

```text
generate-outreach-messages (edge fn)
  ├─ haalt lead + setup_types + outreach_settings op   ← blijft hier
  ├─ bouwt inputs (lead velden, setupTypes lijst, settings)
  ├─ roept executeAIAction({ slug: "outreach_messages", inputs, extraInstructions })
  │     └─ execute-ai-action laadt prompt + instruction blocks uit DB
  │        en stuurt naar Lovable AI Gateway met tool-calling
  ├─ ontvangt gestructureerde output (opener, fu1..fu4, setup_type, ...)
  └─ update lead + insert messages                      ← blijft hier
```

Splitst dus AI-config (admin-beheerbaar) van app-logica (code).

## Stappen

### 1. Uitbreiding execute-ai-action voor nested output
Huidige `execute-ai-action` ondersteunt alleen `text` en `array` van strings. Outreach output bevat meerdere losse string-velden (`opener`, `opener_alt`, `followup_1..4`, `setup_type`, `main_problem`, `main_angle`) — dat past wel binnen het huidige model: elk veld = aparte `text` entry in `output_structure`. Geen schemawijziging nodig.

### 2. Instruction Blocks aanmaken (via Admin UI)
- **Outreach – Tone & Rules**: tone, max lines, "no emojis", "no exclamation marks".
- **Outreach – Opener Structure**: de 4-regel structuur (Line 1..4).
- **Outreach – Followup Defaults**: de 4 default follow-ups.

### 3. AI Action aanmaken (via Admin UI)
- Naam: `Outreach Messages`, slug: `outreach_messages`
- Model: `google/gemini-2.5-flash` (zelfde als nu)
- Prompt template met `{{variables}}`:
  - `{{lead_name}}`, `{{company}}`, `{{niche}}`, `{{offer}}`, `{{platform}}`, `{{profile_url}}`, `{{notes}}`, `{{channel}}`
  - `{{setup_types_list}}` (gerenderde lijst)
  - `{{setup_default_action}}`, `{{setup_default_problem}}`, `{{setup_default_angle}}`
  - `{{current_setup_type}}`, `{{current_main_problem}}`, `{{current_main_angle}}`
  - `{{custom_opener_template}}`, `{{custom_followups}}` (uit `outreach_settings`)
- Output structure (8 velden, type `text`):
  - `setup_type`, `main_problem`, `main_angle`, `opener`, `opener_alt`, `followup_1`, `followup_2`, `followup_3`, `followup_4`
- Link de 3 instruction blocks.

### 4. `generate-outreach-messages` herschrijven
- Houdt: auth check, lead/setup_types/settings ophalen, lead update, messages insert.
- Verwijdert: hele system/user prompt opbouw, directe `fetch` naar AI gateway, JSON parsing.
- Voegt toe: HTTP call naar `execute-ai-action` met `slug: "outreach_messages"`, `inputs: {...}`, en optioneel `extra_instructions` (bv. `outreach_settings.ai_prompt_context`).
- Bouwt `setup_types_list` als pre-gerenderde string voordat de inputs worden doorgegeven (template engine doet alleen simpele `{{key}}` vervanging).

### 5. Seed migratie (optioneel maar aanbevolen)
Eén `INSERT` migratie die de instruction blocks + AI action + links direct aanmaakt, zodat dit reproduceerbaar is en niet alleen via klikwerk in Admin UI bestaat.

### 6. Test
- Open een lead, klik "Generate messages" → controleer of messages correct in DB komen.
- Pas de prompt template in Admin AI Actions aan → herhaal → output verandert zonder code-deploy.

## Aandachtspunten
- `execute-ai-action` returnt `{ output, action_slug }` — wrap in try/catch en handle 402/429 errors zoals nu.
- `extra_instructions` is een goede plek voor `outreach_settings.ai_prompt_context` (per-workspace AI context) zodat dat dynamisch blijft.
- Template engine ondersteunt geen loops; daarom pre-render `setup_types_list` in de edge function.

## Vervolgvraag
Wil je dat ik dit zo ga bouwen (inclusief seed-migratie voor de instruction blocks + action), of wil je de instruction blocks/action liever zelf eerst handmatig aanmaken in de Admin UI en daarna alleen de edge function laten herschrijven?
