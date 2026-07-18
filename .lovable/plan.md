
# Growth Roadmap — Final V1 Plan (Dashboard-first, revised)

Roadmap is the Dashboard's core purpose. `/growth-roadmap` is the detail view. This revision locks in three additional implementation requirements: secure claim handoff via edge function, Stage 0 excluded from public logic, and a Growth Systems catalog structured for future dynamic injection.

---

## Locked decisions

- **Dashboard `/dashboard`** = strategic home. Active Growth Stage, bottleneck, objective, milestone, roadmap progress, top-3 priorities (each linking to a module / Growth System / Build Guide), recommended Growth System. **No module shortcuts.**
- **Empty state:** no assessment → hero CTA "Get your Growth Roadmap · 5 min".
- **Stale state:** >30 days → banner + Retake affordance (auto-reassessment stays V2).
- **`/growth-roadmap`** = detail view: full per-question scores, history, retake, AI reasoning.
- **Public `/assessment`** = wizard + result + signup handoff via `claim_token`. Homepage `/` untouched.
- **Sidebar:** "Growth Roadmap" entry sits below Blueprint → `/growth-roadmap`. Funnel Audit entry removed from sidebar; routes and `audits` table preserved.
- **Assessment (16 questions)** and **deterministic scoring** unchanged from prior revision.
- **Stage 0 / Start Here:** authenticated-only. Public assessment never emits Stage 0. Exact Blueprint-completeness rules deferred; V1 engine leaves a `computeStartHere(profile)` extension point that returns `null` for now.

## New requirements incorporated

### 1. Secure claim handoff (edge function owns the write)

Anonymous RLS is deliberately narrow. Anonymous users can insert an assessment row and can read only their own row back by `claim_token`, but they cannot mutate it. Attaching `user_id` + `sub_account_id` happens exclusively through the `claim-growth-assessment` edge function under `service_role`.

RLS + GRANTs on `growth_assessments`:

- `authenticated`: full CRUD scoped by `sub_account_id` membership. Users cannot write `claim_token`, cannot flip `source`, cannot alter `computed_stage` or `stage_scores` after insert (enforced by a `BEFORE UPDATE` trigger that resets immutable columns to their old values).
- `anon`: `INSERT` only when `user_id IS NULL AND sub_account_id IS NULL AND source = 'public' AND claim_token IS NOT NULL`. `SELECT` only when `claim_token` matches a token supplied via a signed URL param (single-row lookup, used to render the result page pre-signup). **No anonymous UPDATE, no anonymous DELETE.**
- `service_role`: full access. The claim edge function is the only path that writes `user_id` / `sub_account_id`.
- Partial unique index enforcing one `is_active = true` per `sub_account_id`.
- `claim_token` becomes `NULL` after successful claim (single-use).

Claim flow:

```text
public wizard  ──► anon INSERT (claim_token=T, user_id=NULL)
             │
             └── result page (read own row by T)
                       │
   signup / login ─────► redirected to  /?next=/dashboard&claim=T
                                                  │
                    client calls  claim-growth-assessment  with:
                       - user session JWT (validated via getClaims)
                       - claim_token T
                                                  │
                          edge function (service_role):
                            1. verify JWT, resolve user_id + active sub_account_id
                            2. lookup row by T, assert user_id IS NULL
                            3. atomic: set user_id, sub_account_id, source='public',
                               is_active=true (demote prior active), claim_token=NULL
                            4. return {assessment_id}
```

Client never sees or holds `service_role`. Anonymous cannot escalate — RLS blocks any anon UPDATE, and the edge function is the only place `user_id` can be written.

### 2. Stage 0 / Start Here isolated from public logic

