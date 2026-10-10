# Universal Offer Editor — six offer categories (analysis and plan)

Planning only. No code, UI, schema or Coach changes until approved.

## 1. Current editor architecture

```text
OfferEcosystemTab
 ├─ OfferSummaryCard (read-only, any tier)            reusable
 ├─ tier === "core" → CoreOfferDialog
 │     └─ OfferEditorShell (tabs, save status, flush) reusable
 │         └─ tabs = fieldsForTier("core") → Angle / Stack / Pricing (hardcoded map)
 └─ other tiers → simple Dialog + OfferFieldsEditor (5 hand-written fields)
Storage: Primary → business_blueprints.offer_stack
         every other offer → offers row (summary in data.*, Core design in data.design)
Coach:   scopedOfferWrites → only offer_stack.{angle,stack,pricing}.*
         offerContext → Core-shaped angle checks; other tiers summarized only
```

Reusable as-is: OfferEditorShell, OfferSummaryCard, offerEditorField/offerEditorList, offerRelativePath, the repository/debounced queue, active-offer verification, attribution guard.

Core-coupled:
- `fieldsForTier()`: every non-core tier gets zero sub-blocks by construction (all three are `appliesToTiers: ["core"]`).
- CoreOfferDialog: calls `fieldsForTier("core")`, has a fixed tab map and the "Core Offer" label.
- OfferEcosystemTab: tier branch in `openEditor`, the hand-written OfferFieldsEditor (not registry-driven), and Core-only `dialogInitial`.
- The three tabs are written against `OfferDesignData`. Their copy is labelled for the Primary ("Main Offer Name", "The headline price for your main offer.").
- `scopedOfferWrites`, `isOfferUndefined` and `renderActiveOfferSection` assume the Core schema.
- `EcosystemOfferRow.data` type omits `design`; it is read via `any`.
- `offer_relationships` exists but is only used by Growth Architecture, not by the editor.

## 2. Proposed configuration per category

Approach: reuse the same three sub-blocks and choose **which fields/lists** apply per tier, instead of new tabs. "Req" = needed for the card/progress; everything else optional.

| Area | Free | Low-Ticket | Mid-Ticket | Core | Premium | Continuity |
|---|---|---|---|---|---|---|
| Name, short description | Req | Req | Req | Req | Req | Req |
| Core outcome / promise | Req | Req | Req | Req | Req | Req |
| Problem solved / quick win (new) | Req | Req | opt | — | — | — |
| Better Results / Faster / Easier | — | opt (1) | opt | full | full | — |
| New Vehicle, Signature Framework | — | — | opt | full | opt (reuses Core) | — |
| Deliverables list | 1–2 (format) | 1–3 | full | full | full | per-cycle |
| Resources list | opt | opt | opt | full | opt | opt |
| Support System | — | — | opt | full | full (access level) | full |
| Bonuses | — | opt (order bump) | opt | full | opt | — |
| Milestones / Delivery Timeline | — | — | opt | full | opt | — |
| Price | none (free) | Req | Req | Req | Req | Req recurring |
| Payment plans | — | — | opt | full | full | — |
| Guarantee | — | opt | opt | full | opt | cancel terms |
| Billing interval, ongoing value | — | — | — | — | — | Req (existing recurring fields) |
| Delivery types | Req | Req | Req | Req | Req | Req |
| Ecosystem role (new) | leads into | ascends to | ascends to | primary/alt | upgrade from | retention |

Tabs per tier: Free and Low-Ticket get **one** "Offer" tab (fields drawn from Angle/Stack/Pricing). Mid-Ticket and Premium get Angle/Stack/Pricing with fewer fields. Continuity gets Angle + "Membership" (stack fields per cycle) + Pricing (recurring). Core is unchanged.

## 3. Missing registry definitions

- Per-field/list tier applicability (today only per sub-block): optional `appliesToTiers` on fields and lists, defaulting to the sub-block value. Core outputs stay identical.
- Per-tier editor copy overrides (e.g. "Offer Name" instead of "Main Offer Name") as additive `editor.byTier`.
- New editor-level fields: `problem_solved` / `quick_win` (Free, Low), `lead_magnet_format` (Free, enum), `access_level` (Premium), `cancellation_terms` (Continuity), `ecosystem_role` relationship (rendered from offer_relationships, not stored in design).
- Reuse the existing Continuity fields: `recurring_offer.monthly_price`, `interval`, `ongoing_value`.
- A per-tier "tab layout" description (which sub-block fields form which tab) in the registry, so `fieldsForTier(tier)` returns tabs for every tier.

