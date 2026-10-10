# Offer editor / Coach verification

## Automated coverage
- Existing real CoachPanel integration: per-ID Apply, immediate field update, primary untouched, pending unrelated manual field retained, reopen reads saved values, rejected/failed Apply stays retryable.
- Shell: tab switching with Coach open, typing preserved, Escape closes Coach first, save failure retains editor and Retry closes after persistence succeeds.
- Registry snapshots and drift tests preserve existing fields and Coach definitions.

## Signed-in browser checks
- Open an additional Core Offer from Offer Ecosystem.
- Open Coach, type without sending, switch Angle → Stack → Pricing → Angle; both interfaces remain clickable.
- Press Escape inside Coach: only Coach closes, editor remains.
- At 390px, editor occupies the upper section and Coach the lower section; both scroll independently. Close Coach and editor becomes fullscreen with the active tab retained.
- Verify normal outside-pointer dismissal elsewhere; pending edits flush before dismissal.

## Final write-back checklist
- Make an unrelated manual edit, ask the field Coach for a new offer name, switch tabs and Apply.
- Confirm the name updates in Angle, the unrelated field is retained, and only the additional offer changes.
- Close, reload and reopen: both values remain. Primary name and linked funnels remain unchanged.
- Offline: Apply must not show Applied; close must keep editor open and offer Retry. Reconnect and retry.
- Repeat for a primary offer (Blueprint persistence), keyboard Tab / Shift+Tab, mobile virtual keyboard and a nested list dialog.

Real AI generation/Apply, offline reconnection and the physical mobile keyboard remain manual checks; integration tests use mocked chat and persistence.