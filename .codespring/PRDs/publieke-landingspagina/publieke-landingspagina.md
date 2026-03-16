# PRD: Public Landing Page

## Overview
Marketing landing page with a public audit wizard for lead generation. Visitors can perform a free funnel audit, after which they are prompted to create an account.

## Objectives
- Lead generation via free funnel audit
- Convert visitors into registered users
- Showcase BoostMate's AI capabilities

## Functional Requirements

### FR-1: Landing Page
- Hero section with value proposition
- Explanation of the audit functionality
- CTA to the audit wizard

### FR-2: Public Audit Wizard
- Same wizard as in the dashboard but without login required
- After completion: scraping and AI analysis are performed
- Results are displayed

### FR-3: Registration Flow
- After viewing results, registration is offered
- On registration, a project is automatically created
- Audit data, sales copy asset and funnel are linked to the project
- User lands directly in the dashboard

## Technical Details
- `src/pages/Index.tsx` — Landing page and public audit flow
- `src/components/audit/AuditWizard.tsx` — Public wizard
- After registration: automatic project and data creation

## Dependencies
- Authentication, Funnel Audit, Assets Library, Funnel Designer
