# PRD: Funnel Analytics

## Overview
Daily data entry and visualization of funnel metrics per step. Users manually enter KPIs per funnel node and can view trends via charts.

## Objectives
- Daily tracking of funnel performance
- Visualization of trends and conversions
- Historical overview of entered data

## Functional Requirements

### FR-1: Funnel Selection
- Select a funnel from the Funnel Designer to analyze
- Only funnels from the active project are shown

### FR-2: Daily Data Entry
- Per selected funnel, metrics can be entered daily
- Per node (traffic source or funnel page) relevant KPIs are requested
- Metrics are stored as JSON per node per day

### FR-3: Charts
- Line charts for trends over time
- Comparison between funnel steps
- KPI-specific visualizations

### FR-4: History
- Overview of all entered data per date
- Ability to edit historical data

## Database Schema

### Table: `funnel_analytics_entries`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| funnel_id | uuid | FK to funnels |
| user_id | uuid | Owner |
| date | date | Entry date |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modified |

### Table: `funnel_step_metrics`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| entry_id | uuid | FK to funnel_analytics_entries |
| node_id | text | Funnel node ID |
| node_label | text | Node label |
| node_type | text | Node type |
| metrics | jsonb | KPI values as JSON |
| created_at | timestamptz | Creation date |

### RLS
- Entries: `user_id = auth.uid()`
- Step metrics: via subquery on entries table

## Technical Details
- `src/components/analytics/AnalyticsModule.tsx` — Main module
- `src/components/analytics/AnalyticsCharts.tsx` — Charts
- `src/components/analytics/AnalyticsHistory.tsx` — History
- `src/components/analytics/AnalyticsSummary.tsx` — Summary
- `src/components/analytics/DailyDataEntry.tsx` — Data entry
- `src/components/analytics/FunnelSelector.tsx` — Funnel selection
- `src/components/analytics/metricDefinitions.ts` — Metric definitions

## Dependencies
- Authentication, Project Management, Funnel Designer
