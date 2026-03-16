# PRD: Funnel Audit

## Overzicht
AI-gestuurde audit wizard die landingspagina's analyseert, scores toekent, en automatisch sales copy assets en funnels genereert op basis van de analyse.

## Doelstellingen
- Geautomatiseerde analyse van landingspagina's
- Visuele sectie-herkenning via AI (screenshot-analyse)
- Automatische generatie van sales copy assets en funnels
- Actionable verbetervoorstellen

## Functionele Vereisten

### FR-1: Audit Wizard
- Stapsgewijs formulier met velden:
  - Landing page URL
  - E-mailadres
  - Aanbod/offer
  - Doelgroep
  - Funnel strategie
  - Traffic source
  - Maandelijks verkeer
  - Conversieratio
- Validatie per stap

### FR-2: Landingspagina Scraping
- Firecrawl API via Edge Function (`scrape-landing-page`)
- Haalt screenshot en markdown content op
- Screenshot wordt opgeslagen als base64

### FR-3: AI Analyse
- Edge Function `analyze-audit` met Google Gemini 2.5 Flash
- **Screenshot-analyse**: Visuele herkenning van pagina-secties (hero, features, testimonials, CTA, etc.)
- **Content mapping**: Scraped markdown wordt gematcht aan visuele secties
- **Funnel generatie**: Op basis van het "funnel strategie" veld wordt een funnel-structuur voorgesteld
- Output: secties (title + content) en funnel nodes/edges

### FR-4: Automatische Asset Creatie
- Na analyse wordt een `sales_copy` asset aangemaakt in de Assets Library
- Elke visueel herkende sectie wordt een `asset_section` met titel en content
- Asset wordt automatisch gekoppeld aan de eerste funnel page node

### FR-5: Automatische Funnel Creatie
- Funnel wordt aangemaakt in de Funnel Designer op basis van de strategie
- Traffic source node gebaseerd op het traffic source veld
- Funnel pages gebaseerd op de geanalyseerde strategie
- Als strategie onduidelijk is: alleen landing page node
- Sales copy asset wordt gekoppeld aan de landing page node

### FR-6: Audit Rapport
- Score gauge (0-100)
- Samenvatting van bevindingen
- Visuele weergave van de geanalyseerde funnel (read-only ReactFlow)
- Lijst van verbeterpunten

### FR-7: Audit Geschiedenis
- Lijst van alle uitgevoerde audits per project
- Klik om detail/rapport te bekijken

## Database Schema

### Tabel: `audits`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Eigenaar |
| landing_page_url | text | URL van de pagina |
| landing_page_screenshot | text | Base64 screenshot |
| landing_page_content | text | Markdown content |
| email | text | Contactemail |
| offer | text | Aanbod |
| target_audience | text | Doelgroep |
| funnel_strategy | text | Beschrijving funnelstrategie |
| traffic_source | text | Verkeersbron |
| monthly_traffic | text | Maandelijks verkeer |
| conversion_rate | text | Huidig conversiepercentage |
| score | integer | Audit score (0-100) |
| result | jsonb | Volledig audit resultaat |
| created_at | timestamptz | Aanmaakdatum |
| updated_at | timestamptz | Laatst gewijzigd |

## Edge Functions

### `scrape-landing-page`
- Input: `{ url: string }`
- Output: `{ success, screenshot, markdown }`
- Gebruikt Firecrawl API (secret: `FIRECRAWL_API_KEY`)

### `analyze-audit`
- Input: `{ screenshot, markdown, funnelStrategy, trafficSource }`
- Output: `{ success, sections[], nodes[], edges[] }`
- Gebruikt Lovable AI (Gemini 2.5 Flash)

## Technische Details
- `src/components/audit/AuditWizard.tsx` — Wizard formulier
- `src/components/audit/DashboardAuditWizard.tsx` — Dashboard versie
- `src/components/audit/AuditResults.tsx` — Rapport weergave
- `src/components/audit/ReadOnlyFunnelView.tsx` — Read-only funnel
- `src/components/audit/AuditList.tsx` — Geschiedenis
- `src/lib/api/auditAnalysis.ts` — API orchestratie
- `src/lib/api/firecrawl.ts` — Scraping client

## Afhankelijkheden
- Authenticatie, Projectbeheer, Assets Library, Funnel Designer
- Firecrawl connector (secret: FIRECRAWL_API_KEY)
- Lovable AI (Gemini model, geen API key nodig)
