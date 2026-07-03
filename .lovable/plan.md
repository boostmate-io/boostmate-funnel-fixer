## Wat je nu ziet klopt

Ja, je hebt gelijk. Op dit moment staat de definitie van elk blueprint-veld **op meerdere plekken** die niets van elkaar weten:

| Locatie | Wat er in staat | Gebruikt door |
|---|---|---|
| `src/components/business-blueprint/clarityConfig.ts` | Customer Clarity velden (key, label, type, helper, placeholder, chips-opties) | UI-formulieren |
| `src/components/business-blueprint/offerDesignTypes.ts` | Offer Angle/Stack/Pricing types + defaults + progress-berekening | UI-formulieren |
| `src/components/business-blueprint/proofAuthorityTypes.ts` | Proof & Authority types | UI-formulieren |
| `src/components/business-blueprint/growthSystemTypes.ts` | Growth System types | UI-formulieren |
| `src/lib/blueprintFields.ts` | Grove groepering (avatar/pain/desire/…) voor Copy Components context | Copy generator |
| `supabase/functions/coach-chat/index.ts` — `BLUEPRINT_FIELD_META`, `BLUEPRINT_FIELD_PATHS`, `BLUEPRINT_SUB_BLOCK_PATHS`, `BLUEPRINT_SUB_BLOCK_ALIASES` | Path, kind, label, aliases, sub-block mapping | AI Coach edge function |

De edge function draait op Deno en kan niet zomaar uit `src/…` importeren, dus is de veld-info dáár gewoon overgetypt. Elk nieuw veld of hernoemd veld = **twee plekken bijwerken** (UI-config + coach edge function). Voor Offer Angle merkte je dat net: de coach kende die velden simpelweg niet omdat ze nog niet in `coach-chat/index.ts` stonden.

## Voorstel: één gedeeld blueprint-schema

Extraheer alle veld-metadata naar één puur data-bestand dat zowel Vite (frontend) als Deno (edge function) kan lezen. Icons, chips-opties met React-componenten en business-type personalisatie blijven in de frontend; het gedeelde bestand bevat alleen data.

### Nieuwe structuur

```text
supabase/functions/_shared/
  blueprintSchema.ts        ← nieuwe single source of truth (pure data, geen imports)

src/components/business-blueprint/
  clarityConfig.ts          ← importeert velddefs uit blueprintSchema, voegt icons/copy toe
  offerDesignTypes.ts       ← types blijven, defaults/progress halen paden uit schema
  …

supabase/functions/coach-chat/index.ts
  ← BLUEPRINT_FIELD_META, PATHS-string, SUB_BLOCK_PATHS, ALIASES worden GEGENEREERD
    uit blueprintSchema in plaats van hand-gedefinieerd
```

Vite-alias `@shared → supabase/functions/_shared` zodat de frontend het bestand kan importeren zonder relatieve `../../../` paden.

### Vorm van het gedeelde schema

```ts
// supabase/functions/_shared/blueprintSchema.ts
export type FieldKind = "text" | "textarea" | "tags" | "chips" | "number" | "structured";

export interface BlueprintFieldDef {
  path: string;              // "customer_clarity.avatar_who"
  label: string;             // "Who is your ideal client"
  helper?: string;
  placeholder?: string;
  kind: FieldKind;
  aliases: string[];         // voor coach intent-matching
  aiWritable: boolean;       // false voor structured builders (framework, core_promise, …)
}

export interface BlueprintSubBlockDef {
  id: string;                // "avatar", "pain", "offer_angle", …
  tabId: string;             // "customer_clarity", "offer_design", …
  label: string;             // "Ideal Client Avatar"
  aliases: string[];         // "avatar", "icp", "ideale klant", …
  fieldPaths: string[];      // paden binnen dit sub-block
}

export const BLUEPRINT_FIELDS: BlueprintFieldDef[] = [ … ];
export const BLUEPRINT_SUB_BLOCKS: BlueprintSubBlockDef[] = [ … ];
```

### Gevolgen per consument

- **`clarityConfig.ts`** haalt path/kind/label/aliases uit het schema en laagt UI-only zaken erover (icons, per-business-type placeholders via `getFieldCopy`).
- **`offerDesignTypes.ts`** houdt zijn TS-types en helpers; alleen de field-lijst voor de coach/writer komt uit het schema (bron voor "welke velden bestaan in de angle-tab").
- **`blueprintFields.ts`** (copy generator) mag blijven als coarse groepering, maar kan de veld-slugs valideren tegen het schema zodat een typefout onmiddellijk crasht.
- **`coach-chat/index.ts`** stopt met hand-onderhouden `BLUEPRINT_FIELD_META` etc. — die worden afgeleid:
  - `BLUEPRINT_FIELD_META` = map van `path → {kind, label, aliases}` uit het schema
  - `BLUEPRINT_FIELD_PATHS` (de prompt-tekst voor het model) = automatisch samengesteld: per veld één regel `path — kind — label (helper)`
  - `BLUEPRINT_SUB_BLOCK_PATHS` + `_ALIASES` = uit `BLUEPRINT_SUB_BLOCKS`
  - `sanitizeBlueprintWrites` weigert automatisch schrijfacties naar `aiWritable: false` paden (framework, core_promise, …).

### Migratiestappen (in volgorde)

1. Bouw `supabase/functions/_shared/blueprintSchema.ts` en vul het met **alle bestaande velden** die vandaag in `clarityConfig.ts`, `offerDesignTypes.ts`, `proofAuthorityTypes.ts`, `growthSystemTypes.ts` en de coach-function staan. Meteen dekkend, niet stukje bij beetje.
2. Vite-alias toevoegen (`vite.config.ts`) zodat `@shared/blueprintSchema` werkt.
3. `coach-chat/index.ts` refactoren: verwijder `BLUEPRINT_FIELD_META`, `BLUEPRINT_FIELD_PATHS`, `BLUEPRINT_SUB_BLOCK_PATHS`, `BLUEPRINT_SUB_BLOCK_ALIASES` en genereer ze uit het schema.
4. `clarityConfig.ts` refactoren zodat het per veld het schema-record ophaalt in plaats van label/type hard te coderen.
5. Runtime-test: coach vragen om Avatar, Pain & Friction, Desire & Goals, Offer Angle-velden in te vullen; controleer dat alle voorgestelde paden echt bestaan en dat structured velden geweigerd worden.
6. Optioneel: unit-test die valideert dat elk `BLUEPRINT_FIELDS[i].path` in de TypeScript-types voorkomt (voorkomt dat schema en types uit elkaar lopen).

### Wat je hierna wint

- **Één plek** om een veld toe te voegen, hernoemen of verwijderen. UI én AI coach volgen automatisch.
- Nieuwe tabs (Proof & Authority, Growth System, …) werken meteen in de coach zodra hun velden in het schema staan — geen tweede rondje meer door de edge function.
- Aliases (NL/EN synoniemen) worden op één plek beheerd, in dezelfde regel als het veld zelf.
- `aiWritable: false` voorkomt dat de coach ooit nog gaat "verzinnen" voor structured builders.

### Buiten scope van deze plan-stap

- Runtime-schema in de database (optie C). Kan later als admins zelf velden willen toevoegen zonder deploy — vandaag onnodige complexiteit.
- Auto-generatie van TypeScript types uit het schema. Handmatig gesynchroniseerd is prima zolang je één file per verandering aanraakt.
