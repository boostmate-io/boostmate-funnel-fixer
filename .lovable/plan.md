# Fix: Growth System editor — Seed Template selector + remove Architecture JSON

Aligns Admin → Growth Systems with the approved V4 architecture where the Seed Template is the single source of truth used by `start-building-route`.

## Single Seed Template concept (confirmed)

"Seed Template" always means the templates managed in **Admin → Funnel Builder → Templates**, stored in the `seed_templates` table. This is the same table that powers:
- The Funnel Builder admin template editor (`FunnelDesigner.tsx`)
- The Template Library seeded into every new account (`handle_new_user_role`)
- `start-building-route` cloning

The Growth System selector added below reads from this exact same table. No second seed-template concept, no parallel table, no new repository.

## Scope

Admin UI only. No schema changes, no runtime changes. `growth_systems_catalog.architecture` column stays in the DB (Phase D drop) but is removed from the editor UI.

## Changes — `src/components/admin/AdminGrowthSystemsCatalog.tsx`

1. **Add Seed Template selector**
   - Load from `seed_templates` where `is_active = true`, ordered by name (id, name, template_type).
   - Render as a shadcn `<Select>` with a "— None —" option; show `name` and small `template_type` badge in items.
   - Include `seed_template_id` in the row list `select`, in the `System` interface, and in the upsert payload.
   - Preserve current value on edit; allow clearing back to null.

2. **Inline warning in the row list**
   - When `is_active = true` and `seed_template_id` is null, show a destructive badge: "No seed template — Start Building will fail." Visual cue only.

3. **Remove Architecture JSON editor**
   - Delete `archText` / `archError` state, the Textarea block, the `JSON.parse` guard, and the `architecture` field from the upsert payload.
   - Drop `architecture` from the interface and from the list `select`.
   - Column stays untouched in the DB.

4. Keep everything else exactly as-is: guides multi-select, channel compat, tiers, stages, icon, sort order, active toggle.

## Verification

1. Typecheck clean.
2. Admin → Growth → Systems: no Architecture JSON field; Seed Template dropdown present, populated from the Funnel Builder templates.
3. Edit a system, pick a seed template, save → reopens with the same selection; row list shows no warning.
4. Clear the seed template on an active system → warning badge appears.
5. `start-building-route` still succeeds using the selected template (unchanged code path).

## Explicitly out of scope

- Dropping `growth_systems_catalog.architecture` column (Phase D).
- Changes to `start-building-route`, the seed template editor, guide attachments, or the Template Library.
