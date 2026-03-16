# PRD: Meertaligheid (i18n)

## Overzicht
Ondersteuning voor Nederlands en Engels via i18next met een taalwisselaar in de dashboard sidebar.

## Doelstellingen
- Volledige UI beschikbaar in NL en EN
- Eenvoudig wisselen tussen talen
- Taalkeuze wordt onthouden

## Functionele Vereisten

### FR-1: Vertalingen
- Alle UI-teksten via `t()` functie uit i18next
- Vertalingsbestanden: `src/i18n/en.json` en `src/i18n/nl.json`
- Fallback naar Engels bij ontbrekende vertalingen

### FR-2: Taalwisselaar
- Component in de dashboard sidebar
- Visuele indicator van de actieve taal
- Directe taalwissel zonder pagina-refresh

### FR-3: Taal Persistentie
- Geselecteerde taal wordt opgeslagen in localStorage
- Bij herbezoek wordt de laatst gekozen taal hersteld

## Technische Details
- `src/i18n/index.ts` — i18next configuratie
- `src/i18n/en.json` — Engelse vertalingen
- `src/i18n/nl.json` — Nederlandse vertalingen
- `src/components/dashboard/LanguageSwitcher.tsx` — Taalwisselaar
- Gebruikt `react-i18next` met `useTranslation` hook

## Afhankelijkheden
- Geen (standalone feature)
