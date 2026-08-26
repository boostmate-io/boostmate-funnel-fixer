# Voorkom Blueprint-updates bij een lege Coach-start

## Doel
Wanneer iemand in een nieuwe of bestaande workspace enkel op **AI Coach** klikt, start de Coach met gerichte vragen. De klik zelf mag nooit onmiddellijk een Blueprint-update genereren. Updates blijven wel beschikbaar zodra de gebruiker expliciet vraagt om iets in te vullen of na het gesprek akkoord geeft op een voorstel.

## Bevestigde oorzaak
- De walkthrough-knop maakt automatisch een focusbericht: `Let's work through ... and complete all fields.`
- Dat automatische bericht wordt momenteel als een normaal gebruikersbericht naar de Coach gestuurd.
- De backend herkent `complete` + `Customer Clarity` als expliciete schrijfintentie. Als het model niet meteen schrijft, forceert de safety net alsnog `propose_blueprint_writes`.
- Daardoor kan de eerste klik een inhoudelijk ongefundeerde update opleveren, ondanks de bestaande promptregel dat het openen van een sectie alleen een uitnodiging tot coaching is.

## Aanpak
1. **Automatische focusbeurten expliciet markeren**
   - Breid het versturen van Coach-berichten uit met een turn-origin voor automatisch geïnjecteerde focusberichten.
   - Handmatig getypte berichten en aangeklikte inhoudelijke quick replies blijven gewone gebruikersinstructies.

2. **Writes blokkeren tijdens de openingsbeurt**
   - Laat de Coach-backend een gemarkeerde focusstart behandelen als navigatie/contextwisseling, nooit als schrijfintentie.
   - Schakel voor die beurt zowel de algemene write-intent retry als eventuele geforceerde Blueprint-write uit.
   - Voeg een harde openingsinstructie toe: start met één of twee relevante groundingvragen en maak nog geen voorstelkaart.

3. **Walkthrough-tekst ondubbelzinnig maken**
   - Vervang “complete all fields” door taal die duidelijk om begeleiding en vragen vraagt, zonder schrijfwerkwoord dat intent-detectie kan activeren.
   - Behoud de zichtbare focuswisseling naar het actieve Blueprint-tabblad.

4. **Regressies afdekken**
   - Nieuwe, lege workspace + klik op Customer Clarity AI Coach: vraag/quick replies, geen `blueprint_writes`.
   - Bestaande workspace + klik op AI Coach: ook geen automatische write; de Coach gebruikt bestaande context wel in zijn vraag.
   - Daarna expliciet “Vul deze sectie voor me in”: Blueprint-update wordt nog steeds gegenereerd.
   - Na coaching “ja, doe maar” of “next”: afgesproken update wordt nog steeds voorgesteld en blijft binnen het actieve tabblad.
   - Controleer dat Info, veld-Coach, roadmap-Coach en normale handmatige chatberichten niet onbedoeld worden geblokkeerd.

## Technisch
- Frontend: `CoachPanel`, `useCoachChat` en de focus-turn aanroep krijgen een klein origin-signaal voor automatisch geïnjecteerde beurten.
- Backend: `coach-chat` gebruikt dit signaal bij toolkeuze, write-intent-detectie en retrylogica; server-side validatie blijft leidend.
- Focuscopy: `buildFocusTurnText` wordt aangepast zodat een walkthrough opent met begeleiden/vragen in plaats van “velden invullen”.
- Geen database- of schemawijziging nodig.
