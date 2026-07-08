UPDATE copy_components
SET output_structure = '[
  {"key":"section_headline","label":"Section Headline","role":"section_headline","type":"text"},
  {"key":"section_subheadline","label":"Section Subheadline","type":"text"},
  {"key":"block_1_headline","label":"Block 1 Headline","type":"text"},
  {"key":"block_1_paragraph_1","label":"Block 1 Paragraph 1","type":"text"},
  {"key":"block_1_paragraph_2","label":"Block 1 Paragraph 2","type":"text"},
  {"key":"block_2_headline","label":"Block 2 Headline","type":"text"},
  {"key":"block_2_paragraph_1","label":"Block 2 Paragraph 1","type":"text"},
  {"key":"block_2_paragraph_2","label":"Block 2 Paragraph 2","type":"text"},
  {"key":"cta_button_text","label":"CTA Button Text","type":"text"},
  {"key":"cta_subtext","label":"CTA Subtext","type":"text"},
  {"key":"scarcity_line","label":"Scarcity Line","type":"text"},
  {"key":"bottom_social_proof","label":"Bottom Social Proof","type":"text"}
]'::jsonb
WHERE ui_interface_slug = 'authority_context_insight_ui';