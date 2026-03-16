# PRD: Projectbeheer

## Overzicht
Gebruikers kunnen meerdere projecten aanmaken en beheren. Alle data (funnels, assets, audits, analytics) is gekoppeld aan een actief project.

## Doelstellingen
- Gescheiden data per project (multi-tenant op gebruikersniveau)
- Snel wisselen tussen projecten via sidebar
- CRUD-operaties op projecten

## Functionele Vereisten

### FR-1: Project CRUD
- Aanmaken van een nieuw project met naam
- Hernoemen van een bestaand project
- Verwijderen van een project (met cascade delete van gerelateerde data)
- Lijst van alle projecten van de ingelogde gebruiker

### FR-2: Project Switcher
- Sidebar component `ProjectSwitcher` toont het actieve project
- Dropdown om snel te wisselen tussen projecten
- Bij wisseling wordt alle data herladen voor het nieuwe project

### FR-3: Project Context
- `ProjectContext` (React Context) beheert het actieve project
- Alle data-ophaal queries filteren op `project_id`
- Eerste project wordt automatisch geselecteerd bij login

## Database Schema

### Tabel: `projects`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Eigenaar |
| name | text | Projectnaam (default: 'My Project') |
| created_at | timestamptz | Aanmaakdatum |
| updated_at | timestamptz | Laatst gewijzigd |

### RLS
- Gebruikers kunnen alleen eigen projecten beheren (`user_id = auth.uid()`)

## Technische Details
- `src/contexts/ProjectContext.tsx` — React Context voor actief project
- `src/components/dashboard/ProjectSwitcher.tsx` — UI component
- `src/components/dashboard/ProjectSettings.tsx` — Instellingen
- Alle tabellen met `project_id` kolom: `funnels`, `assets`, `audits`

## Afhankelijkheden
- Authenticatie (user moet ingelogd zijn)
