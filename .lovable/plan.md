
# Resterende AI-logica → Admin AI Module

## Bevindingen
Na de outreach-migratie is er nog **één** edge function met hardcoded AI-calls:

**`supabase/functions/analyze-audit/index.ts`** — gebruikt 2 directe `fetch` calls naar de Lovable AI gateway:
1. **Section analysis** — multimodaal: stuurt een screenshot (image_url) + markdown naar Gemini om visuele secties te detecteren.
2. **Funnel generation** — pure tekst-prompt: zet `funnelStrategy` om in een lijst `trafficSources` + `pages`.

Geen andere edge functions of client-code roept de AI gateway rechtstreeks aan. Alles wat al via `executeAIAction` loopt is goed.

## Voorgestelde aanpak

### Funnel generation (task 2) → direct migreerbaar
Pure tekst in/uit. Past 1-op-1 in het bestaande `execute-ai-action` model.
- **Instruction block**: `Audit – Funnel Generation Rules` (lijst van page types + traffic types, JSON-output regels).
- **AI Action**: slug `audit_funnel_from_strategy`
  - Inputs: `funnel_strategy`, `traffic_source`
  - Output structure: `traffic_sources` (array), `pages` (array)
  - Model: `google/gemini-2.5-flash`, temperature 0.3

### Section analysis (task 1) → vereist uitbreiding van `execute-ai-action`
Het multimodale screenshot-deel kan **niet** zonder aanpassing want `execute-ai-action`:
- Bouwt alleen `{ role: "user", content: <string prompt> }` (geen image_url support).
- Output structure ondersteunt alleen vlakke string/array velden — secties zijn `[{title, content}]` (array of objects).

**Twee opties**:

- **Optie A (aanbevolen)**: `execute-ai-action` uitbreiden met:
  - Optionele `image_inputs` parameter (array van data URLs of base64) die als `image_url` content parts wordt toegevoegd.
  - Output structure veld-type `object_array` met `item_schema` (key/type pairs) voor genest output zoals `sections[]`.
  
  Dan wordt section analysis óók een AI Action (`audit_section_analysis`).

- **Optie B**: Section analysis laten staan in `analyze-audit` (geen admin control), alleen funnel-generation migreren. Snel klaar maar dan blijft een stukje AI-config buiten Admin.

### Edge function herschrijven
`analyze-audit` wordt een orchestrator (zoals `generate-outreach-messages` nu): roept 1-2 AI Actions aan via `execute-ai-action`, doet de node/edge layout-berekening lokaal (dat is geen AI-logica).

### Seed migratie
Insert van instruction block + 1 of 2 AI Actions in `ai_actions` / `ai_instruction_blocks` / `ai_action_instruction_blocks`.

## Vraag aan jou
Welke optie wil je voor de screenshot/section-analyse?
- **A**: `execute-ai-action` uitbreiden met image + nested output support, en beide audit-stappen migreren (volledig admin-beheerbaar, iets meer werk).
- **B**: Alleen funnel-generation migreren, section analysis blijft hardcoded in `analyze-audit`.

Als je later nog AI features toevoegt (bv. brief generation, copy generation, etc.) maakt **A** sowieso meer mogelijk.
