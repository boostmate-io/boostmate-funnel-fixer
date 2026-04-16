---
name: Copy System
description: Modular AI copywriting with section-level components, frameworks, and document editor
type: feature
---
- Copy Components are SECTION-LEVEL (hero, problem, CTA section), not individual text elements
- Each component generates multiple structured output fields (headline, subheadline, body, CTA text, etc.)
- Component UIs must support multiple grouped inputs and render outputs as one structured section
- Tables: copy_components, copy_documents, copy_document_components, copy_frameworks
- Each component links to an AI Action (via ai_action_slug) and a UI interface (via ui_interface_slug)
- ComponentUIRenderer dispatches to dedicated UIs or falls back to GenericComponentUI
- Document editor has Builder (navigate components), Preview (merged content), Settings (context/instructions)
- Context sources: linked Offer data or custom text — passed to every AI Action call
- Frameworks define ordered sets of component slugs for document types (sales page, email sequence, etc.)
