# PRD: Project Management

## Overview
Users can create and manage multiple projects. All data (funnels, assets, audits, analytics) is scoped to an active project.

## Objectives
- Separated data per project (multi-tenant at user level)
- Quick switching between projects via sidebar
- CRUD operations on projects

## Functional Requirements

### FR-1: Project CRUD
- Create a new project with a name
- Rename an existing project
- Delete a project (with cascade delete of related data)
- List all projects belonging to the logged-in user

### FR-2: Project Switcher
- Sidebar component `ProjectSwitcher` displays the active project
- Dropdown to quickly switch between projects
- On switch, all data is reloaded for the new project

### FR-3: Project Context
- `ProjectContext` (React Context) manages the active project
- All data-fetching queries filter on `project_id`
- First project is automatically selected on login

## Database Schema

### Table: `projects`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Owner |
| name | text | Project name (default: 'My Project') |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modified |

### RLS
- Users can only manage their own projects (`user_id = auth.uid()`)

## Technical Details
- `src/contexts/ProjectContext.tsx` — React Context for active project
- `src/components/dashboard/ProjectSwitcher.tsx` — UI component
- `src/components/dashboard/ProjectSettings.tsx` — Settings
- All tables with `project_id` column: `funnels`, `assets`, `audits`

## Dependencies
- Authentication (user must be logged in)
