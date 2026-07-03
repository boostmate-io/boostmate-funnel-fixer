UPDATE public.copy_components
SET
  name = 'Authority Context & Insight',
  description = 'Build understanding',
  icon = 'Brain',
  ui_interface_slug = 'authority_context_insight_ui',
  ai_action_slug = 'generate_sales_copy_component',
  required_blueprint_fields = ARRAY['customer_avatar','pain_points','dream_outcome','signature_method','proof_authority']::text[],
  instructions = $INSTR$Generate the Authority Context & Insight section of a high-ticket sales page.

The purpose of this section is NOT to sell the solution yet.
Its purpose is to demonstrate deep understanding of the prospect's reality while establishing authority through insight.

The reader should think: "They completely understand what I'm experiencing."

Structure:
- One section headline.
- One supporting subheadline.
- Two content blocks (each with a headline and four short paragraphs).

BLOCK 1 — Explain the current reality.
Focus on why most people struggle, confusion, misinformation, common mistakes, recurring patterns you have observed. Start with a strong headline, then write four short paragraphs that naturally build on each other. Avoid sounding preachy.

BLOCK 2 — Describe what daily life actually feels like.
Focus on emotional impact, practical frustrations, repeated failed attempts, loss of confidence, feeling stuck. Start with a relatable headline, then write four short conversational paragraphs. The reader should constantly think "That's exactly what I've been experiencing."

Do NOT introduce the full solution yet. Do NOT explain the framework yet. Simply build understanding and prepare the reader for the solution that comes next.

Reuse the previously generated CTA system for CTA Button, CTA Subtext, Scarcity Line, and Bottom Social Proof.

Only use information supported by the provided context. Never invent situations or exaggerate. The writing should feel calm, insightful and highly relatable.$INSTR$,
  output_structure = '[
    {"key":"section_headline","label":"Section Headline","type":"text"},
    {"key":"section_subheadline","label":"Section Subheadline","type":"text"},
    {"key":"block_1_headline","label":"Block 1 Headline","type":"text"},
    {"key":"block_1_paragraph_1","label":"Block 1 Paragraph 1","type":"text"},
    {"key":"block_1_paragraph_2","label":"Block 1 Paragraph 2","type":"text"},
    {"key":"block_1_paragraph_3","label":"Block 1 Paragraph 3","type":"text"},
    {"key":"block_1_paragraph_4","label":"Block 1 Paragraph 4","type":"text"},
    {"key":"block_2_headline","label":"Block 2 Headline","type":"text"},
    {"key":"block_2_paragraph_1","label":"Block 2 Paragraph 1","type":"text"},
    {"key":"block_2_paragraph_2","label":"Block 2 Paragraph 2","type":"text"},
    {"key":"block_2_paragraph_3","label":"Block 2 Paragraph 3","type":"text"},
    {"key":"block_2_paragraph_4","label":"Block 2 Paragraph 4","type":"text"},
    {"key":"cta_button_text","label":"CTA Button Text","type":"text"},
    {"key":"cta_subtext","label":"CTA Subtext","type":"text"},
    {"key":"scarcity_line","label":"Scarcity Line","type":"text"},
    {"key":"bottom_social_proof","label":"Bottom Social Proof","type":"text"}
  ]'::jsonb
WHERE slug = 'authority_insight';