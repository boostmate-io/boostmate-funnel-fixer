# Plan: Framework-driven Copy Documents + Meta Ads + Grid view

## 1. Document = framework (data + UX)

### Schema
- `copy_documents.framework_id uuid references copy_frameworks(id)` — nullable, gezet op alle nieuwe documenten.

### Editor (`CopyDocumentEditor.tsx`)
- Settings tab: **weg** → "Add Component"-dropdown, per-component up/down/delete, "Save as Framework".
- Settings tab: **blijft** → naam, context source, global instructions.
- Settings tab: **nieuw** → read-only regel "Framework: {naam}" + knop "Change framework". Bij wisselen: bevestigen, dan alle huidige `copy_document_components` vervangen door de componenten van het nieuwe framework.
- Builder tab: componentlijst komt uit het framework in vaste volgorde. Geen manuele add/remove/reorder.
- Empty state: als document geen framework heeft (legacy), toon "Kies een framework in Settings".

### Copy Documents module (`CopyDocumentsModule.tsx`)
- "New Document" opent klein dialog: framework kiezen binnen het actieve type. Als er maar één framework in dat type bestaat → direct aanmaken.
- Bij aanmaak: `type` + `framework_id` invullen en meteen `copy_document_components`-rijen invoegen op basis van `framework.component_slugs`.

### Funnel-node aanmaak (`NodeLinkedDocuments.tsx`)
- `framework_id` mee opslaan (component-slugs worden al ingevoegd — enkel `framework_id`-veld toevoegen).

## 2. Meta Ads: framework + component + AI action seeden

Dit doen we via een migratie zodat je niets manueel hoeft te configureren.

### AI action `generate_meta_ad`
- `type`: `generation`
- Genereert een volledige Meta Ad in één call.
- `output_structure` (voor tool schema, image wordt gefilterd door edge function):
  - `ad_angle` (text) — hoek/kern-idee
  - `primary_texts` (array van text) — 3 varianten
  - `headlines` (array van text) — 5 varianten (Meta max 40 tekens per stuk)
  - `description` (text)
  - `cta_label` (text) — bv. "Learn More", "Sign Up"
  - `image_brief` (text) — beschrijving van gewenste visual voor de designer
- `input_structure`: context (offer/custom), `campaign_goal`, `target_audience`, `key_promise`, `must_include` (optioneel).
- Instructies: directe DR-copy, benefits over features, houd headlines onder 40 chars, primary_text 90-125 chars sweet spot, geen clickbait, native tone.

### Copy component `meta_ad`
- `slug: meta_ad`, `ai_action_slug: generate_meta_ad`, `ui_interface_slug: generic`.
- `icon: Megaphone`.
- `output_structure`: bovenstaande velden **+** `creative` (type `image`, `is_primary: true`) — image wordt niet door AI ingevuld, wordt door user geüpload.
- `required_blueprint_fields`: `["offer_design", "customer_clarity"]` (voor context als er geen offer gekoppeld is).

### Copy framework "Meta Ad Copy"
- `type: meta_ad`
- `component_slugs: ["meta_ad"]`
- `is_active: true`

### `DOCUMENT_TYPES` in `CopyDocumentsModule.tsx`
- Regel toevoegen: `{ type: "meta_ad", icon: Megaphone, label: "Meta Ads" }`.

## 3. Grid view in Copy Documents module

De bestaande verticale lijst (`CopyDocumentsModule.tsx`) vervangen door een **card-grid** met dezelfde look-and-feel als `LinkedDocumentsGrid`:

- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- Elke kaart: thumbnail (aspect-video) via `resolveDocumentThumbnail` (dezelfde helper als op funnel-nodes — pakt automatisch het eerste `image`-veld uit het document, valt terug op framework-icon + gradient).
- Onder de thumbnail: titel, framework-label, status pill (draft/ready/shipped), laatst-bijgewerkt tijd.
- Kaart-menu (⋯): Open, Delete. Klik op de kaart zelf = openen.
- "New Document"-knop rechtsboven, opent framework-picker (zie §1).

Om code-duplicatie te vermijden: `LinkedDocumentsGrid` blijft gebruikt worden, maar met een lichte uitbreiding zodat hij ook zonder `funnel_node_id`-context bruikbaar is (props `onCreate` optioneel maken en `readOnly=false` toestaan zonder detach-actie). Copy Documents module gebruikt dezelfde grid-component met eigen fetch (op `sub_account_id + type`).

## 4. Bestanden

- `supabase/migrations/…` — kolom `framework_id` op `copy_documents` + seed rows voor `ai_actions`, `copy_components`, `copy_frameworks` (Meta Ads).
- `src/components/copy/CopyDocumentsModule.tsx` — grid + framework-picker + `meta_ad` tab.
- `src/components/copy/CopyDocumentEditor.tsx` — Settings component-management weg, "Change framework" toevoegen, `framework_id` opslaan.
- `src/components/copy/linked/LinkedDocumentsGrid.tsx` — kleine props-aanpassing zodat generiek herbruikbaar (zonder detach).
- `src/components/copy/linked/NodeLinkedDocuments.tsx` — `framework_id` mee opslaan bij insert.
- `src/i18n/en.json` + `nl.json` — Meta Ads label + nieuwe strings.

## Buiten scope

- Bestaande documenten migreren (blijven werken; `framework_id` blijft null tot je ze opent en een framework kiest via "Change framework").
- Andere content types (LinkedIn ads, email, VSL) — dezelfde methode werkt, maar wordt later apart geseed.
