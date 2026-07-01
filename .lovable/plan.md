## Doel

Vervang het huidige systeem van 4 vaste follow-ups (met hardcoded interval van 1 dag) door een dynamische lijst waar de gebruiker zelf bepaalt:
- Hoeveel follow-ups er zijn (0 tot onbeperkt)
- Wat de tekst/template per follow-up is
- Hoeveel tijd er tussen elk bericht moet zitten (in dagen én uren)

## Wijzigingen

### 1. Settings UI (`OutreachSettings.tsx`)
Sectie "Follow-up Templates" wordt herwerkt:
- Lijst met kaartjes, elk kaartje = 1 follow-up met:
  - Textarea voor de template tekst
  - Twee kleine inputs: "Wachten X dagen Y uur na vorig bericht"
  - Verwijder-knop
- Knop "+ Follow-up toevoegen" onderaan
- Volgorde aanpasbaar via drag-handle of pijl omhoog/omlaag

### 2. Datamodel
De bestaande `follow_up_templates` kolom (jsonb) op `outreach_settings` krijgt een nieuw formaat:
```
[
  { index: 1, content: "...", wait_days: 1, wait_hours: 0 },
  { index: 2, content: "...", wait_days: 2, wait_hours: 0 },
  ...
]
```
Backwards-compat: bestaande strings/oude objects worden bij het laden geconverteerd naar dit formaat met `wait_days: 1`.

Geen database migratie nodig — het is een jsonb veld.

### 3. Follow-up timing logica (`useOutreachData.ts`)
De functie `getNextFollowUp` gebruikt nu hardcoded `+1 dag`. Deze wordt aangepast zodat ze de wait-waarden uit de settings leest. Signature wijzigt naar `getNextFollowUp(lead, followUpConfig)`.

Alle plekken die deze functie aanroepen (`OutreachLeadDetail`, `OutreachPipeline`, `OutreachDraftQueue`, `OutreachLeadsList`) krijgen de settings mee via de bestaande `useOutreachConfig` hook.

### 4. Bericht generatie (`generate-outreach-messages` edge function)
Genereert nu vast opener + 4 follow-ups. Aanpassen zodat het aantal follow-ups gelijk is aan het aantal in de settings. De AI action instructions/blocks verwijzen momenteel naar "followup_1..4" — die worden dynamisch opgebouwd op basis van de configuratie.

De `message_type` enum-achtige waarden in `outreach_messages` (`followup_1..4`) blijven werken, maar we staan nu ook `followup_5`, `followup_6`, etc. toe. Aangezien dit een tekst-kolom is (geen enum in DB), werkt dit direct.

### 5. Lead tabel `fuN_sent_at` kolommen
De lead-tabel heeft `fu1_sent_at` t/m `fu4_sent_at` als aparte kolommen. Om onbeperkte follow-ups te ondersteunen zonder telkens schema-wijzigingen, voegen we één jsonb kolom `followups_sent_at` toe (bv. `{"1": "2026-...", "2": "2026-..."}`). De oude 4 kolommen blijven bestaan voor backwards-compat en worden bij update parallel bijgewerkt voor FU1-4.

Dit vraagt één kleine migratie: `ALTER TABLE outreach_leads ADD COLUMN followups_sent_at jsonb DEFAULT '{}'::jsonb`.

## Wat blijft hetzelfde
- Opener template en flow
- Kanaal DM/email split
- Analytics — die tellen nog steeds op basis van sent messages
- Alle bestaande settings-secties (setup types, lead sources, tone, etc.)

## Standaard bij nieuwe accounts
Als er nog geen follow-ups geconfigureerd zijn, tonen we een lege lijst met een suggestie-knop "Add default sequence" die 4 follow-ups aanmaakt met intervallen 1, 2, 3, 5 dagen (in plaats van huidige 1/1/1/1).

Akkoord om zo te bouwen?
