# PRD: Publieke Landingspagina

## Overzicht
Marketing landingspagina met een publieke audit wizard voor leadgeneratie. Bezoekers kunnen een gratis funnel audit uitvoeren, waarna ze worden gevraagd een account aan te maken.

## Doelstellingen
- Leadgeneratie via gratis funnel audit
- Conversie van bezoekers naar geregistreerde gebruikers
- Showcase van BoostMate's AI-mogelijkheden

## Functionele Vereisten

### FR-1: Landingspagina
- Hero sectie met value proposition
- Uitleg van de audit-functionaliteit
- CTA naar de audit wizard

### FR-2: Publieke Audit Wizard
- Zelfde wizard als in het dashboard maar zonder login vereist
- Na voltooiing: scraping en AI-analyse worden uitgevoerd
- Resultaten worden getoond

### FR-3: Registratie Flow
- Na het bekijken van resultaten wordt registratie aangeboden
- Bij registratie wordt automatisch een project aangemaakt
- Audit data, sales copy asset en funnel worden aan het project gekoppeld
- Gebruiker komt direct in het dashboard terecht

## Technische Details
- `src/pages/Index.tsx` — Landingspagina en publieke audit flow
- `src/components/audit/AuditWizard.tsx` — Publieke wizard
- Na registratie: automatische project- en datacreatie

## Afhankelijkheden
- Authenticatie, Funnel Audit, Assets Library, Funnel Designer
