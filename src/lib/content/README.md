# Editable Product Content — reference architecture

The standard for user-facing product copy in Boostmate that must be editable by
admins without a code change. This is **not** a generic CMS and there is no
universal content table: every domain keeps its own structured table.

Currently implemented for: `growth_stages`, `growth_systems`.
Intended future domains: Business Blueprint content, Build Guide introductions,
Academy module introductions, AI Coach contextual content.

## The pattern

### 1. One structured table per domain

Real, typed columns for the fields that domain actually has — never a
key/value blob. The base columns hold the **default (English)** copy.

Every content table carries these four conventional columns:

| Column         | Type      | Purpose                                            |
| -------------- | --------- | -------------------------------------------------- |
| `translations` | `jsonb`   | Locale overlays, `{"nl": {"<column>": "..."}}`      |
| `ai_guidance`  | `text`    | Admin-editable domain knowledge for AI. Never shown to users. |
| `sort_order`   | `integer` | Deterministic ordering in UI and admin              |
| `is_active`    | `boolean` | Soft-disable (omit for fixed-cardinality tables like stages) |

### 2. Localization

A single `translations` JSONB column, shaped `{ "<locale>": { "<column>": "..." } }`.
Adding a language never requires a schema change, and a missing field silently
falls back to the base column.

Resolve with `resolveContent(row, i18n.language)` from
`src/lib/content/resolveContent.ts`. Never read `translations` directly in a
component.

Static UI chrome (button labels, section headings) stays in `src/i18n/*.json` —
only *content* moves to the database.

### 3. AI guidance

`ai_guidance` holds the domain-specific knowledge that evolves over time and is
injected into AI Actions as context. It is **never rendered to users**.

Division of responsibility:

- **Instruction blocks** own AI behaviour, reasoning and coaching methodology.
- **`ai_guidance`** owns the domain facts about this specific row.

### 4. Admin editing

One CRUD component per domain under `src/components/admin/`, registered as a tab
in the matching `AdminPanel.tsx` category. Every editor provides:

- an EN / NL language toggle that writes to the base columns or
  `translations.<locale>`;
- the `ai_guidance` field in its own clearly-labelled "not shown to users"
  section.

See `src/components/admin/AdminGrowthContent.tsx` as the reference
implementation.

### 5. Delivery and caching

One React Query hook per domain, using the shared `CONTENT_QUERY_OPTIONS` cache
policy so content is fetched once per session. The hook returns already-resolved
rows for the active locale.

See `src/lib/growth/useGrowthContent.ts` as the reference implementation.

### 6. Access control

```sql
GRANT SELECT ON public.<table> TO anon;            -- only if public pages read it
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;

CREATE POLICY "<table>_read_all"    ON public.<table> FOR SELECT USING (true);
CREATE POLICY "<table>_admin_write" ON public.<table> FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));
```

Content is global product copy, not workspace data — it is not scoped to
`sub_account_id`.

## Adding a new domain

1. Migration: structured table + the four conventional columns + grants/policies above.
2. Seed the current hardcoded copy verbatim so the change is visually a no-op.
3. Hook: `useXContent.ts` using `CONTENT_QUERY_OPTIONS` and `resolveContentList`.
4. Admin: `AdminX.tsx` with the EN/NL toggle and AI guidance section.
5. Delete the old constants/i18n keys so there is exactly one source of truth.
