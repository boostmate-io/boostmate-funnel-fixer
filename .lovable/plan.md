## Scope

Reduce first-time Blueprint personalization to a single question ("What best describes your business?") and stop rendering empty snapshot placeholders for the four removed fields. No DB migration, no schema changes, no changes to business-type-driven personalization.

## Pre-plan verification

Confirmed by reading current code:
- `BlueprintSetupWizard.tsx` is self-contained: steps 1–4 exist only inside this file. No other component references those wizard steps. Removing Q2–Q5 will not break anything outside the wizard.
- `useWorkspaceSettings` types (`help_achieve`, `who_help`, `main_goal`, `biggest_challenge`) stay unchanged — DB columns and reads elsewhere (SharedBlueprint, BusinessBlueprintModule coach context) still work with legacy data.
- `BlueprintOverview` Business Snapshot renders all 5 cards unconditionally with "Not set" fallback → for new users this would show 4 empty cards. Needs a conditional-render fix.
- `BlueprintViewMode` uses `KeyValueGrid` and per-field `show=` guards → already hides empty values, only the "Goal:" badge (line 405) is already guarded by truthiness. No change needed there.

## Changes

### 1. `src/components/business-blueprint/BlueprintSetupWizard.tsx`
- Remove steps 1–4 (helpAchieve, whoHelp, mainGoal, biggestChallenge) and their state, GOALS constant, and re-sync effect lines for those fields.
- `totalSteps = 1`; drop step pips or render a single filled bar.
- Footer: no Back button; single "Finish setup" primary button (still labelled "Save changes" in edit mode).
- `handleFinish` only writes `business_type` + `setup_status: "completed"`. Leaves legacy field values in DB untouched (no writes = no overwrites).
- Keep `initialValues` prop signature so existing callers compile; unused legacy props simply ignored.
- Update `DialogTitle`/description copy to reflect a 10-second setup.

### 2. `src/components/business-blueprint/BlueprintOverview.tsx` (Business Snapshot card, ~line 219–236)
- Build the items array dynamically: always include Business Type; include the other four entries only when their value is non-empty.
- Drop the "Not set" italic fallback branch (no longer needed since empty items aren't rendered).
- Grid keeps `lg:grid-cols-5` for legacy users with full data; collapses naturally when fewer items.
- Keep "Edit Snapshot" button → opens the (now single-question) wizard, so users can still change business type here.

### 3. No changes to
- `BusinessBlueprintModule.tsx` (still forwards legacy fields for coach/AI context — harmless when empty).
- `BlueprintViewMode.tsx` (already guards empty values).
- `SharedBlueprint.tsx`, `useWorkspaceSettings.ts`, DB schema, types.
- `businessTypes.ts`, all personalization consumers.

### 4. Verify
Run `tsgo` typecheck after edits.

## Out of scope
- No DB migration or column removal.
- No changes to Roadmap, Coach, or business-type personalization behavior.
- Manual "Personalize" action remains functional via the simplified wizard.
