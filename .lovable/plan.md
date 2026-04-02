

# Fix: Auth Race Condition Causing Logout

## Problem
After login, the user briefly sees the dashboard then gets kicked back to the public site. Root cause: a token refresh storm.

Three independent `onAuthStateChange` listeners (Dashboard, AgencyContext, ProjectContext) plus the Index page all fire simultaneously. The `INITIAL_SESSION` event arrives with `session = null` before the session is restored from storage. Dashboard immediately calls `navigate("/")`, and the parallel `getSession()` calls from the contexts create dozens of simultaneous token refreshes that hit the 429 rate limit, causing session loss.

## Solution
Create a centralized `useAuthReady` hook and use it as the single source of truth.

### 1. Create `src/hooks/useAuthReady.ts`
- Calls `supabase.auth.getSession()` once to restore session from storage
- Sets `isReady = true` only after that completes
- Listens to `onAuthStateChange` for subsequent events
- Returns `{ user, isReady }`

### 2. Update `src/pages/Dashboard.tsx`
- Replace the inline `onAuthStateChange` + `getSession` logic with `useAuthReady`
- Show a loading state while `!isReady`
- Only redirect to "/" when `isReady && !user` (not on initial null)
- Remove the `if (!user) return null` guard (replaced by isReady check)

### 3. Update `src/pages/Index.tsx`
- Replace inline `onAuthStateChange` with `useAuthReady`
- Only redirect to "/dashboard" when `isReady && user`

### 4. Update `src/contexts/AgencyContext.tsx`
- Remove the separate `getSession()` call inside `loadProfile`
- Instead, listen to `onAuthStateChange` only (no parallel getSession)
- Guard against calling `loadProfile` when event is `INITIAL_SESSION` with null session

### 5. Update `src/contexts/ProjectContext.tsx`
- Same pattern: remove redundant `getSession()` call
- React to auth state changes from the single subscription

## Technical Details
- The key fix is ensuring `getSession()` completes before any navigation decision
- The `INITIAL_SESSION` event with null session must NOT trigger a redirect
- Reducing from 4+ `onAuthStateChange` listeners to a centralized hook eliminates the token refresh storm

## Files Changed
| File | Change |
|------|--------|
| `src/hooks/useAuthReady.ts` | New hook |
| `src/pages/Dashboard.tsx` | Use hook, fix redirect logic |
| `src/pages/Index.tsx` | Use hook, fix redirect logic |
| `src/contexts/AgencyContext.tsx` | Remove redundant getSession |
| `src/contexts/ProjectContext.tsx` | Remove redundant getSession |

