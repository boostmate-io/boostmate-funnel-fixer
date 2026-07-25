# Growth Architecture V2.1 — Final Implementation Plan (r3)

Final locked scope. Funnel Containers are the canvas primitive, external channels + upstream funnels are unified under one **Traffic Sources** configuration on the funnel itself, and the funnel owns its own status.

---

## 1. Data model

### 1a. `funnels` gains a `status` column (single source of truth)

```
status  text  NOT NULL  DEFAULT 'building'
        CHECK (status IN ('building','live','paused','archived'))
```
Backfill: all existing funnels → `'building'`. Analytics, Growth Architecture, and the Funnel list all read this column.

### 1b. New table — `funnel_connections`

Represents "target funnel receives traffic from source funnel". No type, no metadata beyond ordering.

```
id                uuid PK
sub_account_id    uuid FK sub_accounts (cascade)  NOT NULL
source_funnel_id  uuid FK funnels (cascade)       NOT NULL
target_funnel_id  uuid FK funnels (cascade)       NOT NULL
sort_order        int DEFAULT 0
created_at, updated_at timestamptz
CHECK (source_funnel_id <> target_funnel_id)
UNIQUE (source_funnel_id, target_funnel_id)
```
Standard GRANTs, RLS via `is_sub_account_member(auth.uid(), sub_account_id)`.

### 1c. `growth_architecture_systems` becomes a thin route → funnel record

- `funnel_id` remains the primary identity of a V2.1 row.
- Relax `NOT NULL` on `target_offer_id` (offer flows from `funnels.linked_offer_id`).
- The DB `status` column and `source_offer_id` are kept but ignored by the UI.
- Drop trigger `validate_growth_architecture_route` (offer-relationship prerequisite is gone).

### 1d. Deprecate, don't drop

`offer_relationships` — no UI writes; retained one release for rollback. `OfferRelationshipsSelector` removed.

### 1e. Backfill

For each `growth_architecture_channels` row on a route that already has a `funnel_id`, keep it in place — `growth_architecture_channels` continues to be the store for a funnel's external channels (see §2). No data migration needed for external channels.

For each existing `offer_relationships` row where both endpoints resolve to built funnels in the same workspace, insert a `funnel_connections` row (source → target). Unmappable rows are skipped; source data is preserved.

Single non-destructive migration.

---

## 2. Traffic Sources — one config per funnel

A funnel's traffic configuration is a single UI concept with two groups:

- **External** — checkboxes of acquisition channels from `acquisition_channels` (Facebook, Google, LinkedIn, Organic, Referral, …). Persisted through the existing `growth_architecture_channels` table, scoped to the funnel's route row. Primary vs additional is preserved (first checked = primary, rest = additional, in selection order) but not surfaced as a separate step — it's implicit.
- **Funnels** — checkboxes of other funnels in the same workspace. Persisted as `funnel_connections` rows where `target_funnel_id = this funnel` and `source_funnel_id = each checked funnel`.

Consequences:
- No standalone "Connects to…" / "Next Funnels" UI anywhere. Funnel-to-funnel edges are derived entirely from what a downstream funnel selects as its upstream funnels.
- Editing Traffic Sources is the only way to add or remove funnel-to-funnel connections.
- Selecting a funnel here immediately creates the `funnel_connections` row (and the corresponding canvas edge); unchecking removes it.

Two entry points, same shared component:

- **Growth Architecture** → funnel card "Edit Traffic Sources" opens the config dialog.
- **Funnel Builder** → toolbar "Traffic Sources" opens the same dialog.

Component: `FunnelTrafficSourcesDialog.tsx` with two accordion groups (External, Funnels). Backed by a new hook `useFunnelTrafficSources(funnelId)` that reads/writes both `growth_architecture_channels` and `funnel_connections` transactionally from the client (parallel mutations, single toast, single invalidation).

---

## 3. Growth Map — Funnel Containers

The map renders exactly one node per funnel: a **Funnel Container**.

Container contents (top → bottom):

- Header: funnel name.
- Status pill: `Building / Live / Paused / Archived` (from `funnels.status`), color-coded.
- Linked offer: tier chip + offer name (from `funnels.linked_offer_id` joined to `offers`).
- External traffic sources: list of channels for this funnel (primary marked, additional listed below). Empty state: "No external channels".

Internal funnel-to-funnel relationships are **never** rendered inside a container — they're only edges between containers.

**Edges**: exactly one edge per `funnel_connections` row, from source container's bottom handle to target container's top handle. Uniform styling (primary stroke, arrow marker). Color/dash reserved for later analytics overlay.

**Layout**: existing dagre TB layout, with container size estimated from channel count (`height ≈ 120 + channels * 20`) so edge routing stays correct.

**Interactivity**: read-only. No drag-to-connect on the canvas (traffic sources are the only editor). Clicking a container opens its funnel card action drawer (existing pattern).

**Orphans**: containers without incoming or outgoing connections still render inline on the map — the separate "orphan offers" grid is removed.

