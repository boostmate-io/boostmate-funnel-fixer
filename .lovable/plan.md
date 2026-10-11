# Offer Ecosystem Relationships — Audit (investigation only)

No code, schema, UI or data changed.

## 1. Current architecture

**Storage:** `public.offer_relationships` (one table, already in production schema)

| Column | Notes |
|---|---|
| `source_offer_id`, `target_offer_id` | FK → `offers(id)` ON DELETE CASCADE (deleting an offer removes its edges) |
| `relationship_type` | CHECK: `ascends_to`, `leads_into`, `retention`, `downsell` |
| `sub_account_id` | FK → `sub_accounts` ON DELETE CASCADE |
| `notes` | free text, unused by UI |

- **Directional**: yes (source → target). Many incoming/outgoing per offer supported.
- **Self-links**: blocked (`CHECK source <> target`).
- **Duplicates**: blocked per (source, target, type); the same pair can hold two different types.
- **Cycles**: not prevented (A→B→A possible).
- **Cross-workspace edges**: not prevented — nothing checks both offers belong to `sub_account_id`.
- **RLS**: workspace members only (`is_sub_account_member`). App admins without membership are blocked — the same gap we fixed for AI Coach.
- **Saved data**: **0 rows** in any workspace. No migration risk. (Offers: 25 core, 9 free, 7 low, 1 mid, 3 premium, 0 continuity.)

**Code:**
- `useOfferRelationships` / `useCurrentWorkspaceRelationships` (`src/lib/growth-architecture/hooks.ts`): load / add / remove; no update. Reusable as the single repository.
- `OfferRelationshipsSelector.tsx`: chip picker (outgoing only). **Not rendered anywhere** since the read-only card redesign — orphaned.
- `AddRouteDialog` (Growth Architecture) only offers offer→offer routes where a relationship exists, and tells users to *"Add a Next offer on the source offer first"* — **that UI no longer exists**, so offer→offer routes are currently impossible to create. This is the most important finding: a live dead end.
- The DB trigger that enforced routes ↔ relationships was later dropped; enforcement is client-side only.
- Funnel connections were once backfilled from relationships (one-time migration); funnels link offers via `funnels.linked_offer_id`, independent of relationships.
- Coach: no relationship context or write paths.

## 2. Placeholder mapping (registry `OFFER_TIER_LAYOUTS`)

| Tier | Placeholder | Where | Registry type | Intended direction |
|---|---|---|---|---|
| Free | Leads into | Offer tab → Next step | `leads_into` | this → target |
| Low-Ticket | Ascends to | Offer tab → Next step | `ascends_to` | this → target |
| Mid-Ticket | Ascends to | Pricing → Ecosystem | `ascends_to` | this → target |
| Mid-Ticket | Downsell from | Pricing → Ecosystem | `downsell` | **ambiguous** — "from" reads as incoming |
| Premium | Upgrades from (only when Upgrade) | Angle → Premium type | `ascends_to` | **incoming** (Core → this) |
| Continuity | Retention for | Pricing → Ecosystem | `retention` | **incoming-ish** (other → this) |
| Core | none | — | — | Core has no relationship control at all |

None persist anything. Labels and types live in the registry; direction does not — that must be added.

Inconsistencies: mixed incoming/outgoing wording, Premium reuses `ascends_to` for "upgrade", Core (the hub) has no entry point, no tier shows incoming relationships.

## 3. Recommended model

Keep the table and four types; no new relationship model. Each relationship is stored once as source → target; the UI shows it from both sides.

| Concept | Type | Outgoing label | Incoming label |
|---|---|---|---|
| Next step / ascension | `ascends_to` | Leads to | Comes from |
| Free entry point | `leads_into` | Leads into | Fed by |
| Upsell / upgrade | `ascends_to` | Upgrades to | Upgrade of |
| Downsell | `downsell` | Downsell to | Downsell of |
| Retention / continuity | `retention` | Continues into | Retains customers of |

- Placeholders become registry items with an explicit `direction: "outgoing" | "incoming"`. "Upgrades from" = incoming `ascends_to`; "Retention for" = incoming `retention`; "Downsell from" → recommend renaming to an outgoing "Downsell to" (decision needed).
- Category is a suggestion for target filtering, not a rule.
- Validation: keep DB self/duplicate rules; add a same-workspace check; **warn, not block,** on cycles (ascension loops are rare but downsell + ascends between two offers is legitimate).
- Optional later: merge `leads_into` into `ascends_to` (only cosmetic; zero rows makes it free now — decision needed).

## 4. UX recommendation

- **Primary: inside the Universal Offer Editor (A).** Registry-driven control replacing each placeholder: chosen offers as chips, "+ Add" menu listing workspace offers grouped by category, matching tiers first. Saves immediately and independently of design autosave.
- Add a small "Ecosystem" section to every tier (including Core) showing all incoming/outgoing relationships, so nothing is hidden by tier-specific placeholders.
- **Secondary: Ecosystem screen (B) read-only first.** No drag-to-connect — too technical for coaches.

## 5. Visualization

No graph library. Incremental:
1. Card footer line: "→ Leads to: Lead Engine 90, +1" and "← Comes from: Free Checklist".
2. Optional "Customer journey" overview list above the ladder: each relationship as `Offer A → Offer B (label)`, plus a "Not connected" group. Works with many offers and on mobile.
3. Arrows between ladder columns only if later needed.

## 6. Integration

| System | Now | Defer |
|---|---|---|
| Universal Offer Editor | relationship controls | — |
| Ecosystem cards | read-only summary | inline management |
| Growth Architecture | fixes the dead-end route creation automatically; update the hint text | auto-suggest routes |
| Blueprint progress | none (keep `tierCounts` as-is) | — |
| Funnels | none (`linked_offer_id` unaffected) | — |
| Offer delete | cascade already works; add confirmation text "also removes N relationships" | — |
| AI Coach | no change | context about related offers' links; no write-back |
| Primary Core | fully compatible (stable IDs preserved by sync) | — |

Risks: relationships save outside the editor's design autosave (separate success/failure feedback needed); draft offers created on add already have IDs, so OK; RLS admin gap.

## 7. Roadmap

1. **Data & repository** — one migration: same-workspace validation trigger + admin access in RLS (same pattern as Coach). Extend registry relationship items with `direction` and in/out labels. Repository tests (add/remove, dupes, self, cross-workspace). No UI.
2. **Editor controls** — replace placeholders with one shared `OfferRelationshipField`; add the Ecosystem section to all tiers incl. Core; Coach stays off. Tests per tier; no design writes.
3. **Ecosystem display** — card summary lines + "Customer journey" list; delete confirmation counts. Fix Growth Architecture hint text.
4. **Integration validation** — Growth Architecture route creation end-to-end, deletion cascade, Primary Core sync, manual checklist.

Each stage is independently shippable; 2 depends on 1, 3 on 1.

## 8. Decisions needed

1. Mid-Ticket "Downsell from": keep as incoming, or change to outgoing "Downsell to"?
2. Merge `leads_into` into `ascends_to` now (0 rows, free) or keep both?
3. Cycles: warn only (recommended) or block?
4. Should Core get relationship controls in its editor (recommended: yes, as a section in the Pricing tab or a new small section)?
5. Is the Ecosystem screen read-only for relationships at first (recommended), or also editable?
