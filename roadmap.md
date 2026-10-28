# Roadmap — Offer Design redesign

## Documentation step-by-step mode
- [ ] Save optional lesson setting (default off)
- [ ] HR steps, full-lesson TOC, URL/history navigation
- [ ] Local manual completion and resume
- [ ] Tests and desktop/mobile end-to-end verification

- [x] Step 1 (UI): read-only Offer Ecosystem cards
- [x] Registry Step 1a–1d: baseline tests, optional metadata, editor-only fields, OFFER_ITEM_FIELDS / offerRelativePath / fieldsForTier, drift tests
- [x] Task A: Coach writes scoped to the open additional Core Offer; Section Help hidden there
- [x] Task B: toFieldDef forwards registry editor metadata
- [x] Offer Editor shell (3 tabs, 1200px / 92vh desktop, fullscreen mobile)
- [x] Companion Coach above editor; keyboard/mobile interaction, safe close, regression tests and signed-in layout verification
- [ ] Final real-AI Apply / refresh and physical mobile keyboard checks (manual verification checklist; mocked Apply regression passes)
- [ ] Link tabs to registry (simple fields first)
- [x] Universal Offer Editor for all six categories; Offer Design opens on the Ecosystem
- [ ] Coach writes targeted at specific offers; expose recurring/premium fields to Coach
- [ ] Irresistible Offer Builder
- [x] Final field matrix for six offer categories (approved)
- [x] Offer architecture cleanup (options from registry, row type, OfferTier, audits)
- [x] Tier-aware registry layouts for six categories
- [x] Low-Ticket editor in the Universal Offer Editor
- [x] Free, Mid-Ticket, Premium, Continuity editors
- [x] Relationships Phase 1: workspace integrity, admin RLS, registry slots, hook guards
- [x] Relationships Phase 2: editor Ecosystem section
- [x] Relationships Phase 3: card summaries, Customer Journey overview, optional offer linking in route wizard; legacy AddRouteDialog removed