File impact: `GrowthMap.tsx` largely rewritten; new `FunnelContainerNode.tsx` custom node type.

---

## 4. Funnel status — funnel is the source of truth

- On successful `start-building-route`, the created funnel's `status = 'building'`.
- Funnel Builder toolbar adds a **Status** dropdown (`Building / Live / Paused / Archived`) that writes directly to `funnels.status`. RLS scoped by `sub_account_id`.
- Growth Architecture container pill and Funnel List badge both read the same column — no local override, no derived state override.
- `deriveRouteState` is retired; wherever we currently compute a route state, we read `funnels.status`. Routes without a funnel display "Not built" as the sole non-status label.

---

## 5. Offer Ecosystem cleanup

- Remove `<OfferRelationshipsSelector>` from `OfferEcosystemTab.tsx`.
- Delete `OfferRelationshipsSelector.tsx`.
- Keep `useOfferRelationships` unused for one release; drop with the follow-up `offer_relationships` migration.

---

## 6. Navigation — Growth Architecture as a top-level module

- `DashboardSidebar.tsx`: add top-level `Growth Architecture` entry after Business Blueprint; remove `growth-system` from Blueprint submenu.
- `BusinessBlueprintModule.tsx`: drop the `growth-system` section mount.
- `BlueprintOverview.tsx`: drop `growthProgress`.
- `Dashboard.tsx`: register `"growth-architecture"` module case → new `GrowthArchitectureModule.tsx` wrapper that mounts the section full-width.
- Existing custom events (`boostmate:open-funnel`, etc.) reused.

---

## 7. Existing users

- Migration + backfill run in one transaction.
- Every existing funnel gets `status='building'` and stays visible.
- Existing `growth_architecture_channels` rows continue to define each funnel's External traffic sources unchanged.
- Any inferable funnel-to-funnel connections from `offer_relationships` are seeded into `funnel_connections`; the rest are silently skipped and the source table is retained one release.
- Funnel Builder, build guides, task progress, analytics entries are untouched.

---

## 8. Future compatibility (Analytics)

The Funnel Container is the natural attribution surface:
- Container id === `funnels.id` — same id already used by `funnel_analytics_entries` / `funnel_step_metrics`.
- Overlay revenue / spend / conversion into the container header; overlay channel-level metrics next to each External row.
- Overlay ascension / cross-funnel conversion onto `funnel_connections` edges.
- No new canvas concepts required.

---

## 9. Risks

**Technical**
- Variable container height must feed accurate dimensions to dagre — mitigated by size estimator + post-render measurement.
- `useFunnelTrafficSources` performs two parallel writes (channels + connections) client-side; must handle partial failure with rollback toast and re-invalidation.
- Nullable `target_offer_id` needs an audit of every `select("target_offer_id")` in hooks/UI.

**UX**
- Users familiar with seeing channel nodes on the map need to discover them inside containers — mitigated by an inline first-load hint.
- Blueprint no longer shows Growth Architecture progress — acknowledged in release notes.

**Architectural**
- `growth_architecture_systems` briefly holds two identities (pre-funnel routes vs V2.1 rows). UI filters to `funnel_id IS NOT NULL`; older rows continue to power "Start Building".
- `offer_relationships` and `funnel_connections` coexist one release; drop scheduled in a follow-up migration.

---

## Technical notes

- New: `src/lib/growth-architecture/useFunnelConnections.ts`, `useFunnelTrafficSources.ts`.
- New: `src/components/growth-architecture/FunnelContainerNode.tsx`, `FunnelTrafficSourcesDialog.tsx`, `GrowthArchitectureModule.tsx`.
- Move: `src/components/business-blueprint/growth-architecture/*` → `src/components/growth-architecture/*`; update imports.
- Rewrite: `GrowthMap.tsx` — one node type (`FunnelContainerNode`), edges from `funnel_connections` only.
- Edit: `FunnelDesigner.tsx` toolbar (Status dropdown + Traffic Sources button), `RouteCard.tsx` (Edit Traffic Sources, remove old "Connects to…"), `OfferEcosystemTab.tsx` (remove relationships selector), `DashboardSidebar.tsx` (nav), `BusinessBlueprintModule.tsx` (drop section), `BlueprintOverview.tsx` (drop progress), `Dashboard.tsx` (new module case), `FunnelList.tsx` (status badge from column).
- Delete: `OfferRelationshipsSelector.tsx`, `EditRouteDialog.tsx` (replaced by Traffic Sources dialog), `deriveStatus.ts`.
- Migration: add `funnels.status`; create `funnel_connections` + GRANTs + RLS; backfill from `offer_relationships`; drop `validate_growth_architecture_route` trigger; relax `target_offer_id` NOT NULL.
- Edge function: `start-building-route` sets funnel `status='building'` on insert; no other contract change.
- Follow-up (later): drop `offer_relationships`, `useOfferRelationships`, `growth_architecture_systems.source_offer_id` and unused `status`.
