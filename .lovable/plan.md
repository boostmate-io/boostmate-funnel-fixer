
## What I found
Yes, I know the issue now.

The redirect is not mainly caused by the route guard anymore. The real loop is in `ProjectContext`.

- `AuthProvider` updates `user/session` on every token refresh.
- `ProjectContext` currently depends on the full `user` object: `useEffect(..., [user, loadProjects])`.
- Every token refresh gives a new `user` object reference, so that effect runs again.
- Each rerun fetches `projects`.
- Because the token is near expiry, each `projects` fetch triggers another refresh.
- That creates the exact `refresh -> projects -> refresh -> projects` storm visible in the network logs.
- Once auth becomes unstable, `ProtectedRoute` sees `!user` and redirects back to `/`.

This matches the evidence:
- repeated `POST /auth/v1/token?grant_type=refresh_token`
- repeated `GET /projects`
- session replay ending back on the public audit page

## Implementation plan

### 1. Fix the real loop in `ProjectContext`
File: `src/contexts/ProjectContext.tsx`

- Derive a stable `userId = user?.id ?? null`.
- Change all effects/callbacks to depend on `userId`, not the full `user` object.
- Make the bootstrap load run only when `userId` changes.
- Add a cancel/in-flight guard so stale async loads cannot overwrite state.

### 2. Remove writes from dashboard bootstrap
File: `src/contexts/ProjectContext.tsx`

- Remove the automatic project creation from `loadProjects()`.
- Initial dashboard bootstrap should only read data.
- If no project exists, handle that in a separate, guarded path after auth is stable.

### 3. Harden login success flow
Files:
- `src/components/auth/AuthModal.tsx`
- `src/pages/Index.tsx`

- Avoid using the login success callback as the main source of truth for access.
- Let redirect behavior follow the centralized auth state from `useAuth()`.
- Where the page needs the current user, use context state instead of extra `supabase.auth.getUser()` calls when possible.

### 4. Sweep dashboard modules for the same pattern
Files:
- `src/components/assets/AssetsLibrary.tsx`
- `src/components/funnel-designer/FunnelDesigner.tsx`
- `src/components/funnel-designer/NodeDetailsPanel.tsx`
- `src/components/audit/DashboardAuditWizard.tsx`

- Replace dependencies on the full `user` object with `userId`.
- Gate queries on `!!userId` and `!!activeProject?.id`.
- This prevents the same refresh loop from coming back in other modules.

### 5. Keep `ProtectedRoute` simple
File: `src/components/auth/ProtectedRoute.tsx`

- Keep it as a pure access gate:
  - loading while `!isReady`
  - redirect only when `isReady && !user`
- Do not rely on it to compensate for provider-side fetch loops.

## Technical details

```text
Current bad loop
Auth refresh -> new user object -> ProjectContext effect reruns
-> fetch projects -> token refresh -> new user object -> rerun again
-> auth destabilizes -> ProtectedRoute redirects to "/"
```

```text
Target flow
Login -> auth becomes ready -> one project load
-> dashboard stays mounted
-> later token refreshes do NOT retrigger bootstrap effects
```

## Files to update
- `src/contexts/ProjectContext.tsx` (main fix)
- `src/components/auth/AuthModal.tsx`
- `src/pages/Index.tsx`
- `src/components/assets/AssetsLibrary.tsx`
- `src/components/funnel-designer/FunnelDesigner.tsx`
- `src/components/funnel-designer/NodeDetailsPanel.tsx`
- `src/components/audit/DashboardAuditWizard.tsx`
- `src/components/auth/ProtectedRoute.tsx` (minor hardening)

## Backend changes
No database or policy change is needed for this bug. This is a frontend auth/bootstrap loop.

## Verification after implementation
I will only consider this fixed if all of these pass:

1. Login with `jensvannueten@gmail.com` stays on `/dashboard`
2. Login with `support@boostmate.io` stays on `/dashboard`
3. Manual refresh on `/dashboard` keeps the session
4. Dashboard bootstrap produces one `projects` load, not a repeating stream
5. Token refresh no longer chains repeatedly during dashboard load
6. Opening assets/funnel designer/audit modules does not restart the loop

## Why this plan is different
Earlier attempts focused on auth timing and provider placement. Those were reasonable, but the current code shows a more specific bug:

- `ProjectContext` is keyed to the full `user` object
- token refresh changes that object
- that retriggers dashboard bootstrap fetches over and over

That is the issue I would fix now.
