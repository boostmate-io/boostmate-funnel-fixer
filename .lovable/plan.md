## Probleem

De `generate_big_promise_hero` prompt gebruikt de placeholders `{{context}}`, `{{component_instructions}}` en `{{inputs}}`, maar `execute-ai-action` vervangt alleen `{{key}}` tokens die als losse key in het `inputs`-object staan. Gevolg:

- `{{inputs}}` blijft letterlijk in de prompt staan (er is geen key genaamd `inputs`), dus de strategische keuzes uit de Hero Section UI (announcement_pattern, headline_pattern, cta_goal, ...) worden nooit doorgegeven aan het model.
- `{{component_instructions}}` blijft ook letterlijk staan; die inhoud wordt wel toegevoegd aan de system prompt als "ADDITIONAL INSTRUCTIONS", maar de placeholder in de user prompt wordt niet ingevuld.
- `{{context}}` werkt toevallig wel omdat `BigPromiseHeroUI` `context` als key meegeeft in `inputs`.

Daardoor genereert de AI puur op basis van de generieke prompt en negeert alle UI-selecties.

## Oplossing

Uitbreiding van de placeholder-substitutie in `supabase/functions/execute-ai-action/index.ts`:

1. Vóór de bestaande `\{\{(\w+)\}\}` replace:
   - Vervang `{{inputs}}` door een leesbare, gestructureerde dump van alle inputs behalve `context` (bv. `- announcement_pattern: scarcity` per regel; `ai_recommended` → "AI Recommended (let AI decide)"; lege/undefined velden weglaten).
   - Vervang `{{component_instructions}}` door de meegegeven `extra_instructions` (leeg string als niet aanwezig).
   - Vervang `{{context}}` door `inputs.context` als aanwezig, anders lege string.
2. Bestaande generieke `{{key}}` replace blijft daarna staan voor overige velden.
3. Geen wijziging aan de client- of UI-code nodig; alle bestaande AI Actions blijven werken.

## Verificatie

- `generate_big_promise_hero` opnieuw uitvoeren vanuit de Hero Section UI met verschillende pattern-keuzes en checken dat de AI zichtbaar rekening houdt met de selectie (bv. specifieke headline pattern of CTA goal).
- Bestaande AI Actions zonder `{{inputs}}` / `{{component_instructions}}` placeholder mogen ongewijzigd blijven werken.

## Technisch

Bestand: `supabase/functions/execute-ai-action/index.ts`, blok rond regel 78–85 (prompt building) uitbreiden met de drie specifieke replaces vóór de generieke regex.
