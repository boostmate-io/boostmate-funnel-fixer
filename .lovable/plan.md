# Plan: Universal Offer Editor, built from the Core Offer editor

Planning only. No database changes, no change to the simple-tier popup, and no second field-definition system. Every step can ship on its own and keeps today's behaviour.

## Current state

- **`CoreOfferDialog`** shows Angle, Stack and Pricing stacked in one scroll (`embedded` mode). It reads its data once when it opens and calls `onChange` with the full design on every edit.
- **Where data goes:** the primary offer is written to the Blueprint (`onChangeOfferDesign`), and `usePrimaryOfferSync` then updates the offer record. Extra Core offers are written to `offers.data.design` plus their summary (`designToRowValues` → `updateEcosystemOffer`, with a short save delay).
- **Coach entry points in the tabs:**
  - field Coach and list Coach go through `useOfferCoach`;
  - section help goes through `SectionHelpCoach`.
- **Coach risk found:** when the Coach's open request has no `onApplyBlueprintWrites`, `GlobalCoachBubble` falls back to `applyBlueprintWrites(subAccount, writes)`. That fallback writes `offer_stack.*` to the Blueprint, i.e. the Primary offer. It's reachable from field-mode Coach proposals and from `SectionHelpCoach` while an extra Core offer is open. This must be closed in step 3, before anything else touches extra Core offers.

## Components

| New | Purpose |
|---|---|
| `offer/editor/OfferEditorShell.tsx` | Popup shell: header (title, tier label, Primary badge), configurable tabs, scrolling body, save status, Done/close handling. Knows nothing about fields. |
| `offer/editor/OfferEditorContext.tsx` | Provides `{ offerRef, tier, isPrimary, coachMode }` to everything inside the editor. |
| `offer/editor/useOfferEditorState.ts` | Holds the working copy, saves through the offer data layer, and exposes `status: idle / saving / saved / error` plus `flush()`. Reloads from outside changes (Coach) without overwriting fields being typed in. |
| `offer/editor/coreTabs.ts` | Core tab config built from `fieldsForTier("core").subBlocks` (angle → stack → pricing) plus each tab's component and progress function. |

| Refactored | Change |
|---|---|
| `registryUi.ts` | `toFieldDef` also passes `valueType`, `enumValues`, `control`, `editorOnly` (optional). Existing outputs stay the same. |
| `CoreOfferDialog.tsx` | Becomes a thin wrapper: `OfferEditorShell` + the Core tabs. Keeps the same props during the transition. |
| `useOfferCoach.tsx`, `SectionHelpCoach.tsx` | Read `OfferEditorContext`. On extra Core offers, Coach writes are routed to the current offer or blocked (step 3). |
| `offerRepository.ts` | Small `saveOfferDesign(ref, design)` that hides the primary vs extra difference. It already exists; the editor will use it. |

**Reused unchanged:** `OfferAngleTab`, `OfferStackTab`, `PricingTab` (`embedded` mode), `FrameworkSection`, `DeliveryTypePicker`, the builder cards, `AngleField`, `CoachIconButton`, `usePrimaryOfferSync`, `useEcosystemOffers`, the summary helper, and all progress functions.

## Steps

### Step 1: pass the new details through `toFieldDef`
- Add the optional `valueType`, `enumValues`, `control`, `editorOnly` to the returned field description. No caller reads them yet.
- **Done when:**
  - the Clarity, Brand and Proof screens look and behave the same (their field descriptions are snapshot-tested);
  - the 31 existing tests pass.

### Step 2: the editor shell, wrapping today's popup
- Build `OfferEditorShell`, then switch `CoreOfferDialog` to it with three tabs (Angle / Stack / Pricing) instead of one long scroll.
- Each tab shows its progress % using the existing functions. Tabs are only hidden, never unmounted while the editor is open, so typing and list state survive tab switches.
- **Footer** shows "Saving…", "Saved" or "Not saved, retry". Done saves first:
  - extra Core offers call `flushOffer`;
  - primary offers rely on the Blueprint autosave and show its `saving` flag.
