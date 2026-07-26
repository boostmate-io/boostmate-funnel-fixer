## Business Blueprint Context Engine V2 — one registry, two consumers

Scope: the Business Blueprint module only (Customer Clarity, Offer Design, Brand Strategy, Authority & Content). Growth Roadmap, Growth Architecture, Funnels, Copy Documents and Analytics stay untouched. No instruction-block or coaching-behaviour changes.

Approved safeguards, now part of the plan:
- **Zero visible change.** Tab structure, field order, labels, helper text, accordions, input widgets and every progress percentage must stay identical. The only intentional behaviour change is the confirmed bug fix below (Brand Strategy Coach writes were silently dropped).
- **Full data, scoped writes.** Field- and section-scope Coach conversations receive the *complete* current Blueprint for the account, while the write scope stays limited to the active field/section exactly as today.

### Verified current state (why this is needed)

- `supabase/functions/_shared/blueprintSchema.ts` is the only definition the Coach can write to, but only `clarityConfig.ts` derives from it. `brandStrategyConfig.ts`, the Offer Design tab configs, `proofAuthorityTypes.ts` and `growthSystemTypes.ts` are independent hardcoded definitions.
- Brand Strategy has no fields in the shared schema and `applyBlueprintWrites` doesn't even select the `brand_strategy` column — Coach proposals there can never be applied (the confirmed bug).
- The schema still exposes `proof_authority.objections.*` and `growth_system.*`, which the V3/V2.1 passes removed from the UI.
- Snapshots are partial: `CustomerClaritySection` sends only `{ customer_clarity }`, `BrandIdentitySection` only `{ brand_strategy }`, `SectionHelpCoach` sends `null`.
- Progress is computed by four separate bespoke functions.

### 1. The Registry (one shared module, no code generation)

`supabase/functions/_shared/blueprintRegistry.ts`. The `@shared/*` alias already exists in `vite.config.ts`, `tsconfig.json` and `tsconfig.app.json`, so the **same file** is imported by the UI (`@shared/blueprintRegistry`) and by the `coach-chat` edge function. This is simpler and safer than the generator + CI staleness check in the earlier draft: there is literally one file, so drift is impossible.

Shape:

```text
BlueprintRegistry
  tabs[]        id, label, column, iconKey, progressAggregate
    subBlocks[] id, label, description, aliases[], iconKey, progress rule
      fields[]  path, key, label, labelTemplate, helper, placeholder,
                kind (text | textarea | tags | suggested-tags | chips-single |
                      chips-multi | bullet-list | colors),
                options[], suggestions[], fullWidth, rows,
                aliases[], aiWritable, countsTowardProgress
      lists[]   basePath, label, itemLabel, itemFields[], aiIndexedCount,
                suggestedCount, aiWritable, countsTowardProgress
```

Pure data only (no React, no icons, no Supabase) so Deno can import it; icons are `iconKey` strings resolved in the UI. Business-type-dependent Customer Clarity labels are stored as `labelTemplate` with `{noun}`, `{nounSingular}`, `{Noun}`, `{NounSingular}`, `{notFitSuffix}` tokens, so personalization stays identical without duplicating labels.

Derived exports: `BLUEPRINT_FIELDS` (flat + expanded list item paths), `BLUEPRINT_FIELD_BY_PATH/KEY`, `BLUEPRINT_SUB_BLOCKS`, `BLUEPRINT_COLUMNS`, `renderBlueprintFieldPathsPrompt()`, `renderBlueprintStructurePrompt()`, and the progress helpers.

### 2. Progress — identical numbers

Registry declares *which* rule applies per sub-block:
- `units` — every field/list flagged `countsTowardProgress` is one equally-weighted unit. Reproduces Customer Clarity (4/4/3/3), Brand Strategy (4/3/3/3) and Authority & Content (4 + 4 + 2 pooled units) exactly.
- `custom` + `ruleId` — the four weighted Offer Design rules (`calcAngleProgress`, `calcStackProgress`, `calcPricingProgress`, `calcEcosystemProgress`) stay as implementations in the UI layer and are referenced by id, because their weighting cannot be expressed as equal units without changing the displayed percentages.
Tab totals use the declared `progressAggregate` (`average` for Clarity/Offer/Brand, `pooled` for Authority & Content) to match today's math.

### 3. UI consumes the Registry

- `clarityConfig.ts` and `brandStrategyConfig.ts` become thin adapters that read the registry and layer on icons and business-type copy.
- `types.ts` (`CLARITY_FIELDS`, `calculateSubBlockProgress`, `calculateClarityProgress`), `calcBrandTabProgress`, `calcBrandIdentityProgress` and `calcProofAuthorityProgress` are re-implemented on top of the registry helpers, keeping their existing exported signatures so no component needs restructuring.
- Offer Design and Authority & Content editors keep their bespoke accordion components unchanged; the registry supplies their field/list metadata for the Coach, write validation and progress.

### 4. Coach context

- `coach-chat` imports the registry directly and loads the **full `business_blueprints` row** for the conversation's sub-account server-side, using it as the Blueprint snapshot for every scope (field, section, global). Partial/null client snapshots are no longer trusted.
- The system prompt gains the registry-generated structure map plus the existing field-path catalogue, so the Coach always knows both the current structure and the user's data.
- Write scoping is unchanged: the existing `targetRootPrefix` tab guard, sub-block scoping, `allowedPaths` and handled-path rules continue to limit writes to the active field/section.
- Instruction blocks (`coach:base`, `coach:blueprint-field`, `coach:blueprint-section`, `coach:global`, knowledge blocks, task blocks) load exactly as today; none are rewritten.
- Client-side context builders stop assembling partial snapshots.

### 5. Write-path parity

`applyBlueprintWrites` derives its root columns and writable paths from the registry and adds the missing `brand_strategy` column. Stale writable paths (`proof_authority.objections.*`, `growth_system.*`) disappear because the registry no longer declares them. `blueprintSchema.ts` is retired and replaced by a thin derived facade (or removed once imports are updated), so no second definition remains.

### Sequencing

1. Registry module encoding today's real fields for all four tabs (including Brand Strategy).
2. UI adapters + registry-driven progress.
3. `coach-chat` on the registry + server-side full-Blueprint loading; simplify client context builders.
4. Write-path parity and retirement of the old schema file.

### Verification and reporting

Typecheck, then for each of the four tabs: confirm identical fields, labels, inputs, accordions and progress percentages, and apply one AI Coach write (including Brand Strategy). Final report lists files added/changed/retired, any behaviour that could not remain identical, per-tab verification results, and the four Coach write results.

### Technical notes

- No database migration; existing Blueprint JSON and stored conversations remain valid because field paths are unchanged.
- Edge functions never import from `src/`; the shared direction is `_shared/` → both runtimes.
