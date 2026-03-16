# PRD: Knowledge Center

## Overzicht
Admin-only module voor het uploaden en beheren van referentiedocumenten die als kennisbron dienen voor de AI bij het uitvoeren van analyses en het geven van adviezen.

## Doelstellingen
- Centrale kennisbron voor AI-gestuurde features
- Alleen toegankelijk voor administrators
- Ondersteuning voor meerdere documentformaten

## Functionele Vereisten

### FR-1: Document Upload
- Uploaden van PDF, DOCX, TXT en MD bestanden
- Opslag via Lovable Cloud Storage
- Metadata: titel, bestandsnaam, pad, grootte, MIME-type

### FR-2: Document Beheer
- Lijst van alle geüploade documenten
- Hernoemen van documenten
- Verwijderen van documenten
- Alleen zichtbaar en toegankelijk voor admin-gebruikers

### FR-3: AI Integratie
- Documenten dienen als context voor de `analyze-audit` Edge Function
- AI kan referentiedocumenten raadplegen bij het genereren van adviezen

## Database Schema

### Tabel: `knowledge_documents`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| title | text | Document titel |
| file_name | text | Originele bestandsnaam |
| file_path | text | Pad in storage |
| file_size | bigint | Bestandsgrootte in bytes |
| mime_type | text | MIME type |
| created_at | timestamptz | Aanmaakdatum |
| updated_at | timestamptz | Laatst gewijzigd |

### RLS
- Alleen admins via `has_role(auth.uid(), 'admin')` policy

## Technische Details
- `src/components/dashboard/KnowledgeCenter.tsx` — Hoofdcomponent
- Lovable Cloud Storage voor bestandsopslag
- Admin-check via `user_roles` tabel

## Afhankelijkheden
- Authenticatie (admin-rol vereist)
