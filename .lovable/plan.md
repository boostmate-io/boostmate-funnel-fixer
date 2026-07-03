## Doel

Elke sectie waar meerdere items toegevoegd kunnen worden krijgt een **sectie-brede "Coach"-knop** naast de "Add"-knop. Die knop opent de AI Coach met de volledige sectie als scope. De Coach stelt een lijst voorstellen voor die via het bestaande **Blueprint updates**-kader (per item apply/dismiss, of alles tegelijk) worden toegevoegd — exact hetzelfde patroon als bij losse velden.

## Betrokken secties (Offer Design)

- **Offer Angle** → Signature Mechanism / Framework → Core Pillars
- **Offer Stack** → Deliverables, Resources, Support Channels, Bonuses, Milestones
- **Pricing** → Payment Plans
- **Offer Ecosystem** → Non-core offers (front-end, upsell, downsell, back-end)

## UX

- Knop rechtsboven in elke `BuilderCard`, links van of naast de bestaande "Add"-knop. Label: `Coach` met `MessageSquare`-icoon, zelfde styling als de veld-Coach knop (consistentie met vorige afspraak).
- Empty state krijgt daarnaast een tweede prominente "Ask Coach to suggest…"-CTA onder de bestaande "Add first…"-knop, zodat leeg-scherm meteen naar de Coach leidt.
- Als er al items zijn: de sectie-Coach blijft beschikbaar. De Coach weet dan dat hij mag *aanvullen* i.p.v. van nul beginnen (zie prompt-instructie hieronder).

## Coach-flow

1. Gebruiker klikt sectie-Coach → `CoachPanel` opent met een nieuwe scope `blueprint.list_section`.
2. De user-vraag opent bv. met een quick-reply zoals *"Suggest 3–5 pillars for my framework"*.
3. Coach antwoordt met een `blueprint_writes`-part waarin elke voorgestelde item-veld één write is met een gestructureerd pad (bv. `offer_stack.angle.framework.pillars.<newId>.name` + `.description`).
4. Bestaand Blueprint-updates kader toont alle voorstellen; user kan per item of allemaal apply/dismiss. Apply voegt items daadwerkelijk toe aan de array via `applyBlueprintWrites` (die al array-indices en objecten aankan sinds vorige iteratie — we breiden uit met stabiel-gegenereerde IDs voor nieuwe items).

## Technische details

**Nieuw**
- `src/lib/coach/buildContext.ts` → `buildBlueprintListSectionContext(sectionSpec, blueprint, subAccountId)`: bouwt een `CoachContext` met scope `blueprint.list_section`, target = de hele lijst (id = het array-pad, bv. `offer_stack.angle.framework.pillars`), en meta over item-schema (welke velden per item, min/max aantal, korte beschrijving).
- `src/lib/coach/types.ts` → nieuwe scope `"blueprint.list_section"` + optionele `target.itemSchema: { fields: {key,label,helper}[]; suggestedCount?: [min,max] }`.
- `src/components/business-blueprint/offer/SectionCoachButton.tsx`: kleine wrapper rond `MessageSquare + "Coach"` voor de header van `BuilderCard`. Zelfde stijl als `CoachIconButton` niet-compact.
- `src/components/business-blueprint/offer/useOfferSectionCoach.tsx` (of uitbreiding van bestaande `useOfferCoach`): opent panel met list-section-context i.p.v. field-context. Blijft snapshot bouwen op dezelfde manier.

**Aangepast**
- `src/components/business-blueprint/offer/BuilderCard.tsx`: extra optionele prop `onCoach?: () => void`. Rendert `SectionCoachButton` links van de "Add"-knop wanneer aanwezig. Empty state krijgt ook een extra "Ask Coach"-CTA (secundair) als `onCoach` gegeven is.
- `FrameworkSection.tsx`, `OfferStackTab.tsx`, `PricingTab.tsx`, `OfferEcosystemTab.tsx`: elke lijst-sectie geeft nu `onCoach` mee met een goede spec (label = sectienaam, item-schema = velden die de Coach moet vullen, array-pad, huidig aantal items).
- `supabase/functions/coach-chat/index.ts`:
  - System-prompt uitbreiden: bij `blueprint.list_section` genereert de Coach een **gestructureerde lijst voorstellen** — één `blueprint_writes` entry per item-veld, gebruikt vers-gegenereerde stabiele IDs (UUID-achtig) in de paden zodat items niet met elkaar collide.
  - `allowedBlueprintWritePaths` uitbreiden om paden onder het door de client meegegeven `target.id` (het array-pad) toe te staan, ook als de betreffende index nog niet bestaat (nieuwe items).
  - Redelijk maximum: bv. Coach mag max 6 items per sectie voorstellen tenzij user meer vraagt.
- `src/lib/coach/applyBlueprintWrites.ts`: controleer dat `setDeep` correct nieuwe object-items met een gegeven ID kan invoegen wanneer het pad `pillars.<uuid>.name` is (i.p.v. numerieke index). Voeg helper `upsertItemById` toe zodat writes voor hetzelfde item-ID in één apply samen één item vormen. Behoud normalisatie voor framework pillars, en voeg vergelijkbare normalisatie toe voor Deliverables/Bonuses/Milestones/PaymentPlans/EcosystemOffers (auto-fill ontbrekende velden met defaults, zorg voor unieke IDs).

**Niet gewijzigd**
- `CoachPanel.tsx` per-item apply/dismiss UI blijft zoals hij is — de nieuwe writes verschijnen automatisch in hetzelfde kader.
- Bestaande per-item veld-Coach knoppen blijven bestaan (voor wie later één specifiek pillar/deliverable wil verbeteren).

## Acceptance

- Op elke lijst-sectie in Offer Angle, Offer Stack, Pricing en Offer Ecosystem staat rechtsboven een "Coach"-knop, ook als de sectie leeg is.
- Klikken opent de Coach met de sectie als context en een duidelijke quick-reply om een lijst voor te stellen.
- Coach-voorstellen verschijnen als meerdere items in het Blueprint updates-kader, elk per item apply/dismiss-baar, of allemaal tegelijk apply-baar.
- Apply voegt volledige items toe (met alle sub-velden ingevuld), zonder duplicaten of "gaten" in de array.
