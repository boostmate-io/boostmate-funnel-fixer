

# Plan: Landing Page Screenshot, Content Opslag & Funnel Visualisaties in Audit

## Wat we bouwen

1. **Firecrawl integratie** -- scrape de landing page URL voor screenshot + markdown content
2. **Database uitbreiding** -- extra kolommen op `audits` tabel voor `landing_page_screenshot`, `landing_page_content`
3. **Funnel visualisaties in audit result** -- read-only ReactFlow canvassen voor huidige en geoptimaliseerde funnel
4. **AuditResult type uitbreiden** -- funnel nodes/edges toevoegen aan het result object
5. **AuditResults component updaten** -- screenshot tonen + twee read-only funnel diagrammen

## Technische aanpak

### 1. Firecrawl Connector koppelen
- Firecrawl connector activeren via `standard_connectors--connect`
- Edge function `firecrawl-scrape` aanmaken die screenshot + markdown ophaalt

### 2. Database migratie
```sql
ALTER TABLE public.audits
  ADD COLUMN landing_page_screenshot text DEFAULT '',
  ADD COLUMN landing_page_content text DEFAULT '';
```

### 3. AuditResult type uitbreiden
Nieuwe velden toevoegen aan `AuditResult`:
```typescript
currentFunnel: { nodes: Node[]; edges: Edge[] };
optimizedFunnel: { nodes: Node[]; edges: Edge[] };
```

En aan de audit save flow: `landing_page_screenshot` en `landing_page_content`.

### 4. Edge function `scrape-landing-page`
- Roept Firecrawl aan met formats `['markdown', 'screenshot']`
- Geeft screenshot (base64) en markdown content terug
- Wordt aangeroepen tijdens de "analyzing" fase

### 5. Mock data updaten
De mock result uitbreiden met funnel nodes/edges die de beschreven strategie visueel voorstellen (hergebruik van bestaande `FUNNEL_PAGES` en `TRAFFIC_SOURCES` constanten).

### 6. Read-only Funnel Viewer component
- Nieuw component `ReadOnlyFunnelView` -- gebruikt ReactFlow met:
  - `nodesDraggable={false}`
  - `nodesConnectable={false}`
  - `elementsSelectable={false}`
  - `panOnDrag={true}`, `zoomOnScroll={true}`
  - Geen Controls/ElementsPanel
  - Hergebruikt bestaande `FunnelNode` en `TrafficSourceNode` componenten
- Compact formaat, past in een card binnen het audit verslag

### 7. AuditResults component uitbreiden
Drie nieuwe secties toevoegen:
1. **Landing Page Screenshot** -- `<img>` met de base64 screenshot, in een card met border
2. **Huidige Funnel** -- `ReadOnlyFunnelView` met `result.currentFunnel`
3. **Geoptimaliseerde Funnel** -- `ReadOnlyFunnelView` met `result.optimizedFunnel`

De funnel visualisaties komen naast de bestaande strategie-beschrijvingen (currentStrategy / optimizedStrategy cards).

### 8. DashboardAuditWizard & Index.tsx flow
- Tijdens de "analyzing" fase: call de `scrape-landing-page` edge function
- Sla screenshot + content op in de audit record
- Pass het volledige result (incl. funnel data) door naar `AuditResults`

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/types/audit.ts` | Funnel nodes/edges + screenshot/content velden |
| `src/components/audit/AuditResults.tsx` | Screenshot sectie + 2x ReadOnlyFunnelView |
| `src/components/audit/ReadOnlyFunnelView.tsx` | **Nieuw** -- read-only ReactFlow wrapper |
| `src/components/audit/DashboardAuditWizard.tsx` | Firecrawl call + uitgebreide mock data + save |
| `src/pages/Index.tsx` | Firecrawl call + uitgebreide mock data + save |
| `supabase/functions/scrape-landing-page/index.ts` | **Nieuw** -- Firecrawl edge function |
| `supabase/config.toml` | Nieuwe function registratie |
| DB migratie | 2 kolommen toevoegen aan audits |

## Volgorde van implementatie

1. Firecrawl connector koppelen
2. Database migratie uitvoeren
3. Edge function voor scraping aanmaken
4. Types uitbreiden
5. ReadOnlyFunnelView component bouwen
6. AuditResults updaten met screenshot + funnels
7. DashboardAuditWizard en Index.tsx flows aanpassen
8. Mock funnel data toevoegen
9. i18n labels toevoegen

