
# Growth Architecture V4 — Final Approved Plan (Phases A, B, C)

All decisions locked. Phase D is out of scope until separately approved.

---

## Locked decisions

1. **Task descriptions:** Markdown, read-only rendering.
2. **Entry node:** Start Building blocks if no explicit `entry_node_id` and the deterministic fallback is ambiguous — actionable error surfaces the fix.
3. **Guide attachment:** Auto-resolved from route (Growth System + Primary Channel + Additional Channels). No manual attach/detach in V1. Panel always accessible.
4. **Progress on funnel delete:** Cascade.
5. **Funnel Brief:** Toolbar swap only in Phase 1. Tables, data, and `SharedBrief` route preserved. No drops.

### Correction A — Duplicate acquisition-node prevention
- Admin Seed Template editor rejects saves that contain any `trafficSource` nodes when the template is intended for a Growth System.
- `start-building-route` edge function aborts with a clear error if the seed template still has any `trafficSource` nodes. No silent merge, no auto-strip.

### Correction B — Roadmap Task → Route resolution
- `growth_roadmap_tasks.target_growth_system_id` replaces `build_guide_ref`. CTA behaviour:
  - Zero matching routes → open Add Route dialog pre-filled with the system.
  - Exactly one route → jump to it.
  - Multiple routes → open Growth Architecture filtered to routes using the system; user picks.

### Correction C — Derived route state
Extended rules (finalized per user):

| State | Condition |
|---|---|
| `planned` | Prerequisites incomplete (offer-to-offer: missing relationship; external: no primary channel). |
| `ready_to_build` | Prerequisites met AND `funnel_id IS NULL`. |
| `in_progress` | `funnel_id IS NOT NULL` AND (any attached active task incomplete OR no guides attached). |
| `built` | `funnel_id IS NOT NULL` AND ≥1 guide attached AND all **active** tasks across attached guides complete. |
| `locked` | Reserved. Not emitted. |

Live-template behaviour accepted: if an admin adds a new active task to a guide on an already-Built funnel, that route drops back to `in_progress` until the new task is completed. Only `is_active = true` tasks count.

---

## Phase A — Schema + Admin

### Migration (single call)

**New tables** (all with GRANTs + RLS):
- `build_guides` — id, key (unique), name, description, is_active, sort_order, timestamps. Admin write; authenticated read.
- `build_guide_stages` — id, build_guide_id (cascade), title, description, sort_order, timestamps.
- `build_guide_tasks` — id, stage_id (cascade), title, description_md, instructions_url, video_url, is_active (soft delete), sort_order, timestamps.
- `growth_system_build_guides(growth_system_id, build_guide_id, sort_order)` — composite PK.
- `acquisition_channel_build_guides(acquisition_channel_id, build_guide_id, sort_order)` — composite PK.
- `funnel_build_guides(id, funnel_id cascade, build_guide_id cascade, source CHECK ('system'|'channel'), source_ref_id, sort_order)` — unique(funnel_id, build_guide_id). Workspace-member RW via `is_sub_account_member`.
- `funnel_build_task_progress(id, funnel_id cascade, task_id cascade, completed_at, completed_by, notes)` — unique(funnel_id, task_id). Workspace-member RW.

**Column additions:**
- `growth_architecture_systems.funnel_id uuid` nullable + partial unique index (one funnel per route).
- `seed_templates.entry_node_id text` nullable.
- `growth_roadmap_tasks.target_growth_system_id uuid` nullable FK.

**Realtime:** enable `offers` on `supabase_realtime` publication for the stale-offer fix.

**Nothing dropped.** `growth_systems_catalog.architecture` and `growth_roadmap_tasks.build_guide_ref` remain until Phase D.

### Admin UI
- New **Build Guides** tab (4th) in Admin → Growth: guide list; on selection, nested Stages with their Tasks; `@dnd-kit` drag-and-drop for stages, for tasks, and tasks across stages. Task editor includes markdown description, instructions URL, video URL, active toggle.
- `AdminGrowthSystemsCatalog.tsx`: adds "Attached Build Guides" multi-select (writes `growth_system_build_guides`). Also removes the raw `architecture` JSON editor from the UI (column stays until Phase D).
- `AdminAcquisitionChannels.tsx`: adds "Attached Build Guides" multi-select.
- Seed Template editor (add if not present, else extend): entry-node dropdown + save-time validator rejecting `trafficSource` nodes.
- `AdminGrowthRoadmapTasks.tsx`: adds `target_growth_system_id` selector; keeps `build_guide_ref` as a legacy fallback field marked deprecated.

