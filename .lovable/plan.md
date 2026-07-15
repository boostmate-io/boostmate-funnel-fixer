## Wat is er structureel mis

De Coach mag alleen naar velden schrijven die in het gedeelde Blueprint-schema staan (`supabase/functions/_shared/blueprintSchema.ts`). Alles wat daar ontbreekt, wordt stil weggefilterd — daarom bleef bij Payment Plans het amount leeg. Bij een controle tegen de daadwerkelijke UI-typen (`offerDesignTypes.ts` + `PricingTab.tsx` / `OfferStackTab.tsx`) blijkt dat er meer numerieke en gestructureerde velden op dezelfde manier ontbreken.

## Vermiste / genegeerde velden

**Pricing tab — het meest kritisch**
- `offer_stack.pricing.core_price` (headline prijs) — bestaat wel in UI, niet in schema.
- `offer_stack.pricing.payment_plans.<n>.amount` (bedrag per plan).
- `offer_stack.pricing.payment_plans.<n>.type` (Full Pay / 2-Pay / … / Custom) — nu impliciet altijd "custom".
- `offer_stack.pricing.premium_upgrade.price`.
- `offer_stack.pricing.recurring_offer.monthly_price`.
- `offer_stack.pricing.recurring_offer.interval` (monthly / quarterly / yearly).
- `offer_stack.pricing.guarantee_type` (none / refund / performance / milestone / custom).
- `offer_stack.pricing.guarantee_custom` (label voor custom).
- `offer_stack.pricing.recurring_enabled` en `premium_enabled` (schakelaars).

**Offer Stack tab**
- `offer_stack.stack.deliverables.<n>.frequency` (one_time / weekly / …).
- `offer_stack.stack.deliverables.<n>.delivery_types` (multi-select uit delivery library).
- `offer_stack.stack.delivery_timeline_custom` (label als timeline = custom).

**Offer Angle tab**
- `offer_stack.angle.core_promise.timeframe_custom` (label als timeframe = custom).
- Framework is hardcoded op 3 pijlers; als een user er 4-5 wil geeft het schema geen ruimte. Nu prima houden, maar noteren als grens.

## Plan

1. **Schema uitbreiden**
   - Voeg elk hierboven genoemd veld toe aan `blueprintSchema.ts` met passende `kind` (`text` voor getallen/enums, `textarea` waar prose passend is), duidelijke aliases (Engels + Nederlands), en `helper` die de toegestane waarden aangeeft (bv. `monthly | quarterly | yearly`, `none | refund | performance | milestone | custom`).
   - Voeg ze toe aan de `pricing` sub-block zodat "vul de Pricing tab" ze meepakt.

2. **Numerieke normalisatie**
   - Uitbreiden van `normalizeFieldValue` zodat prijs/amount-paths string-getallen als `€1.200`, `1,200`, `97/month` reduceren tot een numerieke string.
   - Uitbreiden van `applyBlueprintWrites` (of `normalizePricingLists`) zodat die numerieke strings correct als `number | ""` in de UI-datastructuur landen (payment_plans.amount, core_price, premium_upgrade.price, recurring_offer.monthly_price).

3. **Enum-normalisatie**
   - Kleine helpers voor `guarantee_type`, `recurring_offer.interval`, `payment_plans.<n>.type` en `deliverables.<n>.frequency`: mapt vrije tekst als "monthly" / "3-pay" / "one time" naar de toegestane enum-waarden.
   - Ongeldige waarden vallen terug op een veilig default in plaats van door te sluipen als vrije tekst.

4. **Booleans**
   - `recurring_enabled` en `premium_enabled` behandelen als booleaanse writes: `"true"`/`"false"`/`"yes"` → boolean bij apply. Coach mag deze impliciet activeren zodra hij bijbehorende velden voorstelt.

5. **PricingTab list-mode uitbreiden**
   - `useOfferCoach.openListCoach` voor Payment Plans krijgt `amount` en `type` als items erbij, met helper dat de Coach een concrete waarde in workspace-valuta moet noemen.
   - `appendPlan` / `appendPlans` accepteren die waarden en converteren `amount` naar `number`.

6. **Prompt-hint**
   - Eén regel in de Coach system prompt: bij Pricing-writes altijd amount + duration + label samen leveren; bij recurring altijd monthly_price + interval + name; bij premium altijd price + name + description. Voorkomt dat de Coach "de helft" voorstelt.

7. **Sanitizer / leak-guards**
   - De bestaande sanitizer die pseudo tool-syntaxis stript blijft ongewijzigd.
   - Toevoegen: kort mandatory-retry stukje voor de "je vergat het bedrag / de amount / value / prijs"-follow-up zodat de Coach automatisch een write voorstelt voor de amount-paths van reeds voorgestelde payment plans (in plaats van "kun je specifieker zijn?").

## Bestanden

- `supabase/functions/_shared/blueprintSchema.ts` — nieuwe velden + pricing sub-block bijwerken.
- `supabase/functions/coach-chat/index.ts` — normalisatie voor number/enum/boolean, prompt-hint, follow-up retry.
- `src/lib/coach/applyBlueprintWrites.ts` — pricing/stack normalize functies uitbreiden zodat numeriek/enum/boolean correct wegvalt in de bestaande UI-structuur.
- `src/components/business-blueprint/offer/PricingTab.tsx` en `useOfferCoach` call — `amount` en `type` mee laten schrijven vanuit list-mode, helper-tekst herschrijven ("Coach stelt ook bedragen voor" i.p.v. "you set the amounts").
- Optioneel: `OfferStackTab.tsx` — deliverables list-mode meegeven van `frequency` en `delivery_types` zodra schema uitgebreid is.

Niets aan het chat-UI-gedrag of aan andere modules; alleen deze scope.