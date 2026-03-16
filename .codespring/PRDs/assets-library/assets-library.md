# PRD: Assets Library

## Overview
Management of sales copy assets with sections. Each asset contains structured content sections that can be edited with a rich text editor.

## Objectives
- Structured management of sales copy per funnel page
- Rich text editing per section
- Linking between assets and funnel nodes

## Functional Requirements

### FR-1: Assets List
- Overview of all assets for the active project
- Filter by type (currently: `sales_copy`)
- Create, rename and delete assets

### FR-2: Asset Sections
- Each asset contains multiple sections with title and content
- Sections have a sort order (`sort_order`)
- Add, remove and reorder sections

### FR-3: Rich Text Editor
- WYSIWYG editor per section (`RichTextEditor` component)
- Supports basic formatting (bold, italic, headings, lists)
- Content is saved as text

### FR-4: Integration with Funnel Designer
- Assets can be linked to funnel page nodes via `linkedAssetId`
- From the Node Details Panel in the Funnel Designer

## Database Schema

### Table: `assets`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Owner |
| project_id | uuid | FK to projects |
| name | text | Asset name |
| type | text | Asset type (default: 'sales_copy') |
| description | text | Optional description |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modified |

### Table: `asset_sections`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| asset_id | uuid | FK to assets |
| title | text | Section title |
| content | text | Section content |
| sort_order | integer | Order |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modified |

### RLS
- Assets: `user_id = auth.uid()`
- Asset sections: via subquery on assets table

## Technical Details
- `src/components/assets/AssetsLibrary.tsx` — Main component
- `src/components/assets/AssetSectionsList.tsx` — Sections list
- `src/components/assets/RichTextEditor.tsx` — WYSIWYG editor

## Dependencies
- Authentication, Project Management
