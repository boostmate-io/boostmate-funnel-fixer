## Kernprobleem

De AI Coach voelt "dommer" dan een gewone LLM omdat er een **deterministische routinglaag** vóór het model zit die met regex beslist:
- Is dit een schrijf-intent? (werkwoord-regex)
- Welke tab/veld bedoelt de user? (alias-matching op substrings)
- Welke tool mag het model gebruiken? (geforceerd op basis van bovenstaande)

Zodra jouw bericht niet exact in dat patroon past, krijg je fallback-tekst of het verkeerde antwoord. Dat gebeurt bij:
- Taalcorrecties ("in het engels", "in English")
- Toon-/lengtecorrecties ("korter", "minder hype", "meer concreet")
- Referenties naar vorige turn ("doe dit opnieuw", "hetzelfde maar voor de andere tab", "dat 2de item bevalt me niet")
- Tab-correcties zonder werkwoord ("nee die andere tab")
- Vragen ná een voorstel ("waarom stelde je dat voor?")
- Mengsels ("maak het korter én in Engels")

## Oplossing: van regex-router naar LLM-first coach

De regex-laag verdwijnt niet — hij blijft als **hint**, niet als **gate**. Het model krijgt meer autonomie, betere context over wat het net zelf voorstelde, en duidelijker gedragsregels in de system prompt.

### 1. Volledige gespreksgeschiedenis is zichtbaar voor het model

Nu: assistant `parts` (Blueprint proposals, field proposals, quick replies) worden niet omgezet naar model-messages, dus tool-only turns komen als leeg bericht bij het model aan.

Fix: elk assistant-bericht wordt gerenderd naar een leesbare tekstvorm voor de LLM:
- Blueprint writes → "Ik heb net voorgesteld: `<path>` = "…", `<path>` = "…""
- Field proposal → "Ik heb net voorgesteld: "…""
- Quick replies → "Ik heb deze suggesties gegeven: …"

Daardoor begrijpt het model vervolgberichten als "in het engels", "korter", "wijzig dat 2de", "hetzelfde maar…" gewoon zoals ChatGPT dat zou doen.

### 2. Tools zijn altijd beschikbaar, nooit meer geforceerd

Nu: `tool_choice` wordt hard geforceerd op `propose_blueprint_writes` of `propose_field_value` op basis van regex. Als de regex faalt → geen tool aangeboden → lege bubbel.

Fix:
- `tool_choice: "auto"` als default.
- Tools worden altijd meegegeven binnen de huidige scope.
- De system prompt vertelt het model duidelijk wanneer welke tool te gebruiken (in plaats van dat de backend beslist).
- De regex-detectie blijft, maar alleen als **hint** in de system prompt: "De vorige beurt bevatte waarschijnlijk een schrijf-intent voor <sub-block>". Geen forceren meer.

### 3. Scope-detectie wordt suggestief, niet dwingend

Nu: `allowedBlueprintWritePaths` bouwt een harde whitelist. Alles buiten die whitelist wordt gedropt in `sanitizeBlueprintWrites`.

Fix:
- De whitelist wordt vervangen door een **voorkeurslijst** in de system prompt: "Waarschijnlijk bedoelt de user paden binnen X. Als je zeker weet dat de user iets anders bedoelt, mag je afwijken."
- `sanitizeBlueprintWrites` behoudt alleen de **harde regels**: onbekende paden droppen, non-writable velden droppen, tab-prefix guard (`tabPrefix` blijft hard om cross-tab leaks te voorkomen). Sub-block scoping wordt zacht.
- Reeds afgehandelde paden blijven wél hard uitgesloten (dat is een echte constraint).

### 4. Taalinstructie: user wint van UI-taal

- Nieuwe detector `explicitLanguageInstruction(messages)` scant alleen de laatste user message op expliciete taal-opdrachten ("in het engels", "in English", "Nederlands graag", "NEE IN HET ENGELS", "translate to English", "not Dutch").
- Effectieve outputtaal = expliciete instructie ∥ UI-locale.
- `useCoachChat` stuurt bij elke send de actuele `i18n.language` mee, zodat een openstaand coachvenster niet vastzit op de oude taal na wijzigen in settings.

### 5. Correctie- en follow-up herkenning verruimen

`isBlueprintWriteIntent` en `isFieldProposalIntent` worden minder afhankelijk van regex-werkwoorden:
- Als de vorige assistant een `blueprint_writes` of `proposal` part had EN de user reageert met een korte modifier ("in het engels", "korter", "minder hype", "meer concreet", "opnieuw", "andere tab", "nee die"), telt dat als voortzetting.
- Bij zo'n follow-up worden de paden van de vorige proposal hergebruikt tenzij de user expliciet nieuwe noemt.
- Werkt ook voor `propose_field_value` (single-field coach): "in Engels" na Nederlandse draft → nieuwe Engelse draft, geen fallback-tekst.

### 6. System prompt maakt het model verantwoordelijk

De coach-prompts worden herschreven zodat het model zelf beslist wanneer wat te doen, met deze principes expliciet:
- "Als de user je vorige voorstel wil bijstellen (taal, toon, lengte, focus), regenereer het via dezelfde tool met dezelfde paden."
- "Als de user een correctie geeft zonder werkwoord ('nee die andere tab'), interpreteer het als continuering van je vorige actie."
- "Als de user vraagt waarom je iets voorstelde, antwoord in tekst — roep geen tool aan."
- "Als de user een expliciete taalinstructie geeft, respecteer die boven de UI-taal."

### 7. Fallback-tekst wordt behulpzamer

De generieke "Kan je iets specifieker zijn?" verdwijnt. Als het model niks teruggeeft ná deze wijzigingen (zeldzaam), wordt de fallback contextueel: verwijzen naar de laatst-voorgestelde paden of de actieve tab, in de correcte taal.

## Wat blijft hard (bewuste constraints)

- Cross-tab guard: wanneer een specifieke Blueprint-tab in focus is, blijven writes buiten die tab geblokkeerd (voorkomt UI-verwarring).
- Reeds afgehandelde paden worden niet opnieuw voorgesteld tenzij de user het expliciet vraagt.
- Non-writable schemavelden blijven geblokkeerd.
- List-section mode (Framework Pillars etc.) blijft haar strikte `new_<n>.<fieldKey>` shape.

## Bestanden

- `supabase/functions/coach-chat/index.ts` — grootste wijziging (prompts, tool-choice, geschiedenis-serializatie, taaldetector, versoepelde scope-guard, follow-up detectie)
- `src/lib/coach/useCoachChat.ts` — actuele locale meesturen bij elke send

## Verificatie

Handmatig testen na deploy:
1. Nederlandse Blueprint-proposals → user: "in het engels" → nieuwe Engelse proposals op dezelfde paden.
2. Blueprint-proposals → user: "korter" → herwerkte kortere versies, zelfde paden.
3. Blueprint-proposals → user: "nee, de Pain & Friction tab" → nieuwe proposals voor pain-velden.
4. Field coach in Nederlands → user: "in English" → Engelse herformulering.
5. Blueprint-proposals → user: "waarom stelde je dit voor?" → tekstantwoord, geen nieuwe tool call.
6. UI wisselt naar Engels midden in coachgesprek → volgende opdracht komt in het Engels.
7. Pure vraag ("wat is een goede prijs?") → geen ongewenste Blueprint-writes.