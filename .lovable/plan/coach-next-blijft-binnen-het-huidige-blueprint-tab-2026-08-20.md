# Coach: "next" blijft binnen het huidige Blueprint-tab

## Wat er nu gebeurt

Bij een tab-walkthrough springt de Coach na "next" soms naar een volgend tab in plaats van naar het volgende lege veld van het huidige tab.

Twee oorzaken, beide geverifieerd in de code:

1. **De server weet vaak niet in welk tab je zit.** Veld-knoppen sturen als target-id een platte veldsleutel (bijv. `avatar_who` in `CustomerClaritySection.tsx`), geen dot-path. `targetRootPrefix()` in `supabase/functions/coach-chat/index.ts` herkent alleen dot-paths of een handvol labels, valt dan terug op `null`, waardoor het blok "Blueprint state — SINGLE SOURCE OF TRUTH" (met de veldenlijst en het "next field to work on") helemaal niet wordt meegestuurd. Zonder die grens kiest het model zelf een volgend onderwerp — vaak het volgende tab.
2. **Er is geen regel voor een kaal "next".** De prompt zegt wel "niet verder terwijl een eerder veld leeg is", maar nergens staat dat een tab pas verlaten mag worden als alle velden gevuld zijn of de gebruiker daar expliciet om vraagt. Ook de schrijf-scope (`preferredBlueprintWritePaths`) wordt bij een kaal "next" niet beperkt tot het huidige tab.

## Wat we bouwen

### 1. Actief tab meesturen (frontend)
- `CoachTarget` (`src/lib/coach/types.ts`) krijgt een optioneel veld `subBlockId` (het registry-sub-block, bijv. `customer_clarity.avatar`, `offer_stack.angle`).
- `buildBlueprintFieldContext` en `buildBlueprintSectionContext` (`src/lib/coach/buildContext.ts`) nemen dit mee.
- Entry points geven het actieve tab door: `CustomerClaritySection`, `BrandIdentitySection`, de Offer-tabs via `useOfferCoach`, `SectionHelpCoach` en de list-coach. Zo weet de server bij elke turn — veld- én sectie-scope — welk tab actief is.

### 2. Tabgrens afdwingen (edge function `coach-chat`)
- Sub-block-resolutie: eerst `target.subBlockId`, dan de bestaande path/label-heuristiek. Hierdoor krijgt ook een veld-scoped turn altijd de volledige veldenlijst van zijn tab mee.
- Het state-truth blok toont de velden in registry-volgorde met DONE/EMPTY en noemt expliciet het eerstvolgende lege veld ná het veld waar we nu aan werken.
- Nieuwe harde regel in de prompt: bij een kaal doorgaan-signaal ("next", "ok", "verder", "volgende", "done") ga je naar het volgende nog lege veld van het HUIDIGE tab. Je verlaat het tab alleen als (a) alle velden van dat tab gevuld zijn — dan meld je dat het tab compleet is en stel je het volgende tab voor — of (b) de gebruiker expliciet een ander tab/sectie noemt.
- Schrijf-scope: bij een doorgaan-turn zonder genoemd tab/veld beperken we de toegestane write-paths tot de lege velden van het actieve tab.

### 3. Quick-reply expansie
`expandQuickReplyForContext` in `src/components/coach/CoachPanel.tsx` maakt van "next step / volgende veld" nu een generieke instructie. Die wordt aangescherpt tot "het volgende lege veld binnen het huidige tab".

## Technische details
- Bestanden: `src/lib/coach/types.ts`, `src/lib/coach/buildContext.ts`, `src/components/business-blueprint/CustomerClaritySection.tsx`, `BrandIdentitySection.tsx`, `SectionHelpCoach.tsx`, `offer/useOfferCoach.tsx` (+ tabs die de spec aanleveren), `src/components/coach/CoachPanel.tsx`, `supabase/functions/coach-chat/index.ts`.
- Veldvolgorde komt uit `BLUEPRINT_SUB_BLOCKS` / `BLUEPRINT_SUB_BLOCK_PATHS` (registry) — geen tweede bron van waarheid.
- Geen databasewijzigingen; edge function wordt opnieuw gedeployed.

## Verificatie
- Tab met meerdere lege velden: veld invullen → "next" → Coach pakt het volgende lege veld van hetzelfde tab.
- Laatste lege veld invullen → "next" → Coach meldt tab compleet en stelt het volgende tab voor.
- "ga naar het Offer Stack tab" → Coach wisselt wel meteen van tab.
