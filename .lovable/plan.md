
## Outreach module improvements

### 1. Pipeline UX (`OutreachPipeline.tsx`)
- **Optimistic drag & drop**: update local state immediately on drop; run Supabase update in background. No `refresh()` (which currently causes the whole page to feel like it reloads), no `toast.success` notification.
- **Column scrolling**: give each column a fixed max height (`h-[calc(100vh-220px)]`) with an internal scroll area for the cards list, so columns don't grow taller than the viewport.
- Keep local `leads` state synced when the hook's leads change (via `useEffect`).

### 2. Leads tab (`OutreachLeadsList.tsx`)
- **Detail as popup**: instead of replacing the list view with `<OutreachLeadDetail>`, render `OutreachLeadDetail` inside a large `Dialog` (max-w-4xl, scrollable). Closing the dialog returns to the list without navigation. Remove the `if (selectedLeadId) return <OutreachLeadDetail…>` branch.
- **Bulk actions bar**: add two new buttons next to the status dropdown:
  - **Archive** — sets `deleted_at = now()` on all selected leads (soft-delete = archive).
  - **Delete** — hard delete (`.delete()`) after an `AlertDialog` confirm. Warning text clarifies analytics are unaffected (messages remain, see §4).
- **Archived filter**: add a small toggle/select "Show archived" next to the status filter. Default view filters out rows where `deleted_at IS NOT NULL`; toggling shows only archived leads with an "Unarchive" bulk action available.

### 3. Duplicate check on Add Lead
- Before insert in `handleCreate`, query `outreach_leads` scoped to the current `sub_account_id` (no `deleted_at` filter, so archived leads are included) matching any of:
  - `profile_url` (if provided) equals input `profile_url` or `profile_url_2`
  - `profile_url_2` (if provided) equals input `profile_url` or `profile_url_2`
  - `email` (if provided) equals input `email`
- If a match is found: show a toast with the existing lead's name and status (mention if archived), block the insert, and offer an "Open existing" action that selects that lead (opens the detail popup, unarchiving if needed via a separate user action).

### 4. Analytics safety
- `useOutreachData` currently loads leads with `.is("deleted_at", null)` (verify and keep this) so archived leads disappear from list/pipeline/draft queue automatically.
- **Archive path**: only sets `deleted_at`; `outreach_messages` rows are untouched → analytics unaffected.
- **Delete path**: keep `outreach_messages` rows intact by NOT cascading. Before hard-deleting a lead, `UPDATE outreach_messages SET lead_id = NULL` (requires migration to make `lead_id` nullable and drop any ON DELETE CASCADE). Analytics queries counting messages/replies remain correct because they aggregate messages, not leads.
- Migration needed:
  - Ensure `outreach_messages.lead_id` FK is `ON DELETE SET NULL` and column is nullable.
  - (No schema change needed for archive — `deleted_at` already exists.)

### 5. Filter application
- Update `useOutreachData` (or the filter in list/pipeline) to consistently exclude `deleted_at IS NOT NULL` unless the "Show archived" toggle is on in the leads list. Pipeline and draft queue always exclude archived.

### Files touched
- `src/components/outreach/OutreachPipeline.tsx` — optimistic DnD, column scroll, no toast/refresh.
- `src/components/outreach/OutreachLeadsList.tsx` — dialog-based detail, archive/delete bulk actions, archived filter, duplicate check.
- `src/components/outreach/useOutreachData.ts` — support `includeArchived` flag; ensure default filters out `deleted_at`.
- Migration — make `outreach_messages.lead_id` nullable with `ON DELETE SET NULL`.
