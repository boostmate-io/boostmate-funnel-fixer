

# Plan: Analytics & Optimalisatie Module

## Wat we bouwen

Een nieuwe "Analytics" module in het dashboard waarmee gebruikers dagelijks KPI-data per funnel-stap kunnen invoeren. De module is gekoppeld aan bestaande funnels uit de Funnel Designer. De structuur houdt al rekening met toekomstige split-test/optimalisatie features.

## Database ontwerp

Twee nieuwe tabellen:

```text
funnel_analytics_entries
├── id (uuid, PK)
├── funnel_id (uuid, FK → funnels.id ON DELETE CASCADE)
├── user_id (uuid, NOT NULL)
├── date (date, NOT NULL)
├── created_at / updated_at (timestamptz)
└── UNIQUE(funnel_id, date)

funnel_step_metrics
├── id (uuid, PK)
├── entry_id (uuid, FK → funnel_analytics_entries.id ON DELETE CASCADE)
├── node_id (text, NOT NULL)       -- maps to funnel node ID
├── node_label (text, NOT NULL)    -- snapshot of node label
├── node_type (text, NOT NULL)     -- 'trafficSource' | 'funnelPage'
├── metrics (jsonb, DEFAULT '{}')  -- flexible KPI storage
├── created_at (timestamptz)
└── UNIQUE(entry_id, node_id)
```

The `metrics` JSONB field stores KPI key-value pairs relevant to each node type. Examples:
- Traffic source: `{ "impressions": 5000, "clicks": 320, "spend": 150.00, "cpc": 0.47 }`
- Opt-in page: `{ "visitors": 320, "conversions": 48, "conversion_rate": 15.0 }`
- Email sequence: `{ "sent": 48, "opened": 29, "clicked": 12, "open_rate": 60.4 }`
- Sales page: `{ "visitors": 12, "purchases": 2, "revenue": 994.00, "conversion_rate": 16.7 }`

RLS: authenticated users can manage rows where `user_id = auth.uid()`.

**Toekomst-klaar**: Een `funnel_ab_tests` tabel wordt later toegevoegd voor split-tests. De `funnel_step_metrics` structuur ondersteunt dit al doordat metrics per node_id worden opgeslagen -- een variant kan een aparte node_id krijgen.

## UI ontwerp

### Sidebar
- Nieuw menu-item "Analytics" met `TrendingUp` icon, tussen Funnel Designer en Assets Library

### Analytics Module layout

```text
┌─────────────────────────────────────────────────┐
│  [Funnel Selector dropdown]    [Date picker]    │
├─────────────────────────────────────────────────┤
│  Funnel overview (read-only mini ReactFlow)     │
├─────────────────────────────────────────────────┤
│  Data Entry Table                               │
│  ┌──────────┬──────────┬──────────┬──────────┐  │
│  │ Step     │ Metric 1 │ Metric 2 │ Metric 3 │  │
│  ├──────────┼──────────┼──────────┼──────────┤  │
│  │ FB Ads   │ impr.    │ clicks   │ spend    │  │
│  │ Opt-in   │ visitors │ conv.    │ rate     │  │
│  │ Email    │ sent     │ opened   │ clicks   │  │
│  │ Sales    │ visitors │ purch.   │ revenue  │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
│                              [Save Day Data]    │
├─────────────────────────────────────────────────┤
│  History table (last 30 days summary)           │
│  Expandable rows per date                       │
└─────────────────────────────────────────────────┘
```

### Metrics per node type
De relevante KPI-velden worden automatisch bepaald op basis van het node type:

| Node type | Metrics |
|-----------|---------|
| trafficSource | impressions, clicks, spend, CPC |
| opt-in / squeeze | visitors, conversions, conversion_rate |
| bridge / webinar | visitors, completions, completion_rate |
| email (simulated) | sent, opened, clicked, open_rate, click_rate |
| sales / checkout / order-form | visitors, purchases, revenue, conversion_rate |
| upsell / downsell | offered, accepted, revenue, acceptance_rate |
| thank-you / confirmation | visitors |

## Bestanden

| Bestand | Actie |
|---------|-------|
| DB migratie | 2 nieuwe tabellen + RLS |
| `src/components/analytics/AnalyticsModule.tsx` | Nieuw -- hoofd module component |
| `src/components/analytics/FunnelSelector.tsx` | Nieuw -- dropdown met project funnels |
| `src/components/analytics/DailyDataEntry.tsx` | Nieuw -- tabel voor dagelijkse invoer |
| `src/components/analytics/AnalyticsHistory.tsx` | Nieuw -- overzicht recente data |
| `src/components/analytics/metricDefinitions.ts` | Nieuw -- KPI config per node type |
| `src/components/dashboard/DashboardSidebar.tsx` | Toevoegen menu-item |
| `src/pages/Dashboard.tsx` | Toevoegen analytics module route |
| `src/i18n/en.json` + `nl.json` | Nieuwe vertalingen |

## Implementatievolgorde

1. Database migratie (tabellen + RLS)
2. Metric definitions config bestand
3. FunnelSelector component
4. DailyDataEntry component (invoerformulier met dynamische kolommen)
5. AnalyticsHistory component (overzichtstabel)
6. AnalyticsModule wrapper
7. Sidebar + Dashboard integratie
8. i18n labels

