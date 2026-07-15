## Doel

Wanneer een gebruiker in de AI Coach een **brede** vraag stelt zoals *"help me create my main offer"* of *"vul mijn offer design in"*, moet de Coach niet ineens alle velden voorstellen. In plaats daarvan:

1. Kort uitleggen wat we gaan bouwen en in welke volgorde (mini-roadmap).
2. **Deel 1** aankondigen → korte best-practice uitleg → 1-2 gerichte vragen.
3. Wachten op input van de gebruiker → eventueel kort overleg.
4. Zodra de gebruiker akkoord is: **alleen voor dát deel** een `propose_blueprint_writes` doen (1-3 gerelateerde velden).
5. Na Apply/Dismiss automatisch doorgaan naar **Deel 2**, enzovoort tot alle offer velden zijn behandeld.

Dit is een gedrag-verandering, geen architectuur-verandering. De 4 knowledge blocks die je al hebt aangemaakt blijven de brein-laag; deze plan-wijziging bepaalt hoe de Coach die kennis uitserveert.

## Waarom het nu misgaat

In `supabase/functions/coach-chat/index.ts` staan in `COACH_GLOBAL` en `COACH_BLUEPRINT_SECTION` regels als:

> "you MUST call the propose_blueprint_writes tool with concrete drafts … in the SAME turn"
> "If the user names a whole section or sub-block, propose writes for EVERY field in it — never a partial subset."

Deze regels dwingen de Coach tot bulk-dump bij een brede vraag. Ze zijn nodig om **specifieke** verzoeken ("fill in the pain field") direct af te handelen, maar ze bijten met **brede** coaching-verzoeken.

## Wijzigingen

### 1. Nieuwe modus: "Guided walkthrough" onderscheiden van "Direct fill"

In het system prompt (zowel `coach:global` als `coach:blueprint-section` instruction blocks in de admin — met fallback in code) een expliciete tweedeling toevoegen:

- **Direct fill request** — gebruiker noemt concrete velden/sectie mét een schrijf-werkwoord ("vul in", "draft", "fill in", "generate", "schrijf"). → huidige gedrag: meteen `propose_blueprint_writes` in dezelfde turn.
- **Guided walkthrough request** — gebruiker vraagt om **hulp / begeleiding / samen bouwen** ("help me create", "help me build", "walk me through", "help me met opstellen", "begeleid me", "laten we samen…"). → NIET meteen writes voorstellen. In plaats daarvan:
  1. Turn 1: korte roadmap (bv. "We doen dit in 5 stappen: Angle → Framework → Deliverables → Pricing → Guarantee") + start Stap 1 met uitleg en 1-2 vragen.
  2. Turn N: pas `propose_blueprint_writes` aanroepen wanneer de gebruiker akkoord is met wat besproken is, en dan alleen voor de velden van díe stap.
  3. Na een Apply/Dismiss decision op stap N: turn N+1 opent stap N+1 met uitleg + vragen.

### 2. Offer-specifieke walkthrough-volgorde

In `coach:offer-strategy` (bestaand knowledge block) een expliciete sectie toevoegen: *"Guided walkthrough sequence"* met de logische volgorde waarin de Coach een Main Offer stap-voor-stap opbouwt:

```
Stap 1 — Core outcome & target client (wat, voor wie)
Stap 2 — Angle: new vehicle / better-faster-easier
Stap 3 — Framework / method naam + pillars
Stap 4 — Deliverables & bonuses
Stap 5 — Pricing model & anchor
Stap 6 — Guarantee / risk reversal
Stap 7 — Naam & short description (samengesteld uit stap 1-6)
```

Per stap: welke best practice-uitleg vooraf hoort (2-4 zinnen), welke vragen te stellen, welke Blueprint velden bij die stap horen.

### 3. Handled-decisions als voortgangs-signaal gebruiken

De function stuurt al `handledDecisions` (regel 315-321) mee. In de guided-walkthrough instructies expliciet maken: *"Gebruik de 'Already handled' lijst om te weten welke stap net is afgerond. Ga automatisch door naar de volgende stap uit de sequence."* Zo krijg je de auto-doorschakel-flow zonder een front-end wizard te bouwen.

### 4. Geen front-end wijzigingen

De bestaande `CoachPanel` + `useCoachChat` + de "Apply all" kaart handelen al alle rendering af. Elke turn levert óf tekst+vragen (Stap N uitleg) óf een kleine Blueprint-writes kaart (Stap N voorstel). Geen nieuwe UI, geen nieuwe knoppen.

## Waar de wijzigingen landen

Alles gebeurt in **admin instruction blocks** (via Admin Panel → Instruction Blocks), met code-fallback in `supabase/functions/coach-chat/index.ts`:

- `coach:global` — sectie "Guided walkthrough vs direct fill" toevoegen.
- `coach:blueprint-section` — idem.
- `coach:offer-strategy` — "Guided walkthrough sequence" (7 stappen) toevoegen.
- `supabase/functions/coach-chat/index.ts` — de `COACH_GLOBAL` en `COACH_BLUEPRINT_SECTION` fallback-strings in lijn brengen met de instruction blocks, zodat de fallback ook guided gedrag geeft mocht de DB-load falen.

## Verificatie

Na deployment testen met exact dezelfde prompt: *"help me create my main offer"*. Verwacht resultaat:

- Turn 1: Coach reageert met roadmap + start Stap 1 (core outcome & target client) met uitleg en 1-2 vragen. **Geen** Blueprint updates kaart.
- Na gebruikers-antwoord: Coach stelt writes voor voor de 1-2 velden van Stap 1.
- Na Apply: Coach opent Stap 2 (Angle) met uitleg en vragen. **Geen** writes.
- Enzovoort.

En tegen-test: *"vul mijn offer design volledig in"* moet nog steeds direct alle velden dumpen (direct fill blijft werken).

## Niet in scope

- Geen aparte "Guide me" knop op de Offer Design tabs (die overwoog je vorige turn al niet nodig te vinden).
- Geen sequentiële state die op de client wordt opgeslagen; de LLM leidt zichzelf via `handledDecisions` + de sequence in het knowledge block.
- Geen wijziging aan `blueprint.field` scope — daar werkt de per-veld coaching al zoals gewenst.
