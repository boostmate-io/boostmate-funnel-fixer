# PRD: Authentication

## Overview
User registration, login, session management and email verification via Lovable Cloud Auth.

## Objectives
- Secure user registration with email verification
- Login/logout functionality
- Session management with automatic token refresh
- Role-based access (admin/user) via `user_roles` table

## Functional Requirements

### FR-1: Registration
- Users can create an account with email and password
- Email verification is required before the user can sign in
- After verification, a first project is automatically created

### FR-2: Login
- Users can log in with email and password
- Session is persisted and automatically restored on revisit
- Expired sessions result in automatic logout

### FR-3: AuthModal
- Modal-based UX (no separate pages)
- Toggle between login and registration mode
- Error messages for invalid credentials

### FR-4: Role Management
- Roles are stored in `user_roles` table (not on profile)
- `has_role()` security definer function for RLS policies
- Admin role grants access to Knowledge Center

## Database Schema

### Table: `user_roles`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| role | app_role (enum) | 'admin' or 'user' |
| created_at | timestamptz | Creation date |

## Technical Details
- Supabase Auth for authentication
- RLS policies on all tables using `auth.uid()`
- AuthModal component in `src/components/auth/AuthModal.tsx`

## Dependencies
- Lovable Cloud (Supabase Auth)
