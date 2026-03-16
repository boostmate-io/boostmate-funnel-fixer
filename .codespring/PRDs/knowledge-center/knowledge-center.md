# PRD: Knowledge Center

## Overview
Admin-only module for uploading and managing reference documents that serve as a knowledge base for the AI when performing analyses and providing recommendations.

## Objectives
- Central knowledge base for AI-powered features
- Accessible only to administrators
- Support for multiple document formats

## Functional Requirements

### FR-1: Document Upload
- Upload PDF, DOCX, TXT and MD files
- Storage via Lovable Cloud Storage
- Metadata: title, filename, path, size, MIME type

### FR-2: Document Management
- List of all uploaded documents
- Rename documents
- Delete documents
- Only visible and accessible to admin users

### FR-3: AI Integration
- Documents serve as context for the `analyze-audit` Edge Function
- AI can consult reference documents when generating recommendations

## Database Schema

### Table: `knowledge_documents`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| title | text | Document title |
| file_name | text | Original filename |
| file_path | text | Storage path |
| file_size | bigint | File size in bytes |
| mime_type | text | MIME type |
| created_at | timestamptz | Creation date |
| updated_at | timestamptz | Last modified |

### RLS
- Admin only via `has_role(auth.uid(), 'admin')` policy

## Technical Details
- `src/components/dashboard/KnowledgeCenter.tsx` — Main component
- Lovable Cloud Storage for file storage
- Admin check via `user_roles` table

## Dependencies
- Authentication (admin role required)