## 4. Data storage and compatibility

- Keep the existing split: the Primary stays in Blueprint storage; all other offers keep their row and ID, and their extended design goes into `offers.data.design` (same shape as Core, with only the applicable keys filled). No schema change needed.
- Summary fields (`data.description`, `core_outcome`, `price`, `delivery_types`) remain the card/funnel source. When a design exists, keep them synced from it with one owner (the repository), as the Primary sync does — never two writers.
- Risks:
  - Existing non-core rows have no `design`. Seed it on first open from the summary fields, without writing until the user edits.
  - The `data.price` vs `design.pricing.core_price` overlap needs one rule: design wins and the summary is updated.
  - Changing a tier on an existing offer must keep its ID and funnel links. Hide but keep data for fields that don't apply to the new tier.
  - Fix the `EcosystemOfferRow.data` type to include `design`.
- Relationships: use `offer_relationships` (already secured by workspace) rather than new design fields.

## 5. AI Coach considerations

- Active-offer context already carries `tier`. Extend server verification to non-core rows with no other change.
- `scopedOfferWrites`: replace the fixed `angle|stack|pricing` set with "path is in `fieldsForTier(row.tier)`". This is a tier guard derived from the registry and stricter than today.
- `isOfferUndefined` needs per-tier defining fields (e.g. Free: description + outcome + format).
- Keep the editor-only fields (recurring/premium) non-writable until a separate approval; Continuity would need them writable.
- History isolation and attribution already work by offer ID and need no tier change.
- Section Help stays hidden for non-primary offers until per-tier section prompts exist.

## 6. Remaining duplicated metadata

- **Remove:**
  - `PAYMENT_PLAN_TYPES` / `GUARANTEE_OPTIONS` in offerDesignTypes: point them at the registry editor options.
  - Hand-written labels in OfferFieldsEditor: use `OFFER_ITEM_FIELDS`.
  - The older `src/lib/blueprintFields.ts` list: audit its consumers.
  - The local `OfferTier` copy in offerContext.ts: import from the registry.
- **Keep, guarded by tests:** `coachItemFields`, the separate list-Coach wording.
- **Legitimate presentation:** tab titles/descriptions, progress feedback messages, icons.
- **Specialized UI (stay in components):** delivery-type picker, quick-add chips, frequency options, currency inputs, plan-type normalization, timeline controls.

## 7. Incremental roadmap

1. Cleanup: remove the true duplicates above and fix the row type. Tests only, no visible change.
2. Registry: optional field/list `appliesToTiers` and per-tier tab layout, plus copy overrides. Core snapshot tests must stay byte-identical.
3. Make CoreOfferDialog tier-driven (rename to OfferDialog): tabs from `fieldsForTier(tier)`; tabs hide fields that don't apply. Core unchanged.
4. First non-core tier: **Low-Ticket**, Coach off. Seed design from summary; one summary sync owner. Verify cards, funnel links and IDs.
5. Free, Mid-Ticket and Premium, one at a time.
6. Continuity, including the recurring-field decision.
7. Coach per tier: tier-aware write guard, undefined detection, then field/list help per tier.
8. Ecosystem role/relationships in the editor using `offer_relationships`.
9. Retire OfferFieldsEditor.

## 8. Decisions needed

1. Approve the per-tier field matrix above (especially Mid-Ticket vs Premium depth).
2. Should the simple tiers (Free, Low) use a single tab or the three-tab layout with fewer fields?
3. Summary vs design: confirm "design is the source; summary is synced from it".
4. Tier change on an existing offer: keep hidden data (recommended) or clear it?
5. Continuity: make the recurring fields AI-writable when Continuity is supported?
6. Should progress per non-core tier count toward Blueprint progress? (Today it doesn't.)
7. Show ecosystem relationships inside the editor, or keep them only in Growth Architecture?
