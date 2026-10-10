# Plan: Extend the Blueprint Registry for the Universal Offer Editor (Step 1)

Planning only. Step 1 itself adds metadata to the registry and changes no screen, prompt, Coach write-back or progress number.

## 1. Current state (Offer Design in `blueprintRegistry.ts`)

| Sub-block | In registry | Incomplete / missing |
|---|---|---|
| angle | main_offer_name, short_description, core_outcome, 4 angle_* fields, framework.name/description, core_promise.desired_outcome/timeframe/timeframe_custom/guarantee, list framework.pillars (name, description) | `timeframe` is `text` with the allowed values only in helper text, no option list |
| stack | lists deliverables (name, description, frequency), resources (name, resource_type, description), support_channels (name, description, frequency), bonuses (name, description, perceived_value), milestones (phase_name, description, expected_outcome); delivery_timeline, delivery_timeline_custom | `frequency`, `delivery_timeline` have no option list; **missing** `deliverables[].delivery_types`, `bonuses[].delivery_types` |
| pricing | list payment_plans (type, custom_label, amount, duration); core_price, guarantee_type, guarantee_custom, guarantee_details | `core_price` / `amount` typed `text` (number only via a hardcoded regex in applyBlueprintWrites); `type`, `guarantee_type` have no option list; **missing** recurring_enabled, recurring_offer.{name, monthly_price, description, ongoing_value, delivery_types, interval}, premium_enabled, premium_upgrade.{name, price, description, additional_value} |
| ecosystem | no fields; Coach paths `offer_ecosystem.<tier>.new_<n>.<field>` hand-written in the prompt footer and coach-chat | **missing** offer fields: name, description, core_outcome, price, delivery_types |

Duplicated today:
- `applyBlueprintWrites.ts` hard-codes which pricing paths are numbers or yes/no switches, including recurring/premium paths the registry doesn't know.
- The Offer tabs hard-code about 56 labels and about 33 Coach paths.
- `src/lib/blueprintFields.ts` is a second, older list used by Copy Components.

## 2. Schema extensions (all optional, additive)

On `RegistryField`, `RegistryListItemField` and `RegistrySubBlock`:

```ts
valueType?: "string" | "number" | "boolean" | "enum" | "string[]"; // default "string"
enumValues?: { value: string; label: string }[];  // used when valueType = "enum"
control?: OfferControlKey;     // name of a specialised UI control, e.g. "timeframe",
                               // "delivery-types", "currency-amount", "toggle", "payment-plan-type"
appliesToTiers?: EcosystemTier[] | "all"; // offer categories (Offer Design only)
editorOnly?: boolean;          // hidden from Coach prompts and field lookups (see §6)
```

- `control` is only a name. The editor holds the map from name to component, so the registry contains no UI code.
- Existing `kind` keeps driving the Coach prompts. Existing `options` stays reserved for the chips fields already in use, so their screens don't change.
- On `RegistryListItemField`, also add `aiWritable?: boolean` (default true). For example, `delivery_types` is not AI-writable.

New export in the same file (not a second registry):

```ts
export const OFFER_ITEM_FIELDS: RegistryField[]; // name, data.description, data.core_outcome, data.price, data.delivery_types
export const OFFER_DESIGN_ROOT = "offer_stack";
export function offerRelativePath(path: string): string; // "offer_stack.pricing.core_price" -> "pricing.core_price"
export function fieldsForTier(tier: EcosystemTier): { subBlocks: RegistrySubBlock[]; itemFields: RegistryField[] };
```

## 3. Offer categories

- Step 1 values:
  - angle, stack and pricing sub-blocks: `appliesToTiers: ["core"]`;
  - `OFFER_ITEM_FIELDS`: `"all"`.
- This matches today's behaviour exactly: Core offers get the full design, every other tier gets the simple fields.
- Nothing reads `appliesToTiers` except the new `fieldsForTier` helper, so the Blueprint screens and prompts are unaffected.
- Widening a category later (e.g. Premium gets Stack) becomes a one-line registry change.

## 4. Special controls and list items

- The registry declares what each value is: `valueType`, `enumValues`, `control`.
- The editor decides how to show it. Specialised components stay as they are (delivery-type picker, payment plans, timeframe picker, framework section).
- They are linked by the `control` name only.
- A list keeps its `itemFields`. Item IDs, ordering and add/remove stay in the components.

## 5. Paths: primary vs individual offers

