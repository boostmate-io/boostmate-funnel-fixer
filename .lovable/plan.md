# Extra kennis toevoegen aan de AI Coach

## Doel
Jij (als admin) wilt losse kennisdocumenten (bv. "High Ticket Offer creatie") kunnen toevoegen die de AI Coach altijd meekrijgt als context — zonder elke keer de code te wijzigen.

## Hoe het nu werkt
De coach laadt uit `ai_instruction_blocks` maar **alleen 4 vaste blokken op naam**: `coach:base`, `coach:blueprint-field`, `coach:blueprint-section`, `coach:global`. Extra blokken die je in Admin koppelt aan de `coach-chat` AI Action worden **genegeerd**.

## Oplossing (2 kleine wijzigingen)

### 1. `supabase/functions/coach-chat/index.ts` — `loadCoachPrompts` uitbreiden
- Alle instructieblokken die aan de `coach-chat` AI Action zijn gekoppeld worden opgehaald.
- De 4 vaste namen blijven werken zoals nu.
- **Elk extra blok** (elke naam die niet één van de 4 vaste namen is) wordt verzameld als `knowledgeBlocks: { name, content }[]`.
- `PromptSet` krijgt een extra veld `knowledgeBlocks`.

### 2. `buildSystemPrompt` — kennis injecteren
Na de scope-specifieke prompt en vóór de Blueprint JSON wordt een nieuwe sectie toegevoegd:

```text
# Knowledge base (reference material)
Use the material below as expert reference when the user's question relates to its topic. Do not quote verbatim; apply it as strategic guidance.

## <block name>
<block content>

## <block name>
<block content>
```

Als er geen extra blokken zijn, wordt de sectie weggelaten.

## Hoe jij daarna kennis toevoegt (geen code meer nodig)

1. Ga naar **Admin Panel → Instruction Blocks**.
2. Klik **New block**, geef bv. naam `coach:knowledge:high-ticket-offer` en plak jouw materiaal in `content` (Markdown mag).
3. Ga naar **Admin Panel → AI Actions**, open de actie met slug `coach-chat`.
4. Link het nieuwe instructieblok aan deze actie.
5. Klaar — binnen 60s (prompt-cache TTL) gebruikt de coach het blok voor elk gesprek.

Voor elk nieuw thema (webinar funnels, VSL scripting, …) herhaal je stap 1–4 met een nieuwe naam.

## Waarom deze aanpak
- **Geen code-wijzigingen meer** om kennis toe te voegen/aan te passen.
- Werkt met bestaande Admin UI (`AdminInstructionBlocks`, `AdminAIActions`).
- Blijft compatibel met bestaande 4 vaste blokken.
- Klein token-budget: alleen jouw eigen, bewust gekoppelde blokken worden meegestuurd.

## Alternatief (niet in dit plan)
Aparte "Knowledge Center" documenten (PDF/DOCX uit `knowledge_documents`) aan de coach koppelen. Krachtiger maar zwaarder (parsen, tokens, mogelijk vector search). Laat me weten of je dit later ook wilt.

## Bestanden
- `supabase/functions/coach-chat/index.ts` (loader + prompt-builder)

Geen DB-migratie nodig — de tabellen (`ai_instruction_blocks`, `ai_action_instruction_blocks`, `ai_actions`) bestaan al.
