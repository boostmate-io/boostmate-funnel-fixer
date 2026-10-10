# Universal Offer Editor — final field setup for six categories

Planning only. Nothing is implemented until approved.

## Status labels (never block saving)

- **Min**: needed to create the offer. Only the Name is required for every category; Price is also Min for paid categories.
- **Rec**: recommended. Counts toward the editor's own progress hint.
- **Opt**: optional or advanced. Shown collapsed under "More options" and not counted.

Progress is shown inside the editor only. Non-primary offers never affect overall Blueprint progress.

Registry reuse: "existing" means an existing `offer_stack.*` field or list, reused by its relative path (`offerRelativePath`). New fields are added to the same registry as editor-only (not Coach-writable) until approved separately.

## Shared building blocks (used across categories)

| Building block | Source | Control |
|---|---|---|
| Name, Short Description, Core Outcome | existing Angle fields | text / textarea |
| Signature Framework (name, description, pillars) | existing Angle fields and list | existing FrameworkSection |
| New Vehicle, Better/Faster/Easier Results | existing Angle fields | text |
| Deliverables, Resources, Support System, Bonuses, Milestones | existing Stack lists | existing list builders, delivery-type picker, frequency, perceived value |
| Delivery Timeline | existing Stack field | timeline control |
| Core Price, Payment Plans, Guarantee | existing Pricing fields and list | currency input, plan-type select, guarantee select |
| Recurring name/price/interval/ongoing value/delivery types | existing editor-only Pricing fields | currency, billing-interval select, delivery-type picker |
| Delivery Types summary | existing ecosystem item field | delivery-type picker |
| **New** `problem_solved` | new field | textarea |
| **New** `quick_win` (immediate value) | new field | textarea |
| **New** `offer_format` | new enum field | select |
| **New** `next_step_cta` | new field | text |
| **New** `cancellation_terms` | new field | textarea |
| **New** `premium_mode` (standalone / upgrade of a Core) | new enum field | segmented toggle |
| **New** `touch_level` (high-touch options) | new string list | chips (1:1, done-with-you, done-for-you, VIP day, priority access) |
| Ecosystem relationships | existing `offer_relationships` | relationship selector (existing component) |

## 1. Free — one tab: "Offer"

| Section | Field / list | Status | Reuse / new |
|---|---|---|---|
| Basics | Name | Min | existing |
| | Format (PDF, assessment, webinar, challenge, consultation, mini-course, other) | Rec | **new** `offer_format` |
| | Short Description | Rec | existing |
| Value | Problem Solved | Rec | **new** |
| | Quick Win / Immediate Value | Rec | **new** |
| | Core Outcome | Opt | existing |
| What's included | Deliverables (max 3 suggested) | Opt | existing list |
| | Delivery Types | Rec | existing |
| Next step | Next-step CTA | Opt | **new** `next_step_cta` |
| | Leads into (offer) | Opt | `offer_relationships` "leads_into" |

No pricing. Price is stored as free.

## 2. Low-Ticket — one tab: "Offer"

| Section | Field / list | Status | Reuse / new |
|---|---|---|---|
| Basics | Name | Min | existing |
| | Short Description | Rec | existing |
| Value | Problem Solved | Rec | **new** |
| | Quick Win | Rec | **new** |
| | Core Outcome | Rec | existing |
| | Signature Framework | Opt | existing |
| What's included | Deliverables | Rec | existing list |
| | Bonuses (order bump) | Opt | existing list |
| | Delivery Types | Rec | existing |
| Price | Core Price | Min | existing (currency) |
| | Guarantee type and details | Opt | existing |
| Next step | Ascends to (offer) | Opt | `offer_relationships` "ascends_to" |

## 3. Mid-Ticket — Offer Angle / Offer Stack / Pricing

