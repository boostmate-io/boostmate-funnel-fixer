# Seed Templates — Template Type Integratie

## Context
De `template_type` kolom is zojuist toegevoegd aan zowel `funnels` als `seed_templates`. Voor reguliere (gebruiker) templates werkt de UI al: categorie-filters, badges bij het opslaan, en type-selectie. Voor **seed templates** (admin-only, gekopieerd naar nieuwe accounts) is dit nog **niet** doorgevoerd.

## Probleem
Als we niets aanpassen, gebeurt het volgende:
- Seed templates worden zonder `template_type` opgeslagen → `NULL`
- Bij kopiëren naar een nieuw account ontbreken type-labels in hun template-bibliotheek
- Admins kunnen seed templates niet categoriseren

## Oplossing

### Stap 1 — Database triggers updaten
Verschillende triggers kopiëren actieve seed templates naar `funnels` bij het aanmaken van een account. Deze moeten ook `template_type` meenemen:

```text
Trigger: handle_new_user_role()
Trigger: on_auth_user_created
Procedure: agency sub-account creation
Procedure: client account creation
```

### Stap 2 — Seed template type toewijzen aan bestaande data
De huidige 3 seed templates (`Lead Funnel Blueprint`, `Low Ticket Funnel Blueprint`, `Client Converter Funnel Blueprint`) zijn allemaal **"Full Funnel"** types. We updaten ze naar `full-funnel`.

### Stap 3 — Frontend "Save as Seed Template" dialog
- Toevoegen: Template Type dropdown (zelfde 5 opties als bij reguliere templates)
- `saveAsSeedTemplate()` moet `template_type` mee opslaan bij insert

### Stap 4 — Frontend "Manage Seed Templates" admin-lijst
- Type-badge tonen bij elk seed template item
- Bij editing: `template_type` meenemen in update-call

### Stap 5 — ClientAccountsView
- Bij het kopiëren van seed templates naar een nieuw sub-account moet `template_type` meegekopieerd worden.

## Impact
- Database: 6+ triggers/procedures updaten (alleen `template_type` kolom toevoegen aan SELECT/INSERT)
- Frontend: 3 locaties in `FunnelDesigner.tsx`, 1 in `ClientAccountsView.tsx`
- Data: 3 bestaande seed templates krijgen `template_type = 'full-funnel'`

## Niet in scope
- Geen wijziging aan het bestaande template-architectuur
- Geen nieuwe tabellen of RLS policies