- `computeGrowthStage()` in the pure engine returns one of: `validate | attract | optimize | scale | systemize`. It never returns `start_here`.
- A separate `computeStartHere(profile)` function reads authenticated context (Blueprint completeness, workspace age, etc.). V1 implementation returns `null` — a no-op — so the Dashboard renders the engine's stage output directly.
- The Dashboard reads `startHere = computeStartHere(profile)` and, if non-null, overlays a "Start Here" banner above the stage view. Public `/assessment` never calls `computeStartHere`.
- When the exact Start Here rules are defined later, only `computeStartHere` and the Start Here component change — engine, storage, AI Action, and public flow remain untouched.

### 3. Growth Systems catalog: Instruction Block now, dynamic-ready

The recommended Growth System is chosen by the AI Action against an enumerated list. To make future dynamic injection cheap:

- **V1 static catalog** lives in `src/lib/growth/growthSystems.ts` as an exported array. Each entry has `id`, `label`, `description`, `related_module`, `stage_relevance[]`. This file is the **single source of truth in code**.
- The `growth:recommendation-rules` Instruction Block does **not** embed the list inline. It contains rules ("recommend one system from the catalog provided in this request"). The list is passed to the AI Action at call time from `growthSystems.ts`.
- The AI Action call site builds the prompt by concatenating the Instruction Block with a rendered catalog section (`## Available Growth Systems\n- id: …\n  description: …`). Output schema requires `recommended_growth_system.id` to match an id from the injected catalog; a post-process validation rejects non-matching ids and re-prompts once, then falls back to the highest-relevance system for the computed stage.
- **V2 dynamic path** simply swaps `growthSystems.ts` for a DB-backed loader (`loadAvailableGrowthSystems(sub_account_id)`) — same shape, same call site. No AI Action or prompt-block changes required. The Instruction Block is already list-agnostic.

This means: today the list is code-owned and easy to edit, and later the same call site pulls from a table (e.g. `growth_systems` or a workspace-scoped subscription table) with zero refactor of the AI wiring.

## Architecture

```text
                 GrowthAssessmentWizard (shared)
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   /assessment (public)              Dashboard empty state
   anon insert + claim_token         authenticated insert
                                            │
                            computeGrowthStage(answers)   ◄─ pure TS engine
                                            │
                execute-ai-action("growth_assessment_analysis",
                                  { block: growth:recommendation-rules,
                                    catalog: growthSystems })
                                            │
                              growth_assessments row (is_active=true)
                                            │
                ┌───────────────────────────┴──────────────────────────┐
                │                                                      │
        Dashboard (/dashboard)                              /growth-roadmap
        Active snapshot + computeStartHere overlay          Details, history, retake
```

## Database

```sql
create table public.growth_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  sub_account_id uuid references public.sub_accounts(id) on delete cascade,
  claim_token uuid unique,
  source text not null check (source in ('public','internal','auto')),
  answers jsonb not null,
  stage_scores jsonb not null,
  gate_results jsonb not null,
  computed_stage text not null,
  ai_result jsonb,
  ai_confidence text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

- Migration includes RLS + GRANTs + partial unique index + immutability trigger for anon-inserted rows.
- Trigger `growth_assessments_lock_immutable`: on UPDATE by non-service_role, forbid changes to `answers`, `stage_scores`, `gate_results`, `computed_stage`, `ai_result`, `source`, `created_at`.

## AI Action + Instruction Blocks

- **AI Action:** `growth_assessment_analysis`. Structured output: `next_priorities[]` (max 3, each with `title`, `rationale`, optional `related_module`), `recommended_growth_system.id`, `confidence`. No stage field in output — engine owns stage.
- Post-process guardrails: strip any stage-like fields; validate `recommended_growth_system.id` against injected catalog with one repair retry.
- **Instruction Blocks:**
  - `growth:framework` — stages, bottlenecks, objectives, milestones. Also linked to `coach-chat`.
  - `growth:analysis-rules` — how to interpret answers within the fixed stage.
  - `growth:recommendation-rules` — list-agnostic selection rules; consumes the injected catalog.

## Component & file layout

```
src/lib/growth/
  engine.ts               # computeGrowthStage — pure, unit-tested
  startHere.ts            # computeStartHere — returns null in V1
  questions.ts            # 16-question catalog
  growthSystems.ts        # V1 static catalog; V2 swap point
  types.ts

