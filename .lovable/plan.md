

# Multi-Tenant Account Architecture Refactor

## Current State

The app currently uses a flat structure:
- `profiles` table with `account_type` enum (`personal`, `agency`, `client`)
- `agency_clients` table linking agency users to client users
- `client_accounts` as lightweight workspace labels for agencies
- `projects` table (1:1 per user, project switching removed)
- All data tables (`funnels`, `offers`, `assets`, `audits`, etc.) have `user_id` + optional `project_id`
- Agency "impersonation" works by swapping `effectiveUserId` in React context
- RLS policies use `user_id = auth.uid()` or `is_agency_of()` helper

## New Architecture

```text
┌──────────────────────────────────────────────┐
│                  Platform                     │
│  app_admin users can see/manage everything    │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ Main Account (standard) ──────────────┐  │
│  │  owner: User A                         │  │
│  │  ┌─ Sub Account (default) ──────────┐  │  │
│  │  │  funnels, offers, assets, etc.   │  │  │
│  │  │  members: [User A]               │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─ Main Account (agency) ────────────────┐  │
│  │  owner: User B                         │  │
│  │  ┌─ Sub Account (internal) ─────────┐  │  │
│  │  │  agency's own workspace          │  │  │
│  │  │  members: [User B]               │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  ┌─ Sub Account (client: Acme) ─────┐  │  │
│  │  │  client workspace                │  │  │
│  │  │  members: [User C, User D]       │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  ┌─ Sub Account (client: BigCo) ────┐  │  │
│  │  │  (no users yet, agency-managed)  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## Database Changes

### New Tables

**`main_accounts`**
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| name | text | 'My Account' |
| type | text ('standard' / 'agency') | 'standard' |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

**`sub_accounts`**
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| main_account_id | uuid (FK) | — |
| name | text | 'Default Workspace' |
| is_default | boolean | false |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

**`account_memberships`** (replaces agency_clients + user-to-account links)
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| user_id | uuid (FK auth.users) | — |
| main_account_id | uuid (FK) | — |
| sub_account_id | uuid (FK, nullable) | — |
| role | text | 'member' |
| created_at | timestamptz | now() |

Roles: `owner`, `admin`, `member`, `workspace_admin`, `workspace_member`

**`account_invites`** (replaces agency_invites + client_account_invites)
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| main_account_id | uuid (FK) | — |
| sub_account_id | uuid (FK, nullable) | — |
| email | text | — |
| invite_code | text | random hex |
| role | text | 'workspace_member' |
| status | text | 'pending' |
| invited_by | uuid | — |
| created_at | timestamptz | now() |

### Modified Tables

All data tables (`funnels`, `offers`, `assets`, `audits`, `funnel_analytics_entries`, `funnel_briefs`, `asset_sections`, `funnel_step_metrics`) get:
- **Add** `sub_account_id` (uuid, nullable initially for migration)
- **Keep** `user_id` (creator/last editor)

`projects` table is **repurposed or dropped** — its role is replaced by `sub_accounts`.

`profiles` table: remove `account_type` column (replaced by `account_memberships`).

### Deprecated Tables (to remove after migration)
- `agency_clients`
- `agency_invites`
- `client_accounts`
- `client_account_invites`

### New DB Functions

- `get_user_sub_accounts(uid)` — returns sub_account_ids a user has access to (SECURITY DEFINER)
- `is_sub_account_member(uid, sub_id)` — checks membership (SECURITY DEFINER)
- `is_main_account_admin(uid, main_id)` — checks owner/admin role (SECURITY DEFINER)
- `is_app_admin(uid)` — checks app_admin in user_roles (SECURITY DEFINER)

### RLS Strategy

All data tables shift from `user_id = auth.uid()` to:
```sql
sub_account_id IN (SELECT sub_account_id FROM account_memberships WHERE user_id = auth.uid())
```
Using the `get_user_sub_accounts()` security definer function to prevent recursion.

App admins bypass via `is_app_admin(auth.uid())`.

### Signup Trigger Update

Replace `handle_new_user_role()` to:
1. Assign `user` role in `user_roles`
2. Create a `main_accounts` row (type: `standard`)
3. Create a default `sub_accounts` row linked to it
4. Create an `account_memberships` row (role: `owner` on main, `workspace_admin` on sub)
5. Clone active seed templates into the default sub_account

## Frontend Changes

### Contexts Refactor

**Replace `AgencyContext` + `ProjectContext`** with a unified **`WorkspaceContext`**:
- Loads user's memberships, main account, sub accounts
- Tracks `activeSubAccountId` (persisted in localStorage)
- Provides `isAgency`, `isAppAdmin`, `activeSubAccount`, `switchSubAccount()`
- All data-fetching hooks filter by `activeSubAccountId` instead of `user_id`

### Signup Flow

- **AuthModal**: Add account type selector (Standard / Agency) during signup
- Standard: creates main_account(standard) + 1 sub_account
- Agency: creates main_account(agency) + 1 default sub_account

### Sidebar Updates

- Agency users: show sub-account switcher in sidebar (switch between own workspace and client workspaces)
- Standard users: no switcher visible (single workspace)
- App admins: additional "Admin" nav item

### Clients Module Refactor

Rewrite `ClientManagement.tsx` with:
- **Accounts View**: lists `sub_accounts` where `main_account_id` = agency's main account and `is_default = false`. Create/edit/delete/manage client sub-accounts.
- **Users View**: lists all `account_memberships` across agency's sub-accounts. Filter by sub-account, search, manage access.
- **Create Client Account**: creates new `sub_accounts` row + optionally sends invites via `account_invites`

### Impersonation → Sub-Account Switching

Replace the current impersonation model. "Manage" a client now means switching `activeSubAccountId` to the client's sub-account. The banner shows which workspace is active.

### App Admin Panel

New `AdminPanel.tsx` module (visible only to app_admin users):
- **Main Accounts list**: search, filter by type, view details
- **Sub Accounts list**: view all, filter by main account, **migrate** sub-account to different main account
- **Users list**: app-wide user management, role assignment
- **Sub Account Migration**: select sub-account → select target main account → confirm

### Invite Registration Page

Update `InviteRegistration.tsx` to work with `account_invites` table:
- Lookup invite by code
- Create user account
- Create `account_memberships` for the invited main_account + sub_account
- Mark invite as accepted

### Data Module Updates

All modules (`FunnelModule`, `OfferModule`, `AssetsLibrary`, `AnalyticsModule`, `AuditModule`) must:
- Read `activeSubAccountId` from `WorkspaceContext`
- Filter queries by `sub_account_id` instead of `user_id`
- Insert new records with both `user_id` (creator) and `sub_account_id`

## Migration Strategy

1. Create new tables via migration
2. Migrate existing data:
   - For each user with `account_type = 'personal'`: create main_account(standard) + sub_account + membership
   - For each user with `account_type = 'agency'`: create main_account(agency) + sub_account + membership
   - For each `client_accounts` row: create sub_account under agency's main_account
   - For each `agency_clients` row: create account_membership
   - Backfill `sub_account_id` on all data tables based on `user_id` → membership → sub_account mapping
3. Update RLS policies
4. Drop deprecated tables after verification

## Implementation Order

1. Database migration: new tables, functions, data migration, RLS
2. `WorkspaceContext` replacing AgencyContext + ProjectContext
3. `ProtectedRoute` update to use WorkspaceContext
4. Sidebar + sub-account switcher
5. Signup flow (standard + agency)
6. Clients Module refactor (Accounts View + Users View)
7. Invite flow update
8. All data modules: filter by sub_account_id
9. App Admin Panel
10. Remove deprecated tables and old code

## Technical Details

- All new security definer functions use `SET search_path = public` to prevent search_path attacks
- Sub-account migration (admin feature) uses a single transaction to update `main_account_id` on the sub_account
- `account_memberships` has a unique constraint on `(user_id, sub_account_id)` to prevent duplicates
- Seed template cloning in the signup trigger uses `sub_account_id` on cloned funnels
- The `app_admin` role is stored in the existing `user_roles` table (new enum value needed: extend `app_role` to include `admin`, `user`, `app_admin` — or keep using `admin` for app-wide admins since that's already the convention)

