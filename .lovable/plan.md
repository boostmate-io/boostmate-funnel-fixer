
# Growth Architecture V5 — Offer-Driven UX Redesign (Revised, r2)

Adds auto-skip behavior when a wizard step has only one valid choice. All other content from the previously approved revision is preserved.

## A. Final UX — updates

### Add Route wizard (`AddRouteWizard.tsx`) — auto-skip rules

The wizard evaluates each step's option set at the moment it would be shown and **skips the step when there is exactly one valid option**, preselecting that option and advancing. The user always reaches Step 5 (Review), which shows every preselected value and links back to any skipped step via `Change`.

**Step 1 — Target Offer**
- If the workspace has exactly one offer → auto-select and skip. Otherwise render the offer grid.
- Roadmap-launched flow: still skips when only one offer exists; the preselected system context flows through unchanged.

**Step 2 — Source**
- If the target offer has zero incoming `offer_relationships` → force External and skip the source step (no choice to make).
- Otherwise render both options; do not auto-select `From another offer` even when relationships exist, because External is always a valid alternative.

**Step 3 — Growth System**
- Compute the compatible-and-buildable set for the chosen offer (seed template present; non-admin gate applied).
- If exactly one system qualifies → auto-select and skip.
- If Roadmap preselected a system AND it qualifies AND no other qualifies → same behavior (auto-skip).
- If Roadmap preselected a system that does NOT qualify → do not auto-skip; render Step 3 with the incompatibility explainer even when only one alternative qualifies (so the user sees why the roadmap system was rejected). This preserves transparency over convenience.

**Step 4 — Channels (external routes only)**
- Primary channel: if exactly one compat channel exists for the chosen system → auto-select and skip the primary picker. The `Additional channels` block only renders if two or more compat channels exist; otherwise the whole channel step is skipped.
- Offer-to-offer routes: channel step remains skipped by default, as previously approved. Auto-skip logic does not change this.
- Empty compat: not a valid auto-skip; the config-warning branch renders as before (blocks non-admins, warns admins).

**Step 5 — Review (always shown)**
Every preselected value listed with a small `Auto-selected — only option available` chip on skipped steps and a `Change` link that re-opens that step, unlocking the wizard back to it. Ensures the user can always inspect and override before committing. The primary button `Add Growth Route` still creates the route without building the funnel.

### Wizard resume behavior
When a user clicks `Change` on Step 5, that step becomes editable and its auto-skip flag clears for the remainder of the session so the user isn't bounced past it again after backtracking.

### Roadmap flow interaction
The offer-first principle still holds: Step 1 is only skipped when there is exactly one offer, never because a roadmap task exists.

## B–D. Recommendation rules, Map graph rules, Roadmap behavior
Unchanged from the previously approved revision.

## E. Implementation phases — deltas

**Phase 1 additions:**
1. `AddRouteWizard.tsx`: implement `computeNextStep(state)` that walks steps 1→5, applying auto-skip predicates in order and stopping at the first step that requires input. Every advance and back-navigation runs through this function so skip decisions stay consistent when upstream selections change.
2. Track per-step `wasAutoSkipped: boolean` in wizard state so Step 5 can render the `Auto-selected` chip and the `Change` link can clear the flag.
3. Add tests (or targeted manual acceptance) for the four skip predicates (single offer / no relationships / single compatible system / single compat channel).

No other implementation changes; edge functions, hooks, and map code are unaffected.

## F. Acceptance criteria — additions

- Workspace with **1 offer, 1 compatible buildable system, 1 compat channel** → opening the wizard lands directly on Step 5 Review with all three fields preselected and marked `Auto-selected`; clicking `Add Growth Route` creates the route.
- Workspace with **1 offer, 2 compat channels** → wizard lands on Step 4 with the offer and system already preselected and marked `Auto-selected`; the user only picks the primary channel.
- Workspace with **3 offers, 1 compatible system for the chosen offer, 1 compat channel** → after Step 1 the wizard jumps straight to Step 5.
- Target offer with **zero incoming relationships** → Step 2 is skipped and the source is forced to External on Review.
- Target offer **with** incoming relationships → Step 2 is shown (External remains a valid alternative, so no auto-skip).
- Roadmap-preselected system that is **incompatible** with the chosen offer → Step 3 is rendered even when only one alternative qualifies, with the incompatibility explainer visible. Auto-skip does not hide this decision.
- Clicking `Change` on any auto-skipped field in Step 5 re-opens that step and keeps it visible for the rest of the session even if the option set narrows to one again.
- Empty `growth_system_channel_compat` for the chosen system does not trigger the channel auto-skip; the config warning renders instead.

All previously approved acceptance criteria remain in force.
