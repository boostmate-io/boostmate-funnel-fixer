# PRD: Funnel Analytics

## Overzicht
Dagelijkse data-invoer en visualisatie van funnel metrics per stap. Gebruikers voeren handmatig KPI's in per funnel node en kunnen trends bekijken via grafieken.

## Doelstellingen
- Dagelijkse tracking van funnel prestaties
- Visualisatie van trends en conversies
- Historisch overzicht van ingevoerde data

## Functionele Vereisten

### FR-1: Funnel Selectie
- Selecteer een funnel uit de Funnel Designer om te analyseren
- Alleen funnels van het actieve project worden getoond

### FR-2: Dagelijkse Data-invoer
- Per geselecteerde funnel kunnen dagelijks metrics worden ingevoerd
- Per node (traffic source of funnel page) worden relevante KPI's gevraagd
- Metrics worden opgeslagen als JSON per node per dag

### FR-3: Grafieken
- Lijngrafieken voor trends over tijd
- Vergelijking tussen funnel stappen
- KPI-specifieke visualisaties

### FR-4: Historiek
- Overzicht van alle ingevoerde data per datum
- Mogelijkheid om historische data te bewerken

## Database Schema

### Tabel: `funnel_analytics_entries`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| funnel_id | uuid | FK naar funnels |
| user_id | uuid | Eigenaar |
| date | date | Datum van de entry |
| created_at | timestamptz | Aanmaakdatum |
| updated_at | timestamptz | Laatst gewijzigd |

### Tabel: `funnel_step_metrics`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| entry_id | uuid | FK naar funnel_analytics_entries |
| node_id | text | ID van de funnel node |
| node_label | text | Label van de node |
| node_type | text | Type node |
| metrics | jsonb | KPI-waarden als JSON |
| created_at | timestamptz | Aanmaakdatum |

### RLS
- Entries: `user_id = auth.uid()`
- Step metrics: via subquery op entries tabel

## Technische Details
- `src/components/analytics/AnalyticsModule.tsx` — Hoofdmodule
- `src/components/analytics/AnalyticsCharts.tsx` — Grafieken
- `src/components/analytics/AnalyticsHistory.tsx` — Historiek
- `src/components/analytics/AnalyticsSummary.tsx` — Samenvatting
- `src/components/analytics/DailyDataEntry.tsx` — Data-invoer
- `src/components/analytics/FunnelSelector.tsx` — Funnel selectie
- `src/components/analytics/metricDefinitions.ts` — Metric definities

## Afhankelijkheden
- Authenticatie, Projectbeheer, Funnel Designer
