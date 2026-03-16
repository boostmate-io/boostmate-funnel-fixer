# PRD: Database Schema

## Overview
Complete overview of all database tables, relationships, RLS policies and functions used in the BoostMate platform.

## Enum Types

### `app_role`
Values: `admin`, `user`

## Tables

### `projects`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | Owner (FK auth.users) |
| name | text | No | 'My Project' | Project name |
| created_at | timestamptz | No | now() | Creation date |
| updated_at | timestamptz | No | now() | Last modified |

**RLS:**
- `Users can manage own projects` (ALL) — `user_id = auth.uid()`

---

### `funnels`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | Owner |
| project_id | uuid | Yes | — | FK → projects.id |
| name | text | No | 'Untitled Funnel' | Funnel name |
| description | text | Yes | '' | Description |
| nodes | jsonb | No | '[]' | ReactFlow nodes |
| edges | jsonb | No | '[]' | ReactFlow edges |
| is_template | boolean | No | false | Template flag |
| template_id | uuid | Yes | — | FK → funnels.id (self-ref) |
| created_at | timestamptz | No | now() | Creation date |
| updated_at | timestamptz | No | now() | Last modified |

**RLS:**
- `Users can manage own funnels` (ALL) — `user_id = auth.uid()`
- `Users can read templates` (SELECT) — `is_template = true`

**Triggers:**
- `update_funnel_updated_at` — auto-updates `updated_at` on change

---

### `assets`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | Owner |
| project_id | uuid | Yes | — | FK → projects.id |
| name | text | No | 'Untitled' | Asset name |
| type | text | No | 'sales_copy' | Asset type |
| description | text | Yes | '' | Description |
| created_at | timestamptz | No | now() | Creation date |
| updated_at | timestamptz | No | now() | Last modified |

**RLS:**
- `Users can manage own assets` (ALL) — `user_id = auth.uid()`

---

### `asset_sections`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| asset_id | uuid | No | — | FK → assets.id |
| title | text | No | 'Untitled Section' | Section title |
| content | text | Yes | '' | Rich text content |
| sort_order | integer | No | 0 | Display order |
| created_at | timestamptz | No | now() | Creation date |
| updated_at | timestamptz | No | now() | Last modified |

**RLS:**
- `Users can manage own asset sections` (ALL) — `asset_id IN (SELECT id FROM assets WHERE user_id = auth.uid())`

---

### `audits`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | Owner |
| email | text | No | '' | User email |
| landing_page_url | text | No | '' | URL to audit |
| landing_page_content | text | Yes | '' | Scraped content |
| landing_page_screenshot | text | Yes | '' | Screenshot URL |
| offer | text | No | '' | Product/service offer |
| target_audience | text | No | '' | Target audience |
| traffic_source | text | No | '' | Traffic source |
| monthly_traffic | text | No | '' | Monthly traffic |
| conversion_rate | text | No | '' | Current conversion rate |
| funnel_strategy | text | No | '' | Funnel strategy |
| score | integer | Yes | — | Audit score (0-100) |
| result | jsonb | Yes | — | AI analysis result |
| created_at | timestamptz | No | now() | Creation date |
| updated_at | timestamptz | No | now() | Last modified |

**RLS:**
- `Users can manage own audits` (ALL) — `user_id = auth.uid()`

---

### `funnel_analytics_entries`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| funnel_id | uuid | No | — | FK → funnels.id |
| user_id | uuid | No | — | Owner |
| date | date | No | — | Entry date |
| created_at | timestamptz | No | now() | Creation date |
| updated_at | timestamptz | No | now() | Last modified |

**RLS:**
- `Users can manage own analytics entries` (ALL) — `user_id = auth.uid()`

---

### `funnel_step_metrics`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| entry_id | uuid | No | — | FK → funnel_analytics_entries.id |
| node_id | text | No | — | Funnel node ID |
| node_label | text | No | '' | Node display label |
| node_type | text | No | '' | Node type |
| metrics | jsonb | No | '{}' | KPI values |
| created_at | timestamptz | No | now() | Creation date |

**RLS:**
- `Users can manage own step metrics` (ALL) — `entry_id IN (SELECT id FROM funnel_analytics_entries WHERE user_id = auth.uid())`

---

### `knowledge_documents`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| title | text | No | 'Untitled Document' | Document title |
| file_name | text | No | '' | Original filename |
| file_path | text | No | '' | Storage path |
| file_size | bigint | No | 0 | File size (bytes) |
| mime_type | text | No | 'application/pdf' | MIME type |
| created_at | timestamptz | No | now() | Creation date |
| updated_at | timestamptz | No | now() | Last modified |

**RLS:**
- `Only admins can manage knowledge documents` (ALL) — `has_role(auth.uid(), 'admin')`

---

### `user_roles`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | FK → auth.users.id |
| role | app_role | No | — | User role |
| created_at | timestamptz | Yes | now() | Creation date |

**Unique constraint:** `(user_id, role)`

**RLS:**
- `Admins can manage roles` (ALL) — `has_role(auth.uid(), 'admin')`
- `Users can read own roles` (SELECT) — `user_id = auth.uid()`

## Relationships (ERD)

```
auth.users
  ├── 1:N → projects (user_id)
  ├── 1:N → funnels (user_id)
  ├── 1:N → assets (user_id)
  ├── 1:N → audits (user_id)
  ├── 1:N → funnel_analytics_entries (user_id)
  └── 1:N → user_roles (user_id)

projects
  ├── 1:N → funnels (project_id)
  └── 1:N → assets (project_id)

funnels
  ├── 1:N → funnel_analytics_entries (funnel_id)
  └── 0:1 → funnels (template_id, self-ref)

assets
  └── 1:N → asset_sections (asset_id)

funnel_analytics_entries
  └── 1:N → funnel_step_metrics (entry_id)
```

## Security Definer Functions

### `has_role(_user_id uuid, _role app_role) → boolean`
Checks if a user has a specific role. Used in RLS policies to prevent infinite recursion.

### `handle_new_user_role() → trigger`
Automatically assigns `'user'` role to newly registered users. Triggered on `auth.users` INSERT.

### `update_funnel_updated_at() → trigger`
Auto-updates `updated_at` column on funnel modifications.

## Storage Buckets

### `knowledge-documents`
- **Public:** No
- **Purpose:** Store uploaded knowledge base documents (PDF, DOCX, TXT, MD)
- **Access:** Admin only (via RLS on `knowledge_documents` table)

## Dependencies
- Authentication (all tables use `auth.uid()` for RLS)
- Project Management (funnels and assets scoped to projects)
