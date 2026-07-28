## Plan — Single Persistent Business Coach

### Concerns already accounted for
- Knowledge scoping changes per turn: always inject global + `coach:business-blueprint` blocks, layer focus-specific blocks on top, and make every focus switch an explicit turn so the model knows why its context shifted.
- History growth: bounded window (recent turns verbatim + rolling summary of older turns).
- `ai_coach_proposal_decisions` unique key `(conversation_id, path)` breaks when one conversation spans the whole Blueprint — a field could only ever be decided once.
- Multiple `<CoachPanel>` instances would each run their own `useCoachChat` against the same thread — needs a single provider.
- Existing per-field conversation rows are retained, not deleted.

### 1. One conversation per workspace
- `src/lib/coach/useCoachChat.ts`: resolve the conversation by `(user_id, sub_account_id)` with fixed `scope = "global"`, `target_id = "__coach__"`, adopting the most recent existing global conversation if one exists (so demo history carries over).
- Focus stops being part of conversation identity and becomes part of each turn's payload.

### 2. Coach provider + single panel
- New `src/contexts/CoachContext.tsx` (`CoachProvider` + `useCoach()`), mounted once in the dashboard shell, owning the single `useCoachChat` instance and the panel's open state.
- Expose `openCoach(focus)` taking the existing `CoachContext` shape.
- Replace local `<CoachPanel>` usage in `SectionHelpCoach`, the `FieldCard` / `AngleField` / `CoachIconButton` call sites, and `GlobalCoachBubble` with `useCoach().openCoach(...)`.

### 3. Focus as per-turn context, with natural transitions
- Opening the Coach from a field or section sets the active focus and sends a focus turn describing it ("The user wants help with the *Who is your ideal client?* field in Ideal Client Avatar").
- The turn carries the **previous focus** as well, and the coach prompt instructs it to bridge conversationally rather than hard-switching — e.g. "Great, I think we've defined your ideal client well enough for now. Let's move on to your Core Offer." If the previous topic is clearly unfinished, it should say so briefly before moving on.
- Rendered in the transcript as a compact focus chip so the thread still reads as one session.
- The full `context` (scope, target metadata, blueprint snapshot, locale) travels with every request, so server-side field metadata, write validation and scoped knowledge are unchanged.

### 4. Resume naturally on reopen
- Reopening the Coach never shows a fresh-chat opener when history exists; it restores the transcript scrolled to the last exchange.
- If the session has been idle (or the Blueprint changed since the last turn), the first turn back includes a short "re-entry" note so the coach opens with a brief recap and a concrete next step — "Last time we were sharpening your Core Offer promise. Want to pick that back up, or start on Brand Strategy?" — instead of a generic greeting.
- Per-scope opener messages become focus chips; the generic opener only ever appears on a genuinely empty conversation.

### 5. Restore tab-level section walkthrough
- Bring back the tab-level "AI Coach" button on each Blueprint section tab.
- Sets a section focus with walkthrough intent: work the tab field-by-field, proposing `blueprint_writes` per field until the section is complete, then confirm and offer the next tab.
- Extend the section instruction block so the coach tracks which registry fields in the active tab are still empty and works through them in order.

### 6. Persistence fixes
- Migration: replace the `(conversation_id, path)` unique constraint on `ai_coach_proposal_decisions` with `(conversation_id, message_id, path)`; update the upsert conflict target in `useCoachChat`.
- Keep the null-`message_id` fallback bucket for legacy rows.

### 7. History management
- Send a bounded window to `coach-chat`: last N turns verbatim plus a rolling summary of older turns persisted on the conversation row.
- **No** "Start a new conversation" action — the experience stays a single continuous thread. Conversation management can be revisited later if it's actually needed.

### Technical notes
- `coach-chat`'s prompt assembly, tool calling, and `applyBlueprintWrites` need no structural change — they already read focus from the per-request `context`. The additions are the previous-focus/re-entry hints and transition guidance in the base coach prompt.
- `src/lib/coach/buildContext.ts` builders stay as-is; they now produce focus descriptors rather than conversation identities.
- Old per-field conversation rows are orphaned, not deleted; no destructive migration.
