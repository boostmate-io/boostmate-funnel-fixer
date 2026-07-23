
# Growth Systems & Acquisition Channels — Revised V3 Correction Plan

## Confirmed current state

- `growth_architecture_systems` uses a single `acquisition_channel_id UUID` (no junction). Row count: **0** — nothing to preserve.
- `TRAFFIC_SOURCES` in `src/components/funnel-designer/constants.ts` = **57 entries** across 5 `TRAFFIC_SOURCE_GROUPS`.
- `key` stays as the stable slug across all catalog tables (no rename to `slug` — churn without gain).

## Step 1 — Schema migration (structure only)

Single migration, in order:

### 1a. `acquisition_channel_categories` (new)
Fields: `key UNIQUE, label, sort_order, is_active`. RLS: authenticated read, admin write. GRANTs to authenticated + service_role.

### 1b. `acquisition_channels` (alter)
- Drop free-text `category`.
- Add `category_id UUID REFERENCES acquisition_channel_categories(id) ON DELETE SET NULL`.
- Add `color TEXT`. Keep `icon TEXT`.
- Tighten RLS to authenticated-only reads.

### 1c. `growth_systems_catalog` (alter)
- Add `primary_objective TEXT`, `suitable_offer_tiers TEXT[]`, `recommended_stages TEXT[]`, `architecture JSONB`, `seed_template_id UUID REFERENCES seed_templates(id) ON DELETE SET NULL`.
- Trigger validates tier / stage array values.
- Drop `system_type` column + CHECK (superseded).
- Tighten RLS to authenticated-only reads.

### 1d. `growth_architecture_channels` (new — junction)
- `architecture_system_id UUID REFERENCES growth_architecture_systems ON DELETE CASCADE`
- `channel_id UUID REFERENCES acquisition_channels ON DELETE CASCADE`
- `is_primary BOOL DEFAULT false`, `sort_order INT DEFAULT 0`.
- Unique `(architecture_system_id, channel_id)`.
- Partial unique index enforcing at most one `is_primary = true` per route.
- RLS: `EXISTS` check on parent route's `sub_account_id`. GRANTs standard.

### 1e. `growth_architecture_systems` (alter)
- Drop `acquisition_channel_id` (safe — 0 rows). Existing `validate_growth_architecture_route` trigger doesn't reference it.

### 1f. `growth_system_channel_compat` (new)
- PK `(growth_system_id, acquisition_channel_id)`, cascade deletes.
- RLS: authenticated read, admin write. **No rows seeded.**

## Step 2 — Data reseed (insert tool, after Step 1 lands)

### 2a. Categories
5 rows from `TRAFFIC_SOURCE_GROUPS` (`paid_traffic, organic_traffic, owned_traffic, referral_partnerships, direct_other`), labels verbatim, `sort_order` = array index.

### 2b. Acquisition Channels — full port
- `DELETE FROM acquisition_channels` (only the dropped column referenced them; junction is empty).
- Insert all **57** rows from `TRAFFIC_SOURCES`: `key = type`, `label/icon/color` verbatim, `category_id` from the group mapping, `sort_order` from array index. Report inserted count.

### 2c. Growth Systems Catalog — the approved five
- `DELETE FROM growth_systems_catalog` (0 dependents).
- Insert: `client-converter`, `audience-builder`, `offer-launcher`, `quiz-funnel`, `launch-engine` — with description, `primary_objective`, `suitable_offer_tiers`, `recommended_stages`, `sort_order`.
- `architecture` and `seed_template_id` left NULL for manual Admin config.

### 2d. Compatibility
No rows seeded.

## Step 3 — Admin UI

### `AdminAcquisitionChannels.tsx`
- Category becomes `<Select>` from `acquisition_channel_categories`.
- Add `icon` (text + lucide preview) and `color` (color picker + hex).
- Inline "Manage categories" panel: CRUD on `acquisition_channel_categories`.

### `AdminGrowthSystemsCatalog.tsx`
- Remove `system_type` select.
- Add `primary_objective` (textarea), `suitable_offer_tiers` (6-tier checkbox group), `recommended_stages` (5-stage checkbox group), `seed_template_id` (`<Select>` over `seed_templates` with explicit "None").
- "Compatible Acquisition Channels" multi-select — writes `growth_system_channel_compat`.
- **Architecture JSON editor**: monospace `<Textarea>` with live `JSON.parse` validation, inline errors, disabled Save on invalid; adjacent read-only Preview panel summarising `nodes`/`edges` (or formatted JSON tree). No graph canvas.

## Step 4 — Funnel Builder unification (single source of truth)

