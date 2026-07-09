
# Plan: Assets Library vervangen door Copy Frameworks op funnel-nodes

## Doelbeeld

- Op elke funnel-node (bv. een sales page) kan een **Copy Framework** worden gekoppeld.
- In een **(seed) template** wordt die koppeling meegenomen: bij het aanmaken van een nieuwe funnel vanuit een seed template krijgen de nodes automatisch dezelfde framework-koppeling.
- Vanuit de node-details kun je met één klik een **Copy Document** aanmaken dat:
  - het gekoppelde framework krijgt toegewezen (componenten automatisch toegevoegd);
  - automatisch het **offer van de funnel** als context krijgt (`context_type = "offer"`, `context_offer_id = funnel.offer_id`);
  - gelinkt is aan de node zodat je er later steeds terug naartoe kan navigeren.
- **Assets Library** verdwijnt volledig (menu + component + tabellen + node-koppeling).

## Wat er verandert

### 1. Datamodel (één migratie)

**Nieuwe koppeling op de node zelf** — omdat nodes in `funnels.nodes` (jsonb) leven, gebeurt de koppeling per node via twee nieuwe velden binnen `node.data`:
- `copyFrameworkId: uuid | null` — framework gekoppeld aan de node (ook in seed templates).
- `copyDocumentId: uuid | null` — het aangemaakte document voor deze node (per gebruiker/funnel-instantie).

Geen aparte tabel nodig; seed_templates gebruikt dezelfde `nodes` jsonb, dus `copyFrameworkId` reist automatisch mee bij cloning in `handle_new_user_role()`. `copyDocumentId` wordt bewust NIET meegekopieerd (documenten zijn per funnel/gebruiker).

**`copy_documents` uitbreiden**:
- `funnel_id uuid` (FK → funnels, nullable, on delete set null)
- `funnel_node_id text` (nullable) — de node-id waar het document aan hangt

**Verwijderen** (data staat momenteel los, niet in gebruik voor iets anders):
- Tabel `asset_sections` (droppen).
- Tabel `assets` (droppen).
- Kolommen `linkedAssetId`/`copySections` in bestaande funnel `nodes` jsonb → één keer strippen via UPDATE (jsonb_set / node.data cleanup).

Grants + RLS voor de nieuwe kolommen op `copy_documents` volgen bestaande policies (sub_account scoped).

### 2. Backend / seed-template flow

- `handle_new_user_role()` hoeft niet aangepast te worden: nodes worden al gekloond, dus `copyFrameworkId` reist automatisch mee. We voegen wel een expliciete stap toe om `copyDocumentId` te strippen bij het clonen, zodat elke nieuwe funnel schone documenten heeft.

### 3. Frontend

**Verwijderen:**
- `src/components/assets/` (hele map): `AssetsLibrary.tsx`, `AssetSectionsList.tsx`, `RichTextEditor.tsx`.
- `src/components/funnel-designer/CopySections.tsx`.
- Dashboard: menu-item "Assets Library", route/case in `Dashboard.tsx`, i18n keys `assets.*`.
- In `NodeDetailsPanel.tsx`: alle asset-gerelateerde logica (asset-query, "Link Sales Copy asset", `onLinkAsset`, `copySections`-rendering).

**Toevoegen aan `NodeDetailsPanel.tsx`** (nieuwe sectie "Copy Framework"):
- Dropdown "Framework koppelen" → keuze uit `copy_frameworks` (filter op relevante types).
- Preview van de componenten die dat framework bevat (read-only lijstje uit `copy_components` via `component_slugs`).
- Knop **"Copy document aanmaken"** (alleen zichtbaar als framework gekozen én nog geen `copyDocumentId`):
  - Maakt een `copy_documents`-row aan met `type = framework.type`, `funnel_id`, `funnel_node_id`, `context_type = "offer"`, `context_offer_id = funnel.offer_id` (of null fallback), `name = "{funnel.name} — {node.label}"`.
  - Vult `copy_document_components` met de componenten van het framework in `component_slugs`-volgorde.
  - Slaat `copyDocumentId` op de node op.
- Knop **"Open document"** (als `copyDocumentId` bestaat) → opent de bestaande `CopyDocumentEditor` in een dialog of navigeert naar de Copy Documents-module met deze id.
- Knop "Ontkoppelen" om `copyDocumentId` te verwijderen (document blijft bestaan in de Copy Documents-module).

**Admin-templates UI** (indien aanwezig — Template Editing Mode): dezelfde framework-dropdown wordt getoond bij nodes zodat admins de koppeling op seed templates kunnen instellen.

**Copy Documents-module**: toont per document optioneel de gelinkte funnel/node als context-label.

### 4. i18n

- Verwijder `assets.*` keys uit `en.json` en `nl.json`.
- Nieuwe keys onder `funnelDesigner.copyFramework.*` (label, choose, preview, createDocument, openDocument, unlink) — **geen `common.*` fallbacks**, altijd expliciete labels.

## Volgorde van uitvoeren

1. Migratie: kolommen toevoegen op `copy_documents`, oude asset-tabellen droppen, node.data cleanup.
2. Nieuwe UI-sectie "Copy Framework" in `NodeDetailsPanel`.
3. Aanmaak-flow copy_document + auto-koppelen offer.
4. Assets Library en `CopySections` verwijderen (Dashboard menu, routes, imports, i18n).
5. Template Editing Mode UI update (framework-dropdown zichtbaar).
6. Handmatige verificatie: nieuwe funnel vanuit seed template → framework op node → document aanmaken → offer-context zit erin.

## Technische details

- **Node-updates** blijven via bestaande `onDataChange(key, value)`-flow in `NodeDetailsPanel`, dus geen nieuw persistentie-mechanisme nodig.
- **Offer op funnel**: `funnels` heeft geen expliciete `offer_id`-kolom die ik nu heb bevestigd. In stap 3 checken en, indien afwezig, of (a) offer al ergens op de funnel bereikbaar is (bv. via brief/blueprint), of (b) een `offer_id` toevoegen aan `funnels` als aparte micro-migratie. Dit bevestig ik direct bij implementatie zodat de auto-koppeling écht werkt.
- **Cascade delete**: `copy_documents.funnel_id` op `ON DELETE SET NULL` zodat een verwijderde funnel het document niet weggooit.
- **Backwards compat**: eenmalige jsonb-cleanup in de migratie verwijdert `linkedAssetId` en `copySections` uit alle bestaande `funnels.nodes` en `seed_templates.nodes` zodat er geen dode referenties blijven.
