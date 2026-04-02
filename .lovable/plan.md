

# Agency/Client Account System

## Overview
Add a multi-tenant agency/client structure where agency accounts can manage multiple client accounts, similar to GoHighLevel. Agencies can create clients, impersonate them, and clients can also self-register via invite links.

## Architecture

```text
agency (user)
  ├── client_1 (user) ── projects, funnels, assets, audits
  ├── client_2 (user) ── projects, funnels, assets, audits
  └── client_3 (user) ── projects, funnels, assets, audits
```

## Database Changes

### 1. New enum: `account_type`
Values: `personal`, `agency`, `client`

### 2. New table: `agency_clients`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| agency_user_id | uuid | The agency user |
| client_user_id | uuid | The client user |
| invite_code | text | Unique invite code for self-registration |
| invite_status | text | `pending`, `accepted` |
| created_at | timestamptz | |

RLS: Agency can manage rows where `agency_user_id = auth.uid()`. Clients can read rows where `client_user_id = auth.uid()`.

### 3. New table: `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK, FK to auth.users |
| account_type | account_type | `personal`, `agency`, or `client` |
| display_name | text | User/company name |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Users can read/update own profile. Agencies can read their clients' profiles.

Auto-created via trigger on auth.users INSERT (default: `personal`).

### 4. New table: `agency_invites`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| agency_user_id | uuid | Inviting agency |
| email | text | Invited email |
| invite_code | text | Unique code |
| status | text | `pending`, `accepted`, `expired` |
| created_at | timestamptz | |

RLS: Agency manages own invites. Public read by invite_code for registration flow.

## Frontend Changes

### 1. Account Type Selection
- After signup, or in settings, users can upgrade to "Agency" account type
- Agency dashboard gets a "Clients" section in sidebar

### 2. Agency Client Management Page
- List all clients with status
- Create client manually (name + email, sends invite)
- Generate invite link for self-registration
- Impersonate button per client

### 3. Impersonation
- Agency clicks "Manage" on a client → app context switches to that client's data
- Top banner shows "Viewing as [Client Name] — Back to Agency"
- All queries filter by the impersonated client's user_id
- Implemented via React context (no actual auth session switch — agency's JWT stays active, queries use client's user_id via a security definer function)

### 4. Client Self-Registration
- Client visits invite link → signup form with agency pre-linked
- On registration, `agency_clients` row is created automatically
- Client sees their own dashboard (no agency controls)

### 5. Sidebar Updates
- Agency accounts: show "Clients" nav item
- When impersonating: show client name + "Back" button in header

## Security Considerations
- Impersonation uses a `get_client_data()` security definer function that verifies the agency-client relationship before returning data
- RLS policies on all tables updated to allow agency access to their clients' data via security definer functions
- Agencies cannot modify client auth credentials

## Implementation Order
1. Database migrations (profiles, agency_clients, agency_invites)
2. Profile auto-creation trigger
3. Security definer functions for impersonation
4. Update RLS policies on existing tables
5. Agency dashboard UI (client list, invite flow)
6. Impersonation context + banner
7. Client self-registration flow
8. Update sidebar navigation

