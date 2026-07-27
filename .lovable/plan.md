## Where the copy comes from today

| Text | Source | Type |
|---|---|---|
| Stage modal: "What this stage is" / "Typically looks like" / "To unlock" | `StageLadder.tsx:170-178` → keys in `stageIdentity.ts` → `src/i18n/en.json` | Hardcoded (frontend i18n) |
| "Why you're here" / "Focus of this stage" / "What success looks like" | `StageDetailCard.tsx:44-58` → `summaryKey`/`focusKey`/`successKey` | Hardcoded |
| Bottleneck / Objective / Milestone | `engine.ts` `STAGE_META` → i18n | Hardcoded |
| Recommended Growth System — name + summary | `growthSystems.ts` `CATALOG` TS constant | Hardcoded |
| Recommended Growth System — rationale | `growth-analyze` edge function, stored in `growth_assessments.ai_result` | AI-generated (prompt already DB-editable) |
| Roadmap task titles/descriptions | `growth_roadmap_tasks` | Already admin-managed |

Everything you listed is hardcoded except the one AI rationale sentence. Dutch translations for the stage keys are also missing today, so NL silently falls back to English.

Note: the existing `growth_systems_catalog` table is a different thing (Blueprint offer/channel compatibility) and cannot be reused here.

## The reusable pattern (Editable Product Content standard)

No generic CMS, no universal content table. Instead, a documented convention every future domain table follows — Business Blueprint content, Build Guide intros, Academy intros, Coach contextual content:

1. **Structured table per domain.** Real, typed columns for the fields that domain actually has. Base columns hold the default (English) copy.
2. **Localization** via a single `translations JSONB` column shaped `{ "nl": { "<column>": "..." } }`. No per-locale row duplication, no schema change to add a language.
3. **AI guidance** via a `ai_guidance TEXT` column: admin-editable, never rendered to users, injected into AI Actions as domain knowledge. Instruction blocks keep owning behaviour, reasoning and coaching method; these columns hold the evolving domain facts.
4. **Admin editing** via a standard CRUD component with a built-in EN/NL toggle and a clearly separated "AI guidance (not shown to users)" field.
5. **Delivery + caching** via one shared resolver helper — `resolveContent(row, lang)` — plus a React Query hook per domain with a shared cache policy, so content loads once per session.
6. **Access** — read for `anon` + `authenticated`, write restricted to app admins via `is_app_admin(auth.uid())`.

This is captured in a short `src/lib/content/README.md` plus the shared `resolveContent` helper in `src/lib/content/resolveContent.ts`, so the next domain is a table + a hook + an admin tab, not a new architecture.

## Scope of this implementation

Only `growth_stages` and `growth_systems`. Nothing else migrates.

### 1. `public.growth_stages`

One row per stage, seeded verbatim from today's English copy so the UI is unchanged on day one.

`stage` (pk), `label`, `summary`, `typical_profile`, `unlock_condition`, `focus`, `success_criteria`, `bottleneck`, `objective`, `milestone`, `ai_guidance`, `sort_order`, `translations` JSONB.

### 2. `public.growth_systems`

Replaces the hardcoded `CATALOG`: `id` (text slug), `name`, `summary`, `addresses`, `stage_relevance` (text[]), `related_module`, `ai_guidance`, `is_active`, `sort_order`, `translations` JSONB. Seeded with the four existing systems.

This also removes the drift risk between `growthSystems.ts` and the duplicated `ALLOWED_SYSTEM_IDS` list in `growth-analyze/index.ts:98-103`.

### 3. Frontend

- New `src/lib/growth/useGrowthContent.ts` (React Query, shared cache policy) fetching both tables.
- `StageLadder`, `StageDetailCard`, `AssessmentResult`, `GrowthRoadmapOverview` read from the hook via `resolveContent(row, i18n.language)` instead of `t(...)`.
- Icons/colours stay in `stageIdentity.ts` — design tokens, not copy.
- Static UI chrome ("Current stage", section headings) stays in i18n.
- The migrated stage keys are removed from `en.json`/`nl.json` so there is one source of truth.

### 4. Admin

New `src/components/admin/AdminGrowthStages.tsx` (stages + systems), following `AdminGrowthRoadmapTasks.tsx`. EN/NL toggle in the edit dialog; `ai_guidance` in its own section marked as AI-only. Added as tabs in the existing `growth` category of `AdminPanel.tsx`.

### 5. Edge function

`growth-analyze` builds its catalog block and validation set from `growth_systems`, and appends each system's `ai_guidance` (plus the current stage's `ai_guidance`) as contextual knowledge alongside the existing instruction blocks.

## Technical notes

- `growthSystems.ts` keeps its types/helpers; the `CATALOG` array is deleted once the table is live.
- No change to the scoring engine, gates, task activation, or roadmap structure.
- Verification: typecheck, then a Playwright pass through the assessment result and each stage dialog to confirm identical rendering, plus one admin edit round-trip.

## Deliberately out of scope

- Authoring the missing Dutch stage copy — the fields exist and are editable, but I won't write NL content unless asked.
- Migrating any other module's copy; only the pattern is established.
