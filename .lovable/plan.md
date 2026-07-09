## Wijzigingen

### 1. Document aanmaken – fallback naar generiek framework
- **`CopyDocumentsModule.tsx` → `openPicker`/`createDocument`:**
  - 0 frameworks voor het type → automatisch het **Generic framework** koppelen (met `generic_copy` component). Document heeft dus altijd minstens één invulbaar component.
  - 1 framework voor het type → automatisch koppelen (huidig gedrag).
  - >1 frameworks → picker openen met keuze; extra optie **"Generic (blank)"** bovenaan zodat de gebruiker bewust generiek kan kiezen.

### 2. Nieuw document type: `generic`
- **Migratie** voegt toe:
  - `ai_action` `generate_generic_copy`: input `prompt` (textarea) + `context`; output `content` (type `richtext`, `is_primary: true`).
  - `copy_component` `generic_copy`: output_structure = `content` (richtext). UI valt terug op `GenericComponentUI`.
  - `copy_framework` **"Generic Copy"**: `type = 'generic'`, `component_slugs = ["generic_copy"]`.
- **`CopyDocumentsModule.tsx`:** extra tab **"Generic"** (icon `FileText`) in `DOCUMENT_TYPES`.
- Het Generic framework wordt óók gebruikt als fallback bij andere types zonder framework (zie punt 1), zodat je overal een werkend document krijgt.

### 3. Framework kiezen vanuit Document Settings
- **`CopyDocumentEditor.tsx` Settings-tab:**
  - "Change framework"-knop blijft; lijst frameworks gefilterd op `document.type`.
  - Als geen frameworks voor dit type → val terug op het Generic framework (dat is dan de enige optie).

### 4. Richtext (WYSIWYG) output veldtype
- **`GenericComponentUI.tsx`:** rendering voor `type: "richtext"` — grote textarea (`min-h-[400px]`) als eerste implementatie, geen nieuwe dependency.

### 5. Alle output-velden meteen tonen (ook zonder generatie)
- **`GenericComponentUI.tsx`:**
  - Render **altijd** één veld per entry in `outputStructure` (niet-image), ongeacht of `outputs[key]` bestaat of leeg is.
  - Voor `array`/`item_schema`-velden: toon 1 lege rij als default, met "Add item"-knop.
  - Image-velden blijven altijd getoond (huidige gedrag).

## Bestanden

- `supabase/migrations/…` — Generic AI action + component + framework.
- `src/components/copy/CopyDocumentsModule.tsx` — Generic tab, auto-fallback naar Generic framework, "Generic (blank)"-optie in picker.
- `src/components/copy/CopyDocumentEditor.tsx` — Framework-picker in Settings toont Generic als fallback.
- `src/components/copy/interfaces/GenericComponentUI.tsx` — Altijd outputvelden tonen + `richtext`-veldtype.

## Buiten scope

- Geen wijziging aan andere dedicated component-UI's (BigPromiseHero, PainPoints, etc.) — die renderen hun eigen structuur al altijd.
- Geen echte rich-text editor met toolbar; grote textarea nu, upgrade later indien gewenst.
