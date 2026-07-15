## Plan: AI Coach walkthrough betrouwbaar maken

Ik ga dit niet opnieuw als een losse Step 1-fix aanpakken. Het probleem is structureel: de Coach heeft geen echte server-side walkthrough-state en vertrouwt te veel op het model om zelf te onthouden wanneer een stap eerst Blueprint updates moet opleveren.

### 1. Main Offer walkthrough-stappen expliciet modelleren
Ik voeg server-side definities toe voor de Main Offer guided walkthrough:

- Step 1: Core Outcome & Core Promise
  - `offer_stack.angle.core_outcome`
  - `offer_stack.angle.core_promise.desired_outcome`
  - `offer_stack.angle.main_offer_name`
  - `offer_stack.angle.short_description`
- Step 2: The Angle
  - `offer_stack.angle.angle_new_vehicle`
  - `offer_stack.angle.angle_better_results`
  - `offer_stack.angle.angle_faster_outcome`
  - `offer_stack.angle.angle_easier_process`
- Step 3: Signature Framework
  - `offer_stack.angle.framework.name`
  - `offer_stack.angle.framework.description`
  - `offer_stack.angle.framework.pillars.0.name`
  - `offer_stack.angle.framework.pillars.0.description`
  - `offer_stack.angle.framework.pillars.1.name`
  - `offer_stack.angle.framework.pillars.1.description`
  - `offer_stack.angle.framework.pillars.2.name`
  - `offer_stack.angle.framework.pillars.2.description`

### 2. “Fill this / looks good / next step” deterministisch afhandelen
Voor guided walkthroughs forceer ik Blueprint-write cards wanneer de gebruiker bevestigt of zegt dat de Coach het mag invullen, zoals:

- “okay just fill this how you think is best”
- “looks good, next step”
- “oke volgende stap”
- “give me the blueprint updates for step 2”
- “you didn’t give me the blueprint updates yet”

Belangrijk: als de huidige stap nog geen Blueprint updates heeft gekregen, mag de Coach niet naar de volgende stap gaan.

### 3. Quick replies veiliger maken
Ik pas de voorgestelde quick replies aan zodat knoppen als “Looks good, next step” in een guided Blueprint-flow niet letterlijk alleen een chatbericht sturen dat het model kan misinterpreteren. Ze worden uitgebreid naar een expliciete instructie:

“Looks good. First propose the Blueprint updates for this step so I can apply them; then we can move to the next step.”

### 4. Geen nep-tool output meer in tekst
Als het model tekst terugstuurt zoals `[proposed blueprint writes]` of raw paths zonder echte `blueprint_writes` tool-call, behandel ik dat als een mislukte tool-call en doe ik automatisch een repair retry met geforceerde `propose_blueprint_writes`.

De UI mag dus geen pseudo-output tonen als gewone chat wanneer er eigenlijk een update-card verwacht wordt.

### 5. Bestaande Step 1-fix generaliseren
De huidige hardcoded Step 1-detectie wordt vervangen door een generieke `MainOfferStep` detector die:

- de laatst besproken stap uit recente assistant-berichten haalt;
- expliciete step-nummers herkent;
- kijkt welke fields al accepted/dismissed zijn;
- bij ontbrekende updates de juiste tool-call forceert voor die stap.

### 6. Fallbacks concreet maken
De generieke fallback “Could you be a bit more specific?” blijft niet actief voor deze walkthrough-situaties. Als een Blueprint-card niet gemaakt kan worden, krijgt de gebruiker een concrete melding voor de juiste stap, bijvoorbeeld:

“Ik had hier Step 2 Blueprint updates moeten voorstellen. Ik kon de update-card net niet maken; geef me nog één zin over waarom jouw aanpak beter/sneller/makkelijker is, dan zet ik die direct om.”

### 7. Validatie
Ik verifieer deze scenario’s:

1. Step 1 updates geaccepteerd → Coach opent Step 2.
2. User zegt: “okay just fill this is how you think is best” → Blueprint updates card voor Step 2.
3. User klikt “Looks good, next step” → eerst Blueprint updates card voor Step 2, niet Step 3.
4. User zegt: “you didn't give me the blueprint updates for step 2 yet” → echte Blueprint updates card, geen `[proposed blueprint writes]` tekst.
5. Refresh → recente context blijft bruikbaar en de Coach weet welke stap nog pending is.