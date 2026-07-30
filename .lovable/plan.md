## Goal

Replace the Funnel Audit wizard on `/` with the Growth Assessment, and extend the public result so an anonymous visitor sees their Growth Stage **and** the exact same Growth Roadmap UI they'll use inside the app — rendered read-only, ending in a "Create your free account" CTA. After signup the assessment, stage and roadmap attach to the new workspace and the stage cycle starts automatically.

The old Funnel Audit code stays in place, just unhooked from the homepage.

---

## 1. Homepage becomes the assessment

`src/pages/Index.tsx` currently embeds the audit wizard (`AuditWizard` → `AnalyzingScreen` → `AuditResults` with hardcoded mock scores). Replace that body with the assessment flow already used by `PublicAssessment.tsx`: intro → wizard → analyzing → result.

- Extract the shared flow out of `PublicAssessment.tsx` into a reusable component so both `/` and `/assessment` render the identical experience (`/assessment` keeps working as a direct link).
- Keep the existing header, logged-in redirect to `/dashboard`, and `AuthModal` wiring.
- Audit components, `mockAuditData.ts`, the scrape/analyze libs and edge functions, and the `audits` table are untouched — just no longer reachable from `/`.

---

## 2. One Growth Roadmap component, two modes

`GrowthPlanPanel` today both fetches workspace data (via `useGrowthPlan`) and renders the roadmap. Split that responsibility so the rendering is shared:

```text
useGrowthPlan (workspace)  ──┐
                             ├─► GrowthPlanPanel (pure rendering, mode: interactive | preview)
usePreviewGrowthPlan (anon) ─┘
```

- `GrowthPlanPanel` keeps its entire current layout, grouping, ordering, task cards, stage identity, decision/reassess/normal variants and visual hierarchy. It stops fetching and instead receives `plan`, `activeCycle`, `workspaceState`, `loading` plus a `mode` flag.
- A thin container preserves today's in-app usage, so `GrowthRoadmapModule` and `GrowthRoadmapOverview` behave exactly as before.
- In `preview` mode the same component renders with interactions disabled: no status toggles, Start/Complete/Skip/Snooze, decision pickers, AI Coach buttons, resource links or retake CTA. Tasks render in their normal card form, visibly non-interactive.

This guarantees the anonymous roadmap is literally the app's roadmap, not a parallel implementation.

---

## 3. Anonymous roadmap data

The roadmap catalog is currently readable by signed-in users only, so two things are needed:

**Access:** allow anonymous read of the two product-content catalogs (`growth_roadmap_tasks` and `growth_systems_catalog`, active rows only). These hold no customer data — they are the same product copy every signed-in user already sees. `growth_stages` is already public.

**Preview derivation:** a `usePreviewGrowthPlan` hook that runs the same pure `derivePlan` evaluator against an empty signal context and the assessment's computed stage, with no progress rows and no cycle writes. Result: every foundation + stage task in its natural order, none completed.

---

## 4. Public result page framing

Above the roadmap, contextual copy in the same visual language as the app:

> Based on your Growth Assessment, you've been placed in the **Validate** stage.
> Below is the roadmap you'll follow inside Boostmate.
> Create your free account to start completing these tasks with the help of the AI Coach.

Below the roadmap, a closing CTA card → opens `AuthModal` in signup mode. Where an interactive action would normally sit, the preview surfaces the account-creation CTA instead.

---

## 5. Claim on signup also starts the cycle

The handoff already works: the claim token is stashed before signup, and `usePendingGrowthClaim` calls `claim-growth-assessment` once the dashboard mounts with a workspace.

Extend that function so, right after attaching the assessment, it opens the initial stage cycle for the computed stage using the existing cycle-transition routine (already idempotent). The user lands in the dashboard on the exact roadmap they just saw, now interactive. Route them to the Growth Roadmap after a claim rather than the generic overview.

---

## 6. Copy

Reframe the homepage intro from "Free Funnel Audit" to "Free Growth Assessment & Roadmap"; update `<title>` and meta description to match.

---

## Technical notes

- Migration: `GRANT SELECT ... TO anon` plus anon SELECT policies scoped to `is_active = true` on `growth_roadmap_tasks` and `growth_systems_catalog`. No change to `growth_assessments` policies — the claim-token pattern already covers the anonymous row.
- `GrowthPlanPanel.tsx` refactored to presentational props + `mode`; new `GrowthPlanContainer.tsx` wraps `useGrowthPlan` for in-app callers so `GrowthRoadmapModule`/`GrowthRoadmapOverview` change only their import.
- New `src/lib/growth/usePreviewGrowthPlan.ts` — builds an empty `ConditionContext`, calls `derivePlan`, performs no writes.
- `PublicAssessment.tsx` flow extracted to `src/components/growth/AssessmentFlow.tsx`, consumed by both `Index.tsx` and `PublicAssessment.tsx`; `AssessmentResult.tsx` gains an optional roadmap slot so the in-app result view is unaffected.
- `claim-growth-assessment/index.ts`: after the claim update, call `growth_cycle_transition` with `start_initial_cycle` and the row's `computed_stage` (service role, membership check skipped for null `auth.uid()`); failures logged but non-fatal so the claim never breaks.
- No changes to `handle_new_user_role`, `AuthModal`, `ProtectedRoute`, or `WorkspaceContext`.