- **Desktop:** about 1200px wide, 92% screen height. **Mobile:** full screen with tabs that scroll sideways.
- Optional `initialTab` prop (no callers yet).
- **Done when:**
  - every field from the stacked popup is present in exactly one tab;
  - edits to the primary offer reach the Blueprint and the offer record (sync unchanged);
  - edits to an extra Core offer reach `data.design` and its summary;
  - closing during a pending save keeps the edit;
  - progress numbers in the tabs and the section header are unchanged;
  - no other screen changes.

### Step 3: protect the Primary offer while editing an extra Core offer (before any further change)
- `OfferEditorContext.coachMode`:
  - `"primary"`: today's behaviour;
  - `"scoped"`: an extra Core offer.
- **In scoped mode:**
  - field and list Coach keep working, because they already apply through local callbacks to the open offer;
  - every Coach request also gets an `onApplyBlueprintWrites` that only accepts `offer_stack.*` paths and writes them into the open offer's working copy. It never calls `applyBlueprintWrites`, so the global fallback can't be reached;
  - `SectionHelpCoach` (explain/walkthrough) is hidden, or shown read-only with no writes (decision below);
  - the Coach's context shows this offer's design, not the primary offer's.
- **Done when (tests):**
  - with a scoped editor open, a Coach proposal for `offer_stack.pricing.core_price` changes the open offer and leaves the Blueprint untouched;
  - in primary mode the behaviour is byte-identical to today;
  - no path in scoped mode reaches `applyBlueprintWrites`.

### Step 4: one entry point for opening the editor, with tab support
- `openOfferEditor({ offerId | "primary", tab? })`, built on the existing `boostmate:open-offer-design` link with an optional `tab` added. Sidebar, Coach and funnel links keep working; without `tab`, Angle opens.
- `"primary"` uses the primary record, or the Blueprint data if no record exists yet.
- **Done when:**
  - every existing link opens the same offer as before;
  - `{ offerId: "primary", tab: "pricing" }` opens straight on Pricing.

### Step 5: link the tabs to the field list, simple fields first
- Inside each tab, swap fixed labels, helpers and placeholders of simple text fields for registry lookups (`offerDesignFieldsForEditor()` / `toFieldDef`). Keep the same components and layout.
- Order: Angle text fields → framework name/description → guarantee details → stack timeline → pricing core price / guarantee type (using `enumValues`).
- Lists (pillars, deliverables, bonuses, milestones, payment plans) and special controls stay as they are; only their labels/helpers may come from the list's item fields.
- Coach ids already match registry paths (drift test); they are then read from the field list too.
- **Done when (per sub-block, its own change):**
  - screenshot comparison shows the same text and layout;
  - the drift test count of hand-written paths goes down;
  - Coach prompts are byte-identical;
  - progress is unchanged.

### Step 6: ready for other categories (no visible change)
- `OfferEditorShell` gets its tabs from `fieldsForTier(tier)`. Only Core has tabs today; other tiers keep the simple popup until you choose to switch them.
- The future Irresistible Offer Builder reuses `OfferEditorContext`, `useOfferEditorState` and the same tab components in a guided layout.
- **Done when:** `fieldsForTier` drives the Core tab list, and changing a tier's `appliesToTiers` in the field list is the only edit needed to add a tab for that tier.

## Compatibility risks

- **Coach writing to the wrong offer.** Mitigation: step 3 comes before any other change to extra Core offers, with tests.
- **Coach changes not showing while the editor is open.** Today the popup reads its data once. Mitigation: `useOfferEditorState` takes in outside updates and keeps fields with unsaved typing.
- **Losing state when switching tabs.** Mitigation: tabs are hidden, not unmounted.
- **Two save paths** (Blueprint autosave vs offer save delay). Mitigation: one status view that reads `saving` (primary) or `hasPendingChanges` plus errors (extra).
- **Sync ownership.** The editor never writes the primary offer record directly; it always goes through the Blueprint, and `usePrimaryOfferSync` stays the only owner.
- **Brand-new Blueprint with no primary record yet.** The editor opens from Blueprint data; the sync creates the record.
- **Old links without a tab** default to Angle.

## Decisions needed

1. In scoped mode (extra Core offers), should field and list Coach stay available, with writes routed to the open offer (recommended), or be hidden entirely?
2. Section help (explain/walkthrough) in scoped mode: hide it (recommended for now), or show it without the ability to apply changes?
3. Editor size: large popup on desktop (recommended), or full screen everywhere?