- New hook `useAcquisitionChannels()` in `src/lib/acquisition-channels/hooks.ts`: react-query, `staleTime: Infinity`, invalidated on Admin writes. Returns channels + categories grouped/sorted.
- Replace consumers of `TRAFFIC_SOURCES` with the hook:
  - `ElementsPanel.tsx`, `TrafficSourceNode.tsx`, `TrafficSourceDetailsPanel.tsx`, `FunnelDesigner.tsx`
  - Analytics: `typeLabels.ts`, `AnalyticsHistory.tsx`, `AnalyticsCharts.tsx`, `AnalyticsKPIs.tsx`, `AnalyticsSummary.tsx`, `AnalyticsFunnelNode.tsx`, `AnalyticsTrafficNode.tsx`, `DailyDataEntry.tsx`, `metricDefinitions.ts` (as applicable).
- **No runtime fallback.** Loading = skeleton in panels; nodes show raw `type` slug until fetch resolves.
- Preserved locally: a small lucide-name → component resolver (rendering helper, not a metadata duplicate).

## Step 5 — Blueprint Growth Architecture UX: manage per-route channels (NEW)

The current `GrowthArchitectureSection.tsx` exposes only Growth Map + Routes, and `AddRouteDialog.tsx` collects a single channel. With the junction table in place, users must be able to fully manage each route's channels.

### 5a. Add Route flow (minimal change)
- Continues to ask for the single **initial Primary Acquisition Channel** (required).
- On save, insert the route, then insert one `growth_architecture_channels` row with `is_primary = true`, `sort_order = 0`.

### 5b. Acquisition management view
Add a per-route "Acquisition" surface. Implementation choice (both meet the spec — flag the pick during build):
- **Option A (default):** expand each Route card in the Routes tab with an inline "Acquisition Channels" section.
- **Option B:** dedicated "Acquisition" tab listing routes with the same per-route panel.

Per route, users can:
- View the **Primary** channel (chip with a "Primary" badge, using icon + color from the catalog).
- View **Additional** channels (chips, no primary badge, ordered by `sort_order`).
- **Change Primary**: `<Select>` of channels, filtered to entries in `growth_system_channel_compat` for the route's growth system when compat rows exist; unfiltered otherwise. Switching primary runs as one RPC/transaction: set old primary `is_primary=false`, set new primary `is_primary=true`. Rejects if the target isn't already linked → prompt "Add and promote" which inserts (if missing) then promotes atomically.
- **Add Additional**: multi-select of not-yet-linked channels (same compat filter behaviour). Inserts rows with `is_primary=false`, next `sort_order`.
- **Remove Additional**: per-chip remove (× button, confirm on click). The Primary cannot be removed directly — user must promote another channel first (UI shows disabled × with tooltip "Promote another channel first").
- Optimistic updates via react-query; failures roll back with a toast.

### 5c. Data layer
- Extend `src/lib/growth-architecture/hooks.ts`:
  - `useRouteChannels(architectureSystemId)` — fetches `growth_architecture_channels` joined with `acquisition_channels`, returns `{ primary, additional }`.
  - Mutations: `addRouteChannel`, `removeRouteChannel`, `setRoutePrimaryChannel` (atomic swap; guards against removing the only channel).
- The partial unique index in Step 1d is the DB-side guarantee; the mutation is the transactional client of it.

### 5d. Growth Map
- Read from the junction: node badge shows Primary label; hover/expand reveals Additional channels count and names. No editing on the map.

## Step 6 — Cleanup

- Delete `TRAFFIC_SOURCES` + `TRAFFIC_SOURCE_GROUPS` from `constants.ts` (keep `FUNNEL_ELEMENTS`).
- Derive `TrafficSource` type from generated DB types.
- Remove dead imports. Regenerate `types.ts` (auto after migration approval).

## Verification checklist

1. `growth_systems_catalog` returns the 5 approved systems by `key`.
2. `acquisition_channels` count = **57**; every `key` matches a pre-migration `TRAFFIC_SOURCES.type`.
3. `acquisition_channel_categories` count = 5, matching `TRAFFIC_SOURCE_GROUPS`.
4. Admin can CRUD channels, categories, growth systems, and compat rows; compat starts empty.
5. Admin Growth Systems editor: architecture JSON textarea validates + previews; seed template `<Select>` loads and clears.
6. Funnel Builder Elements panel + nodes render the same 57 channels grouped as before, via the DB hook.
7. Add Route creates one `growth_architecture_channels` row with `is_primary=true`.
8. **Per route in the Blueprint UI:** Primary is visible + swappable; Additional can be added and removed; Primary cannot be removed directly; UI enforces at most one Primary; partial unique index rejects any accidental duplicate primary write. (NEW)
9. **Growth Map** displays Primary per route with Additional visible on hover/expand, sourced from the junction. (NEW)
10. Existing funnels open — all traffic-source nodes resolve (keys unchanged).
11. No `TRAFFIC_SOURCES` references remain in `src/` (rg check).
12. `tsgo` typecheck clean.
13. Prototype `growth_architecture_systems` row count reported (currently 0).

## Deviations from previous plan (only the new addition)

- Step 5 (Blueprint per-route channel management UX) added — Add Route stays single-Primary; full management lives in the Routes/Acquisition surface per your correction.
- All other Steps 1–4 and 6 unchanged from the last approved revision.
