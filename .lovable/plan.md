## Waarom dit misgaat

Je hebt gelijk: **“give me the blueprint updates as discussed in step 1”** is duidelijk genoeg. De Coach had moeten begrijpen: “pak de besproken Step 1-context en toon nu de Blueprint updates-card.”

De waarschijnlijke oorzaak zit niet in jouw formulering, maar in de implementatie:

- De Coach vertrouwt nu te veel op het model om zelf te beslissen wanneer hij `propose_blueprint_writes` moet aanroepen.
- Als het model geen geldige tool-call teruggeeft, toont de backend een generieke fallback: **“Could you be a bit more specific?”**
- De bestaande intent-detectie voor Blueprint writes bestaat wel in de backend, maar wordt niet hard gebruikt om deze tool-call af te dwingen.
- Na refresh kan de Coach bovendien in een conversatie terechtkomen waar de eerdere Step 1-context niet goed genoeg wordt gebruikt of niet correct wordt herkend als “pending blueprint updates”.

## Plan

### 1. Generieke fallback vervangen voor Blueprint-update verzoeken
Als de gebruiker iets zegt als:
- “give me the blueprint updates as discussed in step 1”
- “we discussed step 1 but you haven’t given the blueprint updates”
- “shouldn’t you propose blueprint updates?”
- “give me the proposed blueprint updates for this step”

mag de backend nooit meer terugvallen op **“Could you be more specific?”**.

In plaats daarvan moet hij ofwel:
- direct een **Blueprint updates** card voorstellen, of
- heel specifiek zeggen welk Step 1-onderdeel nog ontbreekt.

### 2. Step 1-update intent deterministisch detecteren
Ik voeg server-side herkenning toe voor Main Offer guided walkthroughs, specifiek voor Step 1:

**Step 1 = Core Outcome & Target Client / Core Promise / Angle basis.**

Bij herkenning van “step 1” + “blueprint updates” wordt dit niet meer als normale chat behandeld, maar als verplichte Blueprint-write actie.

### 3. Tool-call hard forceren
Wanneer Step 1 Blueprint updates gevraagd worden:

- `tool_choice` wordt geforceerd naar `propose_blueprint_writes`.
- De prompt krijgt een tijdelijke harde instructie: geen extra uitleg, geen nieuwe vraag, maar Blueprint writes voorstellen voor Step 1.
- De toegestane paths worden beperkt tot relevante Step 1-velden, zoals:
  - `offer_stack.angle.core_outcome`
  - `offer_stack.angle.core_promise.desired_outcome`
  - `offer_stack.angle.main_offer_name`
  - `offer_stack.angle.short_description`

### 4. Als de tool-call leeg of ongeldig is: repair retry
Als het model wel een tool-call probeert maar de writes worden weggefilterd, voert de backend één herstelpoging uit met expliciete toegestane paths.

Daarna mag er nog steeds geen vage fallback komen. De reactie moet concreet blijven binnen Step 1.

### 5. Refresh/context robuuster maken
Ik controleer en verbeter de conversatie-load na refresh:

- bestaande global Coach-conversaties moeten correct teruggevonden worden;
- berichten uit de bestaande conversatie moeten altijd meegestuurd worden;
- oudere global conversations met lege/afwijkende `target_id` moeten niet leiden tot contextverlies;
- verzenden moet wachten tot de bestaande berichten geladen zijn.

### 6. Verificatie
Ik test dit scenario:

1. Main Offer-flow starten.
2. Step 1 bespreken.
3. Vragen: **“give me the blueprint updates as discussed in step 1”**.
4. Verwacht: **Blueprint updates** card.
5. Refresh.
6. Opnieuw vragen naar Step 1 Blueprint updates.
7. Verwacht: nog steeds contextueel antwoord of Blueprint updates, geen “Could you be more specific?”.