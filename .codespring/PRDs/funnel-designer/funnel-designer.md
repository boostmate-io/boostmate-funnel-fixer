# PRD: Funnel Designer

## Overzicht
Visuele drag-and-drop funnel builder waarmee gebruikers hun marketing funnels kunnen ontwerpen, opslaan en beheren.

## Doelstellingen
- Intuïtieve visuele editor voor funnel-ontwerp
- Ondersteuning voor traffic sources en funnel pages
- Template-systeem voor hergebruik
- Koppeling met Assets Library

## Functionele Vereisten

### FR-1: Canvas
- ReactFlow-gebaseerde canvas met drag-and-drop nodes
- Twee node-types: `trafficSource` en `funnelPage`
- Verbindingen (edges) tussen nodes met animatie en pijlen
- Dot-grid achtergrond en zoom/pan controls
- Delete nodes/edges met Backspace/Delete

### FR-2: Elements Panel
- Zijpaneel links met beschikbare elementen
- Traffic Sources: Facebook Ads, Google Ads, Instagram Ads, TikTok Ads, Email, Organic Search, Direct Traffic
- Funnel Pages: Landing Page, Sales Page, Opt-in Page, Thank You Page, Upsell Page, Checkout Page, Webinar Page

### FR-3: Funnel CRUD
- Opslaan van funnel (insert of update)
- Laden van bestaande funnels via dialoog
- Aanmaken van nieuwe funnel met naam
- Verwijderen van funnels
- Hernoemen van actieve funnel (inline editing)

### FR-4: Templates
- Opslaan van huidige funnel als template
- Laden van templates om nieuwe funnel te starten
- Templates zijn zichtbaar voor alle geauthenticeerde gebruikers

### FR-5: Node Details Panel
- Klik op een funnelPage node opent details panel rechts
- Hernoemen van node (custom label)
- Koppelen van een Asset aan de node (`linkedAssetId`)

## Database Schema

### Tabel: `funnels`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Eigenaar |
| project_id | uuid | FK naar projects |
| name | text | Funnelnaam |
| nodes | jsonb | ReactFlow nodes array |
| edges | jsonb | ReactFlow edges array |
| is_template | boolean | Template flag |
| template_id | uuid | FK naar bron-template |
| description | text | Optionele beschrijving |
| created_at | timestamptz | Aanmaakdatum |
| updated_at | timestamptz | Laatst gewijzigd |

### RLS
- Gebruikers beheren eigen funnels (`user_id = auth.uid()`)
- Templates zijn leesbaar voor alle geauthenticeerde gebruikers

## Technische Details
- `src/components/funnel-designer/FunnelDesigner.tsx` — Hoofdcomponent
- `src/components/funnel-designer/ElementsPanel.tsx` — Elementen zijpaneel
- `src/components/funnel-designer/FunnelNode.tsx` — Funnel page node
- `src/components/funnel-designer/TrafficSourceNode.tsx` — Traffic source node
- `src/components/funnel-designer/NodeDetailsPanel.tsx` — Details panel
- `src/components/funnel-designer/constants.ts` — Node definities
- Gebruikt `@xyflow/react` library

## Afhankelijkheden
- Authenticatie, Projectbeheer, Assets Library (voor node-koppeling)
