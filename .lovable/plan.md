# Business Blueprint PDF v2 — correcte, volledige structuur

## Wat er mis was in v1
- **Offer Ecosystem** tab ontbrak volledig (6 tiers met offers).
- **Funnel Architecture** tab ontbrak (offer → funnel mapping).
- Repeatable secties (deliverables, bonuses, milestones, resources, support channels, payment plans, framework pillars, ecosystem offers) werden weergegeven als "3 slots" i.p.v. als **lijst met onbeperkt items** en één item-template.

## Bronnen (uitgebreid)
- `supabase/functions/_shared/blueprintSchema.ts` — enkelvoudige AI-velden
- `src/components/business-blueprint/offerDesignTypes.ts` — Offer Angle/Stack/Pricing/Ecosystem inclusief tier-definities en delivery library
- `src/components/business-blueprint/growthSystemTypes.ts` — Acquisition/Architecture/Ascension incl. FUNNEL_TYPES, TRAFFIC_SOURCE_OPTIONS, LEAD_CAPTURE_OPTIONS
- `src/components/business-blueprint/proofAuthorityTypes.ts` — Proof & Authority
- `src/components/business-blueprint/clarityConfig.ts` — Customer Clarity sub-blokken

## Nieuwe opbouw per veldtype
Elk veld krijgt een duidelijke **kind-tag**:
- `single` → één invulveld (label + helper + type)
- `choice` → één keuze uit vaste optielijst (opties opgesomd)
- `multi-choice` → meerdere keuzes uit vaste optielijst (opties opgesomd) + "eigen items mogelijk" indien van toepassing
- `list` → **lijst met onbeperkt items**; wordt weergegeven als:
  - Sectie-uitleg: "Voeg zoveel items toe als nodig. Per item vul je in:"
  - Item-template: sub-velden (label + helper + type) één keer beschreven

Zo geen "3 opties" meer — één item-template die aangeeft dat de sectie herhaalbaar is.

## Volledige inhoudsopgave PDF

1. **Cover + inleiding + inhoudsopgave**
2. **Customer Clarity** — Avatar, Pain & Friction, Desire & Goals, Transformation (alle enkelvoudige velden)
3. **Offer Design**
   - Offer Angle: main offer name, short description, core outcome, 4-part differentiation, **Signature Framework** (naam + beschrijving + `list` van pillars), Core Transformation Promise (outcome + timeframe-choice + guarantee)
   - Offer Stack: **Deliverables** (list), **Resources** (list), **Support Channels** (list), **Bonuses** (list), delivery timeline (choice), **Milestones** (list) — met verwijzing naar Delivery Library (5 categorieën, opgesomd)
   - Pricing: core price, **Payment Plans** (list met type-choice), Recurring Offer (structured), Premium Upgrade (structured), Guarantee (choice + details)
   - **Offer Ecosystem** (NIEUW): uitleg dat dit een lijst van offers per tier is; per tier (Free, Low Ticket, Mid Ticket, Core, Premium, Continuity): beschrijving + voorbeelden + "voeg meerdere offers toe" + item-template (naam, beschrijving, prijs, etc.)
4. **Growth System**
   - Acquisition: traffic sources (multi-choice + opties), primary entry offer (verwijzing), lead capture method (choice + opties)
   - **Funnel Architecture** (NIEUW): uitleg dat dit een lijst van offer→funnel mappings is; item-template (offer, funnel_type-choice met alle 6 FUNNEL_TYPES opgesomd, purpose, traffic sources, next offer)
   - Ascension: next offer after core, retention offer, referral toggle + description, reactivation toggle + description
5. **Proof & Authority** — alle velden per sub-blok

## Uitvoering
- Script: `/tmp/build_bp_pdf_v2.py`
- Data: importeer direct uit de TypeScript-bronnen via `bun` dump-script (voor de constanten/tier-lijsten) + reuse van `blueprintSchema.ts` JSON.
- Styling: zelfde als v1 (DejaVu Sans, primary `#6246FF`, A4).
- **List-blok** krijgt een duidelijke visuele stijl (bijv. licht-gearceerde box met "Herhaalbaar" chip) zodat je meteen ziet dat het geen 3 losse velden is.
- QA: `pdftoppm` op elke pagina, inspecteer op overlap/cutoff/spacing.

## Aflevering
`/mnt/documents/business-blueprint-structuur-v2.pdf` (naast v1, zodat je ze kunt vergelijken).
