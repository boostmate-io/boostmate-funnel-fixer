# Nieuw copy-document aanmaken vanuit het funnel settings-panel

## Doel

In het settings-panel van een funnel-object (funnel page of traffic source) kun je met één klik een nieuw copy-document aanmaken dat:

- automatisch gekoppeld wordt aan die node (en aan de funnel),
- het ingestelde copy framework overneemt,
- de offer-context van de funnel overneemt,
- een zinvolle naam krijgt,
- en meteen opent in de Copy Document Editor.

## Gedrag

### Funnel pages
- Boven "Attach existing document" komt een primaire knop **"New document"**.
- Framework: het framework dat al op de node is ingesteld (`copyFrameworkId`). Is er nog geen gekozen, dan opent een kleine framework-keuze (dezelfde lijst die het panel al toont) en wordt de keuze ook op de node opgeslagen.
- Type volgt de node: `email_sequence` voor e-mailnodes, anders `sales_copy`.
- Naam: `{Funnel naam} — {Node label}`, met suffix `(2)`, `(3)` … als die naam al bestaat.
- Context: als de funnel een gekoppelde offer heeft, wordt `context_type = "offer"` en `context_offer_id` gezet; anders blijft de context leeg.
- Na aanmaken wordt de editor direct geopend via de bestaande `onOpenCopyDocument`-flow.

### Traffic sources
- Zelfde knop in `TrafficSourceDetailsPanel`, met type `meta_ad` en het actieve meta_ad-framework (dat het panel al ophaalt).
- Naam: `{Funnel naam} — {Traffic source label}`.

### Overig
- Read-only/gedeelde weergaven tonen de knop niet.
- Bestaande attach/detach/dupliceer/verwijder-functionaliteit blijft ongewijzigd.
- Na aanmaken wordt het bestaande `boostmate:funnel-copy-documents-changed` event gedispatcht zodat de node-kaart zijn documenten ververst.

## Technisch

- Nieuwe helper `src/lib/copy/createLinkedDocument.ts`: één functie die een `copy_documents`-rij insert (user_id, sub_account_id, name, type, framework_id, status `draft`, `funnel_id`, `funnel_node_id`, context-velden) en daarna de componentrijen in `copy_document_components` aanmaakt op basis van `copy_frameworks.component_slugs` (zelfde logica als `createDocument` in `CopyDocumentsModule.tsx`, inclusief de `slugs` vs `{ slugs: [] }`-vorm). Geeft het nieuwe document-id terug.
- `CopyDocumentsModule.createDocument` wordt op deze helper gezet zodat er één implementatie blijft.
- `NodeLinkedDocuments` krijgt een optionele `onCreateDocument`-knop-render, of eenvoudiger: de knop en creatie komen in `NodeLinkedDocuments` zelf, dat al `funnelId`, `subAccountId`, `userId`, `linkedOfferId`, `defaultFrameworkId`, `documentType`, `nodeLabel` en `funnelName` als props krijgt (nu deels ongebruikt). Die props worden nu benut.
- `TrafficSourceDetailsPanel` krijgt dezelfde knop met het meta_ad-framework-id (panel haalt nu alleen `name` op; ook `id` en `component_slugs` selecteren).
- `NodeDetailsPanel` geeft de node-`funnelName` en het gekozen `copyFrameworkId` door en slaat een in de dialog gekozen framework op via de bestaande `onNodeDataChange`.
