
# Phase 1 — AI Coach Instruction Block Correctness Pass

Only correctness fixes. No behaviour redesign, no new philosophy, no restructuring, no scoped loading, no new blocks.

## Verified current state (pre-plan reads)

- Registry field kinds are exactly: `text`, `textarea`, `tags`, `suggested-tags`, `chips-single`, `chips-multi`, `bullet-list`, `colors` (`blueprintRegistry.ts:27-35`).
- `aiWritable` exists on registry fields, defaults to `true`, and is `false` for `brand_strategy.visual_colors`, `proof_authority.authority.authority_types`, `proof_authority.authority.credibility_foundations`.
- `renderBlueprintFieldPathsPrompt()` already filters to `aiWritable` fields only, and is injected on **section** and **global** scope but **not** on field scope (`coach-chat/index.ts:441-452`).
- `renderBlueprintStructurePrompt()` outputs tabs/sub-blocks only — no per-field kind, helper, options, suggestions or `aiWritable`.
- On field scope the only field metadata reaching the prompt is `context.target` from the client (`buildContext.ts:30-34`): `id`, `label`, `kind` collapsed to `text|chips|tags|structured`, `helper`, `placeholder` — no `options`, `suggestions` or `aiWritable`.
- The list-item write convention `<basePath>.new_N.<fieldKey>` currently exists only in the runtime "List section mode" block, not in `coach:blueprint-section`.
- `coach:high-ticket-offer` contains no obsolete field paths, but does use "differentiation" phrasing (line ~119) and pricing guidance with no reference to the current `payment_plans` schema.

## Required supporting code change (minimal)

`supabase/functions/coach-chat/index.ts`:
- Add a `BLUEPRINT_FIELD_BY_PATH` map over the existing registry fields and a `renderTargetFieldMeta(path)` helper.
- In the `scope === "blueprint.field"` branch, resolve `context.target.id` via the existing `canonicalBlueprintPath()` and push:

```
# Target field metadata (authoritative)
path — kind — label
helper: …
placeholder: …
options: value | value            (chips only)
suggestions: item, item, item     (suggested-tags only)
ai_writable: true | false
```

- Also inject `BLUEPRINT_FIELD_PATHS` on field scope so the field prompt references the same authoritative path list.

No client changes. This is required because otherwise `options`, `suggestions` and `aiWritable` never reach the model on field scope.

## Instruction block edits (`ai_instruction_blocks.content`)

### 1. `coach:base` — add a Blueprint Awareness section
Appended; existing content untouched:
- The complete current Business Blueprint is always injected and represents the **authoritative current state of the user's business** (described as such, not as "JSON").
- Never ask the user for information that already exists in the injected Blueprint — read it, then build on it.
- The injected Blueprint structure and field-path lists are authoritative for tab, sub-block and field names. Never rely on remembered or assumed field names, and never invent paths.
- **Improve before replacing:** before proposing a replacement, first understand what already exists in the Blueprint and refine or sharpen it where possible, rather than generating a completely new alternative.

### 2. `coach:blueprint-field` — full kind coverage + non-writable rule
Replace the current 3-kind rule list with all eight kinds (reasoning + draft format + when to propose):

| kind | draft format |
|---|---|
| `text` | one short line, no trailing punctuation |
| `textarea` | 1–3 sentences of prose in the user's voice |
| `tags` | comma-separated short items, no prose |
| `suggested-tags` | comma-separated items; prefer relevant injected `suggestions`, add custom items only when they fit better |
| `chips-single` | exactly one value from the injected `options` |
| `chips-multi` | comma-separated subset of the injected `options`, values verbatim |
| `bullet-list` | one short item per line, no bullet characters |
| `colors` | never drafted (non-writable) |

Plus:
- Field metadata (kind, helper, placeholder, options, suggestions) comes only from the injected target-metadata block — never from memory.
- If `ai_writable: false`: explain, brainstorm and advise in prose, name concrete candidate values, and tell the user to set it in the UI — never call the write/proposal tool for that field.
- Propose a draft only when the user asks for one or confirms a direction; single-field scope discipline unchanged.

### 3. `coach:blueprint-section` — same kind table + path discipline
- Same eight-kind value-format table.
- Write paths may come **only** from `BLUEPRINT_FIELD_PATHS`; anything not listed is not writable and must never be invented or inferred from memory.
- Document repeatable lists explicitly: `<basePath>.new_0.<fieldKey>`, `<basePath>.new_1.<fieldKey>`, … with every listed item field populated per item, labelled `Item <n> — <field label>`.
- Guided-vs-direct-fill logic, confirmation-before-writes and already-handled rules stay exactly as they are.

### 4. `coach:high-ticket-offer` — terminology alignment
- Remove Premium/Differentiation-era vocabulary (rephrase the "differentiation" guidance as positioning/angle language matching the current Offer Angle fields).
- Express pricing in current schema terms: `offer_stack.pricing.payment_plans` with plan types `full_pay | split_2 | split_3 | split_6 | monthly | custom`, plus `offer_stack.pricing.guarantee_details`.
- Strategic content and tier positioning otherwise unchanged.

## Verification
- Typecheck.
- Deploy `coach-chat`.
- Open Coach on: Brand Colors (`colors`, non-writable) and Authority Types (`chips-multi`, non-writable) → advice only, no write proposal; a `suggested-tags` field → suggestion-aware draft; a repeatable list section → `new_N` writes still apply.
- Read the four blocks back from the database to confirm content.

## Report after implementation
Changed instruction blocks, verification results, and user-visible behaviour changes.
