# PRD: Assets Library

## Overzicht
Beheer van sales copy assets met secties. Elke asset bevat gestructureerde content-secties die bewerkt kunnen worden met een rich text editor.

## Doelstellingen
- Gestructureerd beheer van sales copy per funnel page
- Rich text editing per sectie
- Koppeling tussen assets en funnel nodes

## Functionele Vereisten

### FR-1: Assets Lijst
- Overzicht van alle assets voor het actieve project
- Filteren op type (momenteel: `sales_copy`)
- Aanmaken, hernoemen en verwijderen van assets

### FR-2: Asset Secties
- Elke asset bevat meerdere secties met titel en content
- Secties hebben een sorteer-volgorde (`sort_order`)
- Toevoegen, verwijderen en herordenen van secties

### FR-3: Rich Text Editor
- WYSIWYG editor per sectie (`RichTextEditor` component)
- Ondersteunt basis opmaak (bold, italic, headings, lijsten)
- Content wordt opgeslagen als tekst

### FR-4: Koppeling met Funnel Designer
- Assets kunnen gekoppeld worden aan funnel page nodes via `linkedAssetId`
- Vanuit het Node Details Panel in de Funnel Designer

## Database Schema

### Tabel: `assets`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Eigenaar |
| project_id | uuid | FK naar projects |
| name | text | Assetnaam |
| type | text | Asset type (default: 'sales_copy') |
| description | text | Optionele beschrijving |
| created_at | timestamptz | Aanmaakdatum |
| updated_at | timestamptz | Laatst gewijzigd |

### Tabel: `asset_sections`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| asset_id | uuid | FK naar assets |
| title | text | Sectie titel |
| content | text | Sectie inhoud |
| sort_order | integer | Volgorde |
| created_at | timestamptz | Aanmaakdatum |
| updated_at | timestamptz | Laatst gewijzigd |

### RLS
- Assets: `user_id = auth.uid()`
- Asset sections: via subquery op assets tabel

## Technische Details
- `src/components/assets/AssetsLibrary.tsx` — Hoofdcomponent
- `src/components/assets/AssetSectionsList.tsx` — Secties lijst
- `src/components/assets/RichTextEditor.tsx` — WYSIWYG editor

## Afhankelijkheden
- Authenticatie, Projectbeheer