src/components/growth/
  GrowthAssessmentWizard.tsx
  GrowthRoadmapResult.tsx
  PriorityCard.tsx
  StageBadge.tsx
  RoadmapProgress.tsx
  DashboardEmptyState.tsx
  DashboardStaleBanner.tsx
  StartHereBanner.tsx           # rendered only if computeStartHere returns non-null

src/pages/
  GrowthAssessment.tsx           # /assessment (public)
  Dashboard.tsx                  # /dashboard — rewritten
  GrowthRoadmap.tsx              # /growth-roadmap — details/history/retake

supabase/functions/claim-growth-assessment/
  index.ts                       # JWT-verified, service_role writes
```

## Phased implementation

**Phase 1 — Foundation**
1. Migration: `growth_assessments` + RLS + GRANTs + partial unique index + immutability trigger.
2. `engine.ts` + `startHere.ts` (V1 stub) + `questions.ts` + `growthSystems.ts` + Vitest coverage.
3. Seed 3 Instruction Blocks + register `growth_assessment_analysis` AI Action. Catalog injection wired at call site.

**Phase 2 — Public assessment + secure claim**
4. `GrowthAssessmentWizard`, `GrowthRoadmapResult`, `PriorityCard`.
5. `/assessment` page: anon insert, result render, CTA → AuthModal with `?next=/dashboard&claim=<token>`.
6. `claim-growth-assessment` edge function (JWT via `getClaims`, service_role write, single-use token, demote prior active row atomically).
7. Wire AuthModal / post-signup redirect to call the edge function when `claim` is present.

**Phase 3 — Dashboard as Roadmap**
8. Rewrite `src/pages/Dashboard.tsx`: empty state / active snapshot / stale banner / Start Here overlay slot.
9. Remove module shortcuts entirely.

**Phase 4 — Detail view + sidebar**
10. `/growth-roadmap`: full per-question scores, history, retake flow, AI reasoning panel.
11. Sidebar: add "Growth Roadmap" below Blueprint. Remove Funnel Audit entry.

**Phase 5 — Coach integration**
12. Link `growth:framework` to `coach-chat`. Inject active assessment into Coach context.

**Phase 6 — Polish + verify**
13. i18n (EN + NL).
14. Error paths (429/402/AI fail/claim errors) reuse existing patterns.
15. Playwright smoke: public → signup → claim edge function → Dashboard shows same roadmap; retake demotes prior; anon UPDATE attempt is rejected by RLS.

## Deferred to V2+

- Auto-reassessment from Blueprint/assets/analytics signals.
- Assessment-to-assessment comparison UI.
- Growth System completion feeding scores.
- Build Guides per priority (V1 links to modules only).
- Agency roadmap comparison across client workspaces.
- Concrete Stage 0 / Start Here rules (extension point ready).
- Dynamic Growth Systems catalog (swap point ready in `growthSystems.ts`).

## Edge cases handled in V1

- Partial wizard completion not persisted.
- Signup email ≠ assessment email: irrelevant — handoff is by `claim_token`.
- Retake: new row `is_active=true`, prior row flipped to `false` atomically (partial unique index enforces).
- Duplicate claim attempts: token is single-use; second call returns idempotent success if same user, 409 otherwise.
- Expired/invalid claim token: edge function returns 404; Dashboard falls back to empty state.
- Fresh authenticated user with no public assessment: Dashboard empty-state hero.
- Stale roadmap: banner + Retake at >30 days.
- Agency workspace switch: Dashboard re-renders for the newly-selected `sub_account_id`.
- Funnel Audit reactivation: single feature flag re-adds sidebar entry.
- Growth System catalog drift: mismatch between AI output and catalog triggers one repair retry, then a deterministic fallback.
