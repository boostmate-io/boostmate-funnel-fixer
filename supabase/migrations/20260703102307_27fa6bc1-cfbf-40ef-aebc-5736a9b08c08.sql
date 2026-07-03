UPDATE public.copy_components
SET
  name = 'Final Call to Action',
  description = 'Drive final action',
  icon = 'Flag',
  ui_interface_slug = 'final_cta_ui',
  ai_action_slug = 'generate_sales_copy_component',
  required_blueprint_fields = ARRAY['dream_outcome','transformation','core_offer_stack','offer_angle','guarantees','proof_authority']::text[],
  output_structure = '[
    {"key":"eyebrow","label":"Eyebrow","type":"text"},
    {"key":"section_headline","label":"Section Headline","type":"text"},
    {"key":"section_subheadline","label":"Supporting Paragraph","type":"long_text"},
    {"key":"cta_headline","label":"CTA Headline","type":"text"},
    {"key":"cta_subheadline","label":"CTA Supporting Line","type":"text"},
    {"key":"proof_line","label":"Proof Line","type":"text"}
  ]'::jsonb,
  instructions = $$Generate the Final CTA section of a high-ticket sales page.

PURPOSE
This is the final section before the visitor takes action. Do NOT introduce new information. Reinforce everything the reader has already seen. The reader should feel: "I'm ready."

WHAT TO GENERATE
- eyebrow: One short line above the headline that creates emotional recognition. Max 8 words.
- section_headline: One strong outcome-focused headline that reinforces the transformation. Do NOT introduce new promises. Max 2 lines.
- section_subheadline: One short supporting paragraph (2–3 short sentences) that reinforces transformation, reduces hesitation, reminds them they already know enough, optionally references the guarantee, and keeps momentum high.
- cta_headline: A short line placed above the global CTA. Max 8 words.
- cta_subheadline: One short supporting sentence.
- proof_line: One short credibility line. Max 6 words.

DO NOT GENERATE
- CTA button text
- CTA subline
- Scarcity line
These are injected automatically from the Global CTA component.

TONE
- Calm certainty > excitement.
- Do not try to persuade with new arguments — simply reinforce the decision the reader has already made.
- The visitor should finish thinking: "I know exactly what to do next."

Respect user selections: eyebrow_pattern, headline_pattern, paragraph_tone, guarantee_reminder, cta_headline_pattern, cta_subline_style, proof_line_focus. When "ai_recommended", choose the best fit from the Blueprint context (Dream Outcome, Transformation, Core Offer / Stack, Offer Angle, Guarantees, Proof & Authority).

Only use information supported by the provided context. Do not invent proof, results or guarantees.$$
WHERE slug = 'final_cta';