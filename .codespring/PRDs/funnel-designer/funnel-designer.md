# PRD: Funnel Designer

## Overview
Visual drag-and-drop funnel builder that allows users to design, save and manage their marketing funnels.

## Objectives
- Intuitive visual editor for funnel design
- Support for traffic sources and funnel pages
- Template system for reuse
- Integration with Assets Library

## Functional Requirements

### FR-1: Canvas
- ReactFlow-based canvas with drag-and-drop nodes
- Two node types: `trafficSource` and `funnelPage`
- Connections (edges) between nodes with animation and arrows
- Dot-grid background and zoom/pan controls
- Delete nodes/edges with Backspace/Delete

### FR-2: Elements Panel
- Side panel on the left with available elements
- Traffic Sources: Facebook Ads, Google Ads, Instagram Ads, TikTok Ads, Email, Organic Search, Direct Traffic
- Funnel Pages: Landing Page, Sales Page, Opt-in Page, Thank You Page, Upsell Page, Checkout Page, Webinar Page

### FR-3: Funnel CRUD
- Save funnel (insert or update)
- Load existing funnels via dialog
- Create new funnel with name
- Delete funnels
- Rename active funnel (inline editing)

### FR-4: Templates
- Save current funnel as template
- Load templates to start a new funnel
- Templates are visible to all authenticated users

### FR-5: Node Details Panel
- Clicking a funnelPage node opens details panel on the right
- Rename node (custom label)
- Link an Asset to the node (`linkedAssetId`)

## Database Schema

### Table: `funnels`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Owner |
| project_id | uuid | FK to projects |
| name | text | Funnel name |
| nodes | jsonb | ReactFlow nodes array |
| edges | jsonb | ReactFlow edges array |
| is_template | boolean | Template flag |
| template_id | uuid | FK to source template |
| description | text | Optional description |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modified |

### RLS
- Users manage their own funnels (`user_id = auth.uid()`)
- Templates are readable by all authenticated users

## Technical Details
- `src/components/funnel-designer/FunnelDesigner.tsx` — Main component
- `src/components/funnel-designer/ElementsPanel.tsx` — Elements side panel
- `src/components/funnel-designer/FunnelNode.tsx` — Funnel page node
- `src/components/funnel-designer/TrafficSourceNode.tsx` — Traffic source node
- `src/components/funnel-designer/NodeDetailsPanel.tsx` — Details panel
- `src/components/funnel-designer/constants.ts` — Node definitions
- Uses `@xyflow/react` library

## Dependencies
- Authentication, Project Management, Assets Library (for node linking)
