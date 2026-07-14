## Root cause

De AI Coach scope-detectie in `supabase/functions/coach-chat/index.ts` kijkt naar de **hele** laatste user message om te bepalen welk Blueprint-veld/sub-block de gebruiker bedoelt. Dat gaat mis in twee situaties:

**1. Lange context-paste "steelt" de scope**
De user plakte eerst een grote offer-briefing en eindigde met *"help me fill in the blueprint. start with ideal client avatar tab. fill this in completely."*

- `requestedSingleBlueprintPath` scoort elk veld op substring-match. De pasted briefing bevat letterlijk de tekst **"Desired Outcome"**, wat de leaf-key is van `offer_stack.angle.core_promise.desired_outcome` → score 115 (index 1, key-match).
- `customer_clarity.avatar_who` matcht enkel via de alias `"ideal client"` → score 32.
- `desired_outcome` wint dus, en wordt als enige toegestane write-path aan het model doorgegeven. De "ideal client avatar tab"-instructie op het eind wordt genegeerd.
- Bovendien wordt `requestedBlueprintSubBlock` (die de tekst *"ideal client avatar"* → sub-block `avatar` wél correct herkent, score 39) alleen aangeroepen als single-field-detectie leeg is.

**2. Correctie-turn zonder werkwoord = geen reactie**
Vervolgens typt de user *"nee, de 'Ideal Client Avatar' tab in het Customer Clarity sectie van de blueprint."*

- `WRITE_INTENT_RE` matcht op werkwoorden (fill/draft/vullen/…). "nee, de … tab …" bevat er geen.
- `isBlueprintWriteIntent` → false → propose_blueprint_writes-tool wordt NIET geforceerd én zelfs niet aangeboden.
- Het model heeft niets te zeggen (geen tool, geen tekst), fallback wordt `"…"`. Vandaar de lege bubbel.

## Fix

Aanpassingen enkel in `supabase/functions/coach-chat/index.ts` (en eventueel een kleine helper). Geen UI-wijzigingen.

### A. Scope-detectie: gebruik alleen de "instructie-staart", niet de hele paste

Nieuwe helper `latestInstructionText(messages)`:
- Neem de laatste non-assistant message.
- Splits op regel-einden en zinnen.
- Behoud alleen de **laatste ~2 zinnen** OF, indien aanwezig, de laatste zin met een write-verb (fill/draft/vullen/…), plus zijn buur-zin.
- Dat resultaat wordt gebruikt door `requestedSingleBlueprintPath`, `requestedBlueprintSubBlock`, `latestUserAsksForEmptyOnly` en `isBlueprintWriteIntent`.
- Gevolg: pasted briefing beïnvloedt scope-detectie niet meer.

### B. Sub-block wint van single-field bij tab/section-taal

In `allowedBlueprintWritePaths`:
- Detecteer sub-block **eerst** en single-field daarna.
- Als de instructie-tekst het woord `tab`, `section`, `sectie`, `blok`, `sub-block` bevat OF de sub-block-alias langer is dan de single-field-alias die matchte → gebruik sub-block.
- Bij gelijkspel: sub-block wint.

### C. Correctie-turns behouden write-intent

In `isBlueprintWriteIntent`:
- Als de vorige assistant-turn een `blueprint_writes`-part had (of `WRITE_INTENT_RE` triggerde) EN de huidige user-turn een sub-block/veld-naam noemt of correctie-taal ("nee", "niet die", "wrong tab", "bedoelde", "andere sectie") gebruikt → nog steeds write-intent, en gebruik de nieuw genoemde scope.
- Voor dit check moeten we het laatste `assistant`-bericht kunnen inspecteren; via `messages` in de payload of via een extra lookup op `ai_coach_messages`. `messages` bevat het al (client stuurt volledige history), dus we scannen `messages` van achteren en kijken of het laatste assistant-part-type een write-voorstel bevatte. Als dat via de plain content niet zichtbaar is, doen we één query op `ai_coach_messages` voor deze conversatie (laatste assistant row).

### D. Kleine hardening

- In `sanitizeBlueprintWrites`: als `allowedPaths` niet leeg is en het model tóch andere paden voorstelt, log dat (console.warn) — dat maakt toekomstige regressies zichtbaar in de edge-logs.
- Fallback-tekst voor "geen writes" vervangen: als write-intent geforceerd was en na sanitize niks over is, vraag de user gericht welk sub-block bedoeld werd (i.p.v. de huidige generieke "couldn't create matching Blueprint updates" of `"…"`).

## Verificatie

Na deploy handmatig:
1. Open Growth Strategist bubble in workspace *Leyla Finnegan* (blueprint leeg).
2. Plak dezelfde offer-briefing + "start with ideal client avatar tab. fill this in completely." → verwacht 4 write-proposals voor `avatar_who / avatar_stage / avatar_traits / avatar_not_fit`.
3. Type "nee, de Pain & Friction tab" → verwacht 4 write-proposals voor de `pain_*` velden, geen lege bubbel.
4. Type een pure vraag ("wat is een goede prijs?") → verwacht géén write-proposal, gewoon tekst.

Files aangeraakt:
- `supabase/functions/coach-chat/index.ts`
