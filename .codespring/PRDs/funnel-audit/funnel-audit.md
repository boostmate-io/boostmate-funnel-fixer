# PRD: Funnel Audit

## Overview
AI-powered audit wizard that analyzes landing pages, assigns scores, and automatically generates sales copy assets and funnels based on the analysis.

## Objectives
- Automated analysis of landing pages
- Visual section recognition via AI (screenshot analysis)
- Automatic generation of sales copy assets and funnels
- Actionable improvement suggestions

## Functional Requirements

### FR-1: Audit Wizard
- Step-by-step form with fields:
  - Landing page URL
  - Email address
  - Offer
  - Target audience
  - Funnel strategy
  - Traffic source
  - Monthly traffic
  - Conversion rate
- Validation per step

### FR-2: Landing Page Scraping
- Firecrawl API via Edge Function (`scrape-landing-page`)
- Retrieves screenshot and markdown content
- Screenshot is stored as base64

### FR-3: AI Analysis
- Edge Function `analyze-audit` with Google Gemini 2.5 Flash
- **Screenshot analysis**: Visual recognition of page sections (hero, features, testimonials, CTA, etc.)
- **Content mapping**: Scraped markdown is matched to visual sections
- **Funnel generation**: Based on the "funnel strategy" field, a funnel structure is proposed
- Output: sections (title + content) and funnel nodes/edges

### FR-4: Automatic Asset Creation
- After analysis, a `sales_copy` asset is created in the Assets Library
- Each visually recognized section becomes an `asset_section` with title and content
- Asset is automatically linked to the first funnel page node

### FR-5: Automatic Funnel Creation
- Funnel is created in the Funnel Designer based on the strategy
- Traffic source node based on the traffic source field
- Funnel pages based on the analyzed strategy
- If strategy is unclear: only a landing page node
- Sales copy asset is linked to the landing page node

### FR-6: Audit Report
- Score gauge (0-100)
- Summary of findings
- Visual representation of the analyzed funnel (read-only ReactFlow)
- List of improvement suggestions

### FR-7: Audit History
- List of all performed audits per project
- Click to view detail/report

## Database Schema

### Table: `audits`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Owner |
| landing_page_url | text | Page URL |
| landing_page_screenshot | text | Base64 screenshot |
| landing_page_content | text | Markdown content |
| email | text | Contact email |
| offer | text | Offer |
| target_audience | text | Target audience |
| funnel_strategy | text | Funnel strategy description |
| traffic_source | text | Traffic source |
| monthly_traffic | text | Monthly traffic |
| conversion_rate | text | Current conversion rate |
| score | integer | Audit score (0-100) |
| result | jsonb | Full audit result |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modified |

## Edge Functions

### `scrape-landing-page`
- Input: `{ url: string }`
- Output: `{ success, screenshot, markdown }`
- Uses Firecrawl API (secret: `FIRECRAWL_API_KEY`)

### `analyze-audit`
- Input: `{ screenshot, markdown, funnelStrategy, trafficSource }`
- Output: `{ success, sections[], nodes[], edges[] }`
- Uses Lovable AI (Gemini 2.5 Flash)

## Technical Details
- `src/components/audit/AuditWizard.tsx` — Wizard form
- `src/components/audit/DashboardAuditWizard.tsx` — Dashboard version
- `src/components/audit/AuditResults.tsx` — Report view
- `src/components/audit/ReadOnlyFunnelView.tsx` — Read-only funnel
- `src/components/audit/AuditList.tsx` — History
- `src/lib/api/auditAnalysis.ts` — API orchestration
- `src/lib/api/firecrawl.ts` — Scraping client

## Dependencies
- Authentication, Project Management, Assets Library, Funnel Designer
- Firecrawl connector (secret: FIRECRAWL_API_KEY)
- Lovable AI (Gemini model, no API key required)
