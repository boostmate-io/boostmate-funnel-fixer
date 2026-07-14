# Business Blueprint — volledig structuurdocument (PDF)

## Doel
Genereer één PDF met de volledige opbouw van de Business Blueprint zoals in de app, met per veld: label, helper-tekst en veldtype.

## Bron
Single source of truth: `supabase/functions/_shared/blueprintSchema.ts` (gebruikt door zowel UI als AI Coach). Aanvullende tab-/subblok-structuur uit:
- `src/components/business-blueprint/clarityConfig.ts` — Customer Clarity sub-blokken
- `src/components/business-blueprint/offerDesignTypes.ts` — Offer Design tabs
- `src/components/business-blueprint/growthSystemTypes.ts` — Growth System tabs
- `src/components/business-blueprint/proofAuthorityTypes.ts` — Proof & Authority

## Opbouw van het document
1. **Cover** — Titel, korte inleiding (wat is de Business Blueprint, hoe lezen).
2. **Inhoudsopgave** — Één regel per sectie.
3. **Per sectie** (Customer Clarity, Offer Design, Growth System, Proof & Authority):
   - Sectie-intro
   - Per tab / sub-blok een subsectie
   - Per veld:
     - **Label** (bold)
     - Veldtype als tag (bv. `textarea`, `tags`, `chips-multi`)
     - Helper-tekst (grijze italic)
     - Placeholder (indien aanwezig)

## Uitvoering
- Script: `/tmp/build_blueprint_doc.py`
- Parse `blueprintSchema.ts` (regex/AST-lite) om `BLUEPRINT_FIELDS` en `BLUEPRINT_SUB_BLOCKS` te lezen; fallback: `node -e` om de module in te laden en JSON te printen.
- Bouw PDF met **ReportLab** (Platypus), DejaVu Sans font voor accenten, huisstijl: primary `#6246FF`, Manrope-lookalike vet voor kopjes, Inter-lookalike body → in PDF gebruiken we DejaVu Sans/Bold als praktische equivalenten.
- Output: `/mnt/documents/business-blueprint-structuur.pdf`.

## QA
- Convert naar images met `pdftoppm`, elke pagina inspecteren op overlap, cut-off, spacing.
- Fix + re-render tot alle pagina's clean zijn.

## Aflevering
`<presentation-artifact path="business-blueprint-structuur.pdf" mime_type="application/pdf"></presentation-artifact>`