| Tab | Field / list | Status |
|---|---|---|
| Angle | Name | Min |
| | Short Description, Core Outcome | Rec |
| | Problem Solved | Rec (**new**) |
| | Signature Framework | Opt |
| | New Vehicle, Better/Faster/Easier | Opt |
| Stack | Deliverables | Rec |
| | Resources, Support System, Bonuses | Opt |
| | Milestones, Delivery Timeline | Opt |
| Pricing | Core Price | Min |
| | Payment Plans, Guarantee | Opt |
| Relationships | Ascends to / downsell from | Opt |

All fields are existing except Problem Solved.

## 4. Core — unchanged (Angle / Stack / Pricing)

Current fields, status and behavior are kept exactly as they are. The only change is that the "Main Offer" wording becomes "Offer" for non-primary Core offers, as a per-tier wording override. Relationships are added later as optional.

## 5. Premium — Offer Angle / Offer Stack / Pricing

| Tab | Field / list | Status | Notes |
|---|---|---|---|
| Angle | Premium type: standalone or upgrade of a Core offer | Rec | **new** `premium_mode` |
| | Upgrades from (Core offer) | Opt, shown when the type is "upgrade" | `offer_relationships` "ascends_to" (reverse) |
| | Name | Min | |
| | Short Description, Core Outcome | Rec | |
| | Signature Framework | Opt | its own; never inherited from the Core |
| | New Vehicle, Better/Faster/Easier | Opt | |
| Stack | High-touch level | Rec | **new** `touch_level` chips |
| | Deliverables, Support System | Rec | existing |
| | Bonuses, Resources, Milestones, Timeline | Opt | existing |
| Pricing | Core Price | Min | |
| | Payment Plans, Guarantee | Opt | |

The existing editor-only `premium_upgrade.*` fields (which live on a Core offer) stay where they are. Whether to retire them is an open decision (see below).

## 6. Continuity — Offer Angle / Delivery & Value / Pricing

| Tab | Field / list | Status | Reuse / new |
|---|---|---|---|
| Angle | Name | Min | existing |
| | Short Description | Rec | existing |
| | Ongoing Value (why stay) | Rec | existing `recurring_offer.ongoing_value` |
| | Core Outcome | Opt | existing |
| Delivery & Value | Recurring deliverables (each with frequency) | Rec | existing Deliverables list and frequency control |
| | Support System | Opt | existing list |
| | Resources | Opt | existing list |
| | Delivery Types | Rec | existing |
| Pricing | Recurring Price | Min | existing `recurring_offer.monthly_price` |
| | Billing Interval | Rec | existing `recurring_offer.interval` |
| | Cancellation Terms | Rec | **new** |
| | Guarantee | Opt | existing |
| Relationships | Retention for (offer) | Opt | `offer_relationships` "retention" |

## New registry definitions (all editor-only for now)

`problem_solved`, `quick_win`, `offer_format` (enum), `next_step_cta`, `cancellation_terms`, `premium_mode` (enum), `touch_level` (string list).

Also needed:
- Per-field/list tier applicability.
- Per-tier status (Min/Rec/Opt).
- Per-tier tab layout, including the single "Offer" tab and "Delivery & Value".
- Per-tier wording overrides.

All of this is additive and covered by snapshot tests, so Core prompts stay byte-identical.

## Storage

- Design data is saved in `offers.data.design` under the same paths for every category. Summary fields are synced from the design by the repository.
- Fields hidden after a category change stay saved.
- The Primary is unchanged.

## Decisions still needing approval

1. Premium upgrades: retire the Core-side `premium_upgrade.*` fields in favour of a separate Premium offer linked as an upgrade (recommended), or keep both?
2. Continuity: reuse the `recurring_offer.*` paths inside the Continuity offer's own design (recommended), or rename them to neutral paths?
3. Free format list: are the six formats plus "Other" enough?
4. Should "Next-step CTA" be free text, or chosen only from existing offers through relationships?
5. Which category should go first after cleanup? Recommended: Low-Ticket.
6. Coach write permissions for the new fields and the non-core categories (separate approval, as agreed).
