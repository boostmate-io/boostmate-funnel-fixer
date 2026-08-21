# Outreach follow-up meldingen: kalenderdagen + status-gating

## Hoe het nu werkt (geverifieerd)

De due-logica zit centraal in `getNextFollowUp` (`useOutreachData.ts`) en wordt gebruikt in de leadlijst, pipeline, draft queue en lead-detail.

- Er is geen opener verstuurd (`opener_sent_at` leeg) → geen melding.
- Anders wordt de eerste follow-up gezocht die nog geen verzendtijdstip heeft (`followups_sent_at` JSON, met fallback op de oude `fu1..fu4_sent_at` kolommen).
- De due-tijd = tijdstip van de vorige verzending (opener, of de vorige follow-up) + `wait_days` en `wait_hours` uit de settings-template.
- `isDue` is waar zodra de exacte klok die due-tijd voorbij is.
- Zodra een follow-up als verzonden is gemarkeerd, schuift de keten door naar de volgende follow-up — dus ja, het herhaalt zich voor alle ingestelde follow-ups tot ze allemaal verstuurd zijn.

Twee afwijkingen van de bedoeling:

1. **Uren in plaats van kalenderdagen.** Opener op 19/08 om 12:00 met "2 dagen" wordt pas due op 21/08 om 12:00, niet op 21/08 om 00:00.
2. **Status wordt niet meegewogen.** De badge verschijnt bij elke lead met een verzonden opener, ook bij `replied`, `interested`, `closed`, `not_interested`. De bedoeling is dat opvolging alleen geldt zolang de lead nog niet geantwoord heeft.

## Wat er verandert

1. **Kalenderdag-berekening.** Due-tijd wordt: dag van de vorige verzending + `wait_days` dagen, teruggezet naar het begin van die dag (00:00 lokale tijd). Een lead met opener op 19/08 12:00 en "2 dagen" is dus vanaf 21/08 00:00 due.
2. **`wait_hours` blijft werken** als extra offset bovenop die dagstart (bv. 2 dagen + 9 uur = 21/08 09:00). Bij `wait_days = 0` blijft de exacte klok gelden (uren-offset op het echte verzendmoment), zodat "stuur 4 uur later" niet stiekem naar morgen springt.
3. **Alleen actieve leads krijgen meldingen.** Follow-up badges/filters gelden voor leads met status `sent` (en `new`/`drafted`/`ready_to_send` waar een opener al gemarkeerd is). Bij `replied`, `interested`, `closed`, `no_response`, `not_interested` verschijnt geen due-melding meer.

Omdat alle schermen dezelfde helper gebruiken, werkt dit meteen consistent in de leadlijst, de "follow-up due"-filter, de pipeline-kaarten, de draft queue en het lead-detailpaneel.

## Technisch

- `getNextFollowUp` in `src/components/outreach/useOutreachData.ts`: due-berekening vervangen door een `startOfDay(prevSentAt) + wait_days` variant met uren-offset; nieuwe status-gate aan het begin van de functie (afgeleid van `lead.status`).
- Geen databasewijzigingen; `followups_sent_at` en de legacy `fu*_sent_at` fallback blijven ongewijzigd.
- Geen wijziging aan de markeer-als-verzonden logica in `OutreachDraftQueue`/`OutreachLeadDetail`.
