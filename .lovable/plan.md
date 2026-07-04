## Situatie

De vorige fix loste twee dingen tegelijk op, maar ongelijkmatig:

1. **Generiek (goed)** — `targetRootPrefix` + `filterPathsToCurrentTarget` in `coach-chat/index.ts` herkennen álle blueprint‑tabs: `customer_clarity`, `offer_stack.angle`, `offer_stack.stack`, `offer_stack.pricing`, `growth_system`, `proof_authority`. Zodra deze filter draait wordt élk voorstel dat buiten het actieve tab valt eruit gegooid.

2. **Niet‑generiek (het gat)** — die filter wordt vandaag alleen ingeschakeld wanneer de gebruiker één specifiek veld of één benoemde sub‑block noemt ("vul avatar in"). Bij een tab‑brede vraag ("vul de volledige offer stack tab in", "vul de pricing tab in", …) geeft `allowedBlueprintWritePaths` `null` terug en valt de tab‑prefix filter weg. De AI mag dan technisch nog steeds naar andere tabs schrijven — de reden waarom Offer Stack in jouw test toch Angle/Clarity velden voorstelde was: OFFER_STACK_FIELDS bestond niet in het schema, dus de AI viel terug op wat wél in het schema stond (Angle/Clarity).

3. **Schema‑dekking** — alleen `customer_clarity`, `offer_stack.angle` en `offer_stack.stack` staan in `blueprintSchema.ts`. `offer_stack.pricing`, `offer_stack.ecosystem`, `growth_system` en `proof_authority` hebben nog geen velden gedefinieerd, dus daar kan de coach sowieso niets voor voorstellen.

Kort antwoord op je vraag: **de logica is generiek, maar de afdwinging + de schema‑dekking niet**. Daarom werkt het nu voor Offer Stack maar niet gegarandeerd voor de andere tabs.

## Plan — één keer generiek maken

### 1. Tab‑prefix filter altijd afdwingen (`supabase/functions/coach-chat/index.ts`)

In `sanitizeBlueprintWrites`: ook wanneer `allowedPaths` `null` is (tab‑brede vraag), de tab‑prefix van de actieve context toepassen. Concreet:

- Bereken `tabPrefix = targetRootPrefix(context)` bovenaan.
- Naast de bestaande `allowedPaths`‑check: gooi ieder voorstel weg waarvan `path` niet met `tabPrefix.` begint, tenzij scope `global` is.
- Doe hetzelfde in `allowedBlueprintWritePaths` voor consistentie.

Effect: "vul de volledige X tab in" produceert nooit meer schrijfvoorstellen voor een ander tab, ongeacht welk tab X is.

### 2. Schema uitbreiden voor de resterende tabs (`supabase/functions/_shared/blueprintSchema.ts`)

Voeg field‑definities toe voor:

- `offer_stack.pricing` — hoofdprijs, pricing plans (indexed items: name, description, price, terms), payment terms, guarantee/refund.
- `offer_stack.ecosystem` — ecosystem offers (indexed items: name, tier, purpose, price, description).
- `growth_system` — de bestaande UI‑velden 1‑op‑1 spiegelen als schema entries.
- `proof_authority` — idem: proof items, credentials, testimonials, authority markers.

Voor elke tab: `field(...)` of `indexedFields(...)` volgens hetzelfde patroon als OFFER_STACK_FIELDS, met correcte `helper`, `aliases` en `aiWritable`. Deze lijsten worden dan automatisch opgenomen in `renderBlueprintFieldPathsPrompt()` waardoor de AI ze mag invullen.

### 3. Apply‑pad valideren (`src/lib/coach/applyBlueprintWrites.ts`)

- Bevestigen dat `normalizeOfferStackLists`‑patroon ook wordt toegepast voor pricing plans en ecosystem offers (unieke id's, defaults). Kleine uitbreiding indien nodig — zelfde helper, andere paden.
- Timeframe/timeline‑normalisatie hergebruiken voor pricing terms indien relevant.

### 4. Deploy + test

- `coach-chat` edge function herdeployen.
- Manuele check per tab op Anna Burkhardt: "vul de volledige {tab} tab in" voor Customer Clarity, Offer Angle, Offer Stack, Pricing, Ecosystem, Growth System, Proof & Authority — verifiëren dat elk voorstel binnen dat tab valt en dat lege velden worden ingevuld.

## Wat er NIET verandert

- Per‑veld coach‑gedrag (Refine / Replace / Keep) blijft ongewijzigd.
- List‑section flow (section‑level coach button naast Add) blijft zoals afgesproken.
- UI in Blueprint tabs blijft ongewijzigd — dit is uitsluitend backend + schema.
