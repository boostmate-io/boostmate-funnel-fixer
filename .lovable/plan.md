
# Growth Roadmap V2 — Final Plan (incorporating multi-stage task clarification)

Approved plan updated with your multi-stage task model. Ready to execute on build-mode switch.

## Multi-stage task applicability — final shape

Your proposed model is the cleanest fit and does not conflict with anything in the current schema. Adopting it as-is:

- `stage` — the **primary** stage for stage-specific tasks. Enum: `validate | attract | optimize | scale | systemize | any`.
- `stage = 'any'` — reserved exclusively for truly cross-stage foundation tasks (e.g. "Complete Business Blueprint"). Activation conditions decide when they surface.
- `applicable_stages` (nullable `text[]`) — optional. When set, the task also appears in these additional specific stages beyond its primary `stage`. When null, only the primary `stage` applies. `stage = 'any'` ignores this field.

Plan builder logic:

```
task is a candidate for the user's current stage S when:
  task.stage === 'any'
  OR task.stage === S
  OR (task.applicable_stages is not null AND S ∈ task.applicable_stages)
AND all activation_conditions evaluate true against workspace signals
```

This gives us three clean tiers without introducing indirection through stage-score conditions:

1. **Cross-stage foundations** → `stage = 'any'` (e.g. Blueprint).
2. **Stage-specific tasks** → single `stage` (e.g. Validate's "Design your Main Offer").
3. **Multi-stage strategic tasks** → primary `stage` + `applicable_stages` (e.g. "Build your Client Converter" primary `validate`, also applicable in `attract`, `optimize`).

Admin UI: `stage` is a dropdown; `applicable_stages` is a multi-select shown only when `stage !== 'any'`.

## No other changes to the approved plan

Everything else stands:
- Two new tables (`growth_roadmap_tasks`, `growth_task_progress`), typed condition vocabulary, no rules engine.
- `resource_type` includes `build_guide` from day one (renders "Coming soon" until wired).
- Canonical Growth Systems registry (Audience Builder, Client Converter, Offer Launcher, Launch Engine); AI output constrained by `enum`.
- Stages stay in code.
- Assessment retake remains the sole authority for stage promotion.
- Phased execution: Phase 1 fixes → Phase 2 data model + evaluator → Phase 3 admin UI → Phase 4 dashboard/detail UI → Phase 5 Coach integration → Phase 6 progressive completion signals.

## Phase 1 scope (execute now)

1. **`/assessment` blank screen fix** — the current `if (isReady && user) return <Navigate>` sits between hooks, so when auth flips to ready+user the hook count drops and React errors out into a blank screen. Replace with a useEffect-driven redirect + a neutral loader guard for the `!isReady || user` window.
2. **CTA copy** — add `growth.createAccountCtaButton` in `en.json` / `nl.json` ("Create your free account" / "Maak je gratis account aan") and use it in `PublicAssessment.tsx` instead of `t("auth.signUp") || "Create account"`.
3. **Canonical Growth Systems** — rewrite `src/lib/growth/growthSystems.ts` to expose only Audience Builder, Client Converter, Offer Launcher, Launch Engine (each with id, name, summary, stage_relevance, related module). Existing `serializeCatalogForPrompt()` and getters keep their signatures; call sites stay unchanged.
4. **Reject invented systems** — in `supabase/functions/growth-analyze/index.ts`, drop `recommended_growth_system` when its `id` is not in the canonical registry (validated server-side against a shared allowed-id list). No schema change; failure mode is a missing field, not a fabricated one. Coach-side registry injection covered in Phase 5.
5. **Coach: no high-ticket assumption** — patch `coach:offer-strategy` instruction block to add an explicit routing rule: before entering any walkthrough, check Blueprint offer type; if unknown, ask the user which offer tier fits (free / low-mid / high-ticket) rather than defaulting to high-ticket. Also add a Coach-level rule forbidding invention of Growth Systems / modules / tasks outside provided lists (short addition to `coach:base` or `coach:global`).

Await build-mode switch and I'll execute Phase 1.
