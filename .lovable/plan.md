## Plan: Step 3 ‘propose the writes’ mag nooit meer generieke fallback geven

De vorige fix dekte “blueprint updates” en “looks good / next step”, maar deze screenshot toont een extra gat: de Coach stelt zelf “Looks good, propose the writes.” voor, terwijl de server die zin niet hard genoeg als Blueprint-write intent herkent.

### 1. Intent-detectie uitbreiden voor “writes” zonder het woord “Blueprint”
Ik breid de server-side detectie uit zodat deze zinnen altijd als Blueprint-write verzoek gelden binnen de Main Offer walkthrough:

- “propose the writes”
- “propose the writes for this step”
- “give me the writes”
- “show the writes”
- “looks good, propose the writes”
- “looks good, propose the updates”
- “stel de writes voor” / “geef de writes”

Dit moet werken voor Step 1, Step 2 én Step 3.

### 2. Laatst besproken stap robuuster herkennen
Ik pas de stapdetectie aan zodat hij niet alleen kijkt naar `message.content`, maar altijd de volledige assistant parts mee analyseert. Daardoor herkent de backend Step 3 ook als de tekst uit een Markdown/parts-render komt.

Concreet: als de laatste assistant zegt “Step 3”, “Signature Framework”, “pillars”, “framework fields” of “I’ll propose the names and descriptions”, dan wordt de huidige stap Step 3.

### 3. “Ik stel dit zelf voor” = harde serveractie
Als de assistant zelf een quick reply heeft voorgesteld zoals “Looks good, propose the writes.” en de gebruiker klikt/typt die, dan wordt `propose_blueprint_writes` geforceerd. Niet afhankelijk van het model.

### 4. Step 3 paths extra tolerant maken
Voor Step 3 accepteert de sanitizer ook model-output die per ongeluk virtuele pillar-paden gebruikt, zoals:

- `offer_stack.angle.framework.pillars.new_0.name`

Die worden omgezet naar de echte Blueprint paths:

- `offer_stack.angle.framework.pillars.0.name`

Zo kan de update-card alsnog verschijnen in plaats van dat alles wordt weggefilterd.

### 5. Generieke fallback blokkeren voor Main Offer walkthrough
Als de recente conversatie duidelijk in Step 1/2/3 zit én de gebruiker vraagt om writes/updates/proposals, mag de backend niet meer antwoorden met:

“Could you be a bit more specific?”

Dan komt er ofwel een echte Blueprint updates-card, ofwel een concrete step-specifieke herstelmelding.

### 6. Quick reply expansion aanvullen
De frontend breidt ook quick replies met “propose the writes” expliciet uit naar:

“Propose the Blueprint updates for the current Main Offer step so I can apply them.”

Daardoor wordt het verzoek ook in de UI ondubbelzinnig.

### 7. Verificatie
Ik controleer specifiek deze flow:

1. Step 2 writes geaccepteerd.
2. Coach opent Step 3 Signature Framework.
3. User zegt of klikt: “Looks good, propose the writes.”
4. Verwacht: Blueprint updates-card met Step 3 framework/pillar velden.
5. Niet toegestaan: “Could you be a bit more specific?”