- Registry paths stay where they are (`offer_stack.*`), so the Coach and its checks are untouched.
- Editors work with offer-relative paths via `offerRelativePath`.
- The offer data layer (`offerRepository`) maps them to storage:
  - primary Core offer → `business_blueprints.offer_stack.<rel>`;
  - extra Core offer → `offers.data.design.<rel>`;
  - other tiers → `OFFER_ITEM_FIELDS` paths on the offer row.
- The registry never knows where data is stored.

## 6. AI Coach and progress compatibility

- **Coach prompts must stay identical.** The structure prompt prints field counts per sub-block, and both prompts read `BLUEPRINT_FIELDS`, so:
  - `editorOnly` fields are left out of `BLUEPRINT_FIELDS`, `BLUEPRINT_FIELD_BY_PATH` and those counts;
  - the newly added recurring/premium/delivery_types definitions start as `editorOnly: true` and `aiWritable: false`.
- **Write-back checks:** unchanged. Paths the Coach isn't given still get rejected.
- **List coaching:** unchanged (`basePath`, `itemFields`, `aiIndexedCount`).
- **Progress:** the custom rules (`offer.angle/stack/pricing/ecosystem`) and their code stay. The new metadata is not read.
- **Later (not Step 1):** replace the hard-coded number/yes-no path lists in applyBlueprintWrites with registry `valueType` lookups. Ecosystem Coach paths and coach-chat matching come from `OFFER_ITEM_FIELDS`.

## 7. Reusing the existing field screens

- `FieldCard` and the `toFieldDef` / `subBlockFields` bridge support text, textarea, tags, chips, bullet list and colours. They can render the simple Offer fields: angle text fields, the framework name, guarantee details and the ecosystem item fields.
- Lists, pickers and pricing structures keep their specialised components.
- `toFieldDef` gets `valueType`, `enumValues` and `control` passed through. No change for existing callers.

## 8. Preventing duplicate sources of truth

- **New test:** every Coach id/path written in the Offer tabs and every number/yes-no path in applyBlueprintWrites must exist in the registry. This catches drift now, before the screens migrate.
- **Docs:** add a rule to AGENTS.md saying Offer field definitions live only in `blueprintRegistry.ts`.
- `blueprintFields.ts` (Copy Components) stays separate for now and is flagged for a later merge. Its pricing paths look outdated (`pricing.price` vs `core_price`).

## Risks

- A prompt changes by accident (field counts). Mitigation: snapshot tests of both prompts.
- `editorOnly` gets missed in a lookup. Mitigation: one filtered array, with a test that no `editorOnly` path is in `BLUEPRINT_FIELD_BY_PATH`.
- The Coach prompt and the client both import this file. Mitigation: deploy coach-chat in the same step; the output is checked by snapshot.
- Option lists for `timeframe` / `frequency` / `type` may drift from the TypeScript types in offerDesignTypes. Mitigation: a type-level test that the enum values match the unions.

## Implementation sequence

1. **Step 1a:** add snapshot tests for the current prompts, `BLUEPRINT_FIELDS` paths and Offer progress fixtures. No code changes.
2. **Step 1b:** schema extensions plus metadata on existing Offer fields: `valueType`, `enumValues`, `control`, `appliesToTiers`.
3. **Step 1c:** add the missing definitions (recurring, premium, delivery_types) as `editorOnly`, plus `OFFER_ITEM_FIELDS`, `offerRelativePath` and `fieldsForTier`.
4. **Step 1d:** the drift test (§8) and the AGENTS.md rule.
5. **Later steps:** pass the new metadata through `toFieldDef`; switch the Offer screens to the registry one sub-block at a time; replace applyBlueprintWrites' hard-coded paths; Coach writes aimed at a specific offer.

## Acceptance criteria (Step 1)

- Both Coach prompts are byte-identical to the snapshots taken in 1a.
- The `BLUEPRINT_FIELDS` path set, aiWritable flags and `BLUEPRINT_LISTS` are unchanged.
- Offer progress for the fixtures is unchanged.
- applyBlueprintWrites accepts and rejects exactly the same paths as before (tested on a path list).
- `fieldsForTier("core")` returns angle, stack, pricing and the item fields; every other tier returns only the item fields.
- `offerRelativePath` maps every Offer path correctly; there is a test for every `offer_stack.*` field.
- Every hard-coded Offer Coach path exists in the registry (drift test).
- No screen, component, database or edge function behaviour changes; type check and all tests pass.

## Decisions needed

1. Should the recurring/premium pricing fields stay hidden from the Coach in Step 1 (recommended) or become Coach-writable later?
2. Is "core only" for the full design correct for now, or should Premium also get the full design?