---

## Phase B — Start Building + Runtime

### Edge function `start-building-route`
Deno function; JWT validation from `Authorization` header; workspace-membership check; transactional insert flow:

1. Load route → if `funnel_id` already set, return `{ funnel_id, already_existed: true }`.
2. Load `growth_systems_catalog` → require `seed_template_id`; else 422 with actionable message.
3. Load seed template. **Guard A**: if any node has `type === "trafficSource"`, 422 with template-fix message.
4. Resolve entry node: `seed.entry_node_id` if set; else fallback = unique `funnelPage` node with zero incoming edges. If ambiguous → 422 with entry-node-required message.
5. Load route channels (primary + additional) joined to `acquisition_channels` for label/icon/color/key.
6. Compose funnel: copy seed nodes/edges; append one `trafficSource` node per channel (positioned left of entry), append edges channel→entry_node_id.
7. Insert `funnels` row: `user_id, sub_account_id, name = "{system.label} → {targetOffer.name}", seed_template_id, linked_offer_id = target_offer_id, nodes, edges`.
8. Update route `funnel_id = new.id`.
9. Compute distinct guide ids: system guides ∪ primary-channel guides ∪ additional-channel guides. Insert `funnel_build_guides` rows with source annotation.
10. Return `{ funnel_id, already_existed: false }`.

### Frontend
- `GrowthArchitectureSection` route cards: "Start Building" CTA when `ready_to_build`; "Open / Continue Building" when `funnel_id` present. Navigates to Funnel Builder with that funnel selected.
- `FunnelDesigner.tsx`: repoint the existing `ClipboardList` toolbar icon to open a new `FunnelBuildGuidePanel` instead of `FunnelBriefPanel`. Panel always available.
- `FunnelBuildGuidePanel`:
  - Header: overall completed / total, percentage, progress bar.
  - Per-guide section: name, count, bar, collapsible (default: first guide expanded).
  - Per-stage: title, count, collapsible (default expanded).
  - Per-task: checkbox, title, markdown description (react-markdown), instructions link, video link.
  - Optimistic writes to `funnel_build_task_progress`; localStorage-persisted collapse state per funnel.
  - Empty state when no guides resolved.
- Derived-state extension in `deriveRouteState`: accept optional `{ funnelId, taskStats: { activeTotal, completed, guidesAttached } }` and emit per the finalized rules table above.
- Hooks: `useFunnelBuildGuides(funnelId)`, `useTaskProgress(funnelId)` with optimistic toggle; `useRouteTaskStats(routeIds)` for section cards' state derivation.

---

## Phase C — Stale offer data fix

- Add `reload()` to `useEcosystemOffers` return; propagate through `BusinessBlueprintModule` → `OfferEcosystemTab` → `OfferPanel`/`OfferEditor`. Every offer create/update/delete calls `reload()` after success.
- Add Supabase realtime subscription in `useEcosystemOffers` filtered by `sub_account_id` (offers table added to publication in the Phase A migration). Reload on any INSERT/UPDATE/DELETE.

---

## Out of scope (Phase D — later, separate approval)

- Drop `growth_systems_catalog.architecture` column.
- Drop `growth_roadmap_tasks.build_guide_ref`.
- Retire Funnel Brief tables / components / SharedBrief.

---

## Verification checklist (executed after implementation)

1. Migration applied cleanly; typecheck passes.
2. Admin Build Guides CRUD works; stages/tasks drag reorder + cross-stage move.
3. Growth Systems + Acquisition Channels editors show attach-guides multi-selects.
4. Seed template editor: entry-node picker present; save rejected on `trafficSource` nodes.
5. Roadmap task editor: `target_growth_system_id` selector present.
6. Start Building on a valid route: creates funnel, links offer, injects channel nodes wired to entry, snapshots guides, sets `funnel_id`. Second click returns Open / Continue.
7. Start Building on a template with traffic nodes / no entry node → error, no funnel created.
8. Funnel Builder clipboard icon opens `FunnelBuildGuidePanel`; toggling tasks persists.
9. Derived state cycles: planned → ready → in_progress → built as tasks complete; regresses to in_progress when an admin adds a new active task.
10. Renaming an offer in Offer Ecosystem updates Growth Architecture cards without reload; realtime propagates across tabs.
11. `SharedBrief.tsx` public route still functions with existing brief data.
