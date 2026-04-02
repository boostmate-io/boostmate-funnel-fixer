
## Diagnosis

Do I know what the issue is? Yes.

This is still an auth/session bootstrapping problem, but the real issue is broader than the previous fix.

The evidence from the logs is consistent:
- multiple refresh-token calls happen within ~1 second
- backend auth starts returning `429 Request rate limit reached`
- after that, requests to `profiles` / `projects` fall back to anonymous auth
- then `Dashboard` sees `user = null` and redirects to `/`

So the app is still creating a refresh storm during startup.

## Actual root cause

The main problem is that authenticated app providers are mounted too early and they start fetching immediately:

```text
App
└── AuthProvider
    └── BrowserRouter
        └── AgencyProvider
            └── ProjectProvider
                └── ALL routes, including /
```

That means:
- even on the public landing page, the agency/project providers are alive
- right after login, they immediately fetch `profiles` and `projects`
- some flows still do auth-dependent work during route transition
- when the token is near expiry, these overlapping requests trigger repeated refreshes
- once refresh gets rate-limited, the session collapses and the dashboard redirects back out

There is also a secondary issue:
- `ProjectContext` auto-creates a project inside the initial bootstrap load path
- when auth is unstable, that insert runs with an invalid/anonymous session and causes RLS failures
- this makes the startup path noisier and less reliable

## Implementation plan

### 1. Split public and protected route trees
Refactor `App.tsx` so `AgencyProvider` and `ProjectProvider` are only mounted for protected dashboard routes, not for `/`.

New structure:

```text
AuthProvider
└── BrowserRouter
    ├── Public routes
    │   ├── /
    │   └── /invite/:code
    └── ProtectedRoute
        └── AppProviders
            ├── AgencyProvider
            ├── ProjectProvider
            └── /dashboard
```

Files:
- `src/App.tsx`
- new protected wrapper component if needed

### 2. Add a real protected-route gate
Create a dedicated route guard that:
- waits for auth readiness
- renders a loading state while auth is restoring
- only mounts protected providers/components after auth is confirmed
- redirects to `/` only when auth is definitively absent

This prevents protected data loading during auth restoration.

Files:
- new `src/components/auth/ProtectedRoute.tsx` or similar
- possibly reuse `useAuthReady`

### 3. Make bootstrap paths read-only
Refactor `ProjectContext.tsx` so initial load does not create a project automatically.

Change:
- initial bootstrap should only read projects
- if there are no projects, handle that explicitly in UI or via a separate “ensure default project” action after auth is stable
- no inserts during unstable startup

Files:
- `src/contexts/ProjectContext.tsx`
- possibly `src/components/dashboard/ProjectSwitcher.tsx` / dashboard empty-state UI

### 4. Harden provider effects against auth churn
Update `AgencyContext.tsx` and `ProjectContext.tsx` to:
- only run when `isReady && user?.id`
- cancel/ignore stale async responses when user changes or logs out
- clear state immediately on logout
- avoid updating state from old requests after redirect/session loss
- use safer profile loading (`maybeSingle` pattern) so missing/blocked rows do not create noisy failure paths

Files:
- `src/contexts/AgencyContext.tsx`
- `src/contexts/ProjectContext.tsx`

### 5. Stop using auth lookups as mount guards inside feature components
Audit components that call `supabase.auth.getSession()`/`getUser()` just to decide whether to run.

For dashboard modules, switch to:
- auth from `AuthContext`
- project from `ProjectContext`
- only run data queries when both are available

Priority files to fix first:
- `src/components/assets/AssetsLibrary.tsx`
- `src/components/funnel-designer/FunnelDesigner.tsx`
- `src/components/funnel-designer/NodeDetailsPanel.tsx`
- `src/pages/Index.tsx`
- `src/components/audit/DashboardAuditWizard.tsx`

This removes more hidden refresh triggers elsewhere in the app.

### 6. Keep login navigation simple
Refine the login success flow so it does not compete with auth restoration:
- login should complete
- auth context becomes ready
- protected route mounts
- then protected providers fetch once

Avoid chaining extra authenticated writes during the exact login transition unless necessary.

Files:
- `src/components/auth/AuthModal.tsx`
- `src/pages/Index.tsx`

## Technical details

### Why the earlier fix did not fully solve it
The previous fix centralized auth readiness, but the app still:
- mounted protected data providers on public routes
- performed protected reads immediately after sign-in
- allowed bootstrap writes during startup
- still had several component-level auth checks using `getSession()`

So auth became “more centralized”, but protected data loading was still happening too early.

### Key architectural correction
The real fix is:

```text
Do not mount protected data providers until auth is fully restored and confirmed.
```

That is the change most likely to eliminate the refresh storm for good.

## Files to update

Core:
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/contexts/AgencyContext.tsx`
- `src/contexts/ProjectContext.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Index.tsx`
- `src/components/auth/AuthModal.tsx`

Likely new:
- `src/components/auth/ProtectedRoute.tsx`

Follow-up hardening:
- `src/components/assets/AssetsLibrary.tsx`
- `src/components/funnel-designer/FunnelDesigner.tsx`
- `src/components/funnel-designer/NodeDetailsPanel.tsx`
- `src/components/audit/DashboardAuditWizard.tsx`

## Verification after implementation

I will consider this fixed only if all of these pass:
1. Login with `jensvannueten@gmail.com` stays on `/dashboard`
2. Login with `support@boostmate.io` stays on `/dashboard`
3. Manual refresh on `/dashboard` keeps the user logged in
4. Backend auth logs no longer show rapid refresh bursts followed by `429`
5. `profiles` and `projects` requests no longer fall back to anonymous auth during startup

## Expected outcome

After this refactor:
- public pages remain public and lightweight
- protected providers only run inside the authenticated app
- startup becomes deterministic
- the dashboard should stop briefly appearing and then kicking the user back out
