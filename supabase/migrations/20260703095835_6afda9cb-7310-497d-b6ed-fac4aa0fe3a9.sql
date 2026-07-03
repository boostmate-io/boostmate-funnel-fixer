
UPDATE public.copy_components
SET
  name = 'Additional Results Proof',
  slug = 'additional_results_proof',
  description = 'More success stories',
  icon = 'LayoutGrid',
  ui_interface_slug = 'additional_results_proof_ui',
  ai_action_slug = 'generate_sales_copy_component',
  required_blueprint_fields = ARRAY['customer_avatar','dream_outcome','client_results','proof_authority']::text[],
  output_structure = '[
    {"key":"section_headline","label":"Section Headline","type":"text"},
    {"key":"section_subheadline","label":"Section Subheadline","type":"text"},
    {"key":"result_1_caption","label":"Result 1 Caption","type":"text"},
    {"key":"result_2_caption","label":"Result 2 Caption","type":"text"},
    {"key":"result_3_caption","label":"Result 3 Caption","type":"text"},
    {"key":"result_4_caption","label":"Result 4 Caption","type":"text"},
    {"key":"result_5_caption","label":"Result 5 Caption","type":"text"},
    {"key":"result_6_caption","label":"Result 6 Caption","type":"text"},
    {"key":"result_7_caption","label":"Result 7 Caption","type":"text"},
    {"key":"result_8_caption","label":"Result 8 Caption","type":"text"},
    {"key":"cta_button_text","label":"CTA Button Text","type":"text"},
    {"key":"cta_subtext","label":"CTA Subtext","type":"text"},
    {"key":"scarcity_line","label":"Scarcity Line","type":"text"},
    {"key":"bottom_social_proof","label":"Bottom Social Proof","type":"text"}
  ]'::jsonb,
  instructions = $RULES$Generate the Additional Results Proof section of a high-ticket sales page.

This is the SECOND proof section. The first Results Proof component already demonstrated that the offer works. This section has a different objective:
- reinforce certainty
- demonstrate consistency
- create the feeling that many people are achieving similar results
- eliminate remaining skepticism

Generate:
• One section headline.
• One supporting subheadline.

Then generate eight short testimonial captions. Each caption should:
- be one sentence only
- sound like a real client
- focus on one concrete outcome
- remain believable
- stay under 15 words

Avoid repeating the same type of result. Mix practical and emotional wins whenever possible. Do NOT include names. Images will provide the credibility.

Reuse the previously generated CTA system for:
- CTA Button
- CTA Subtext
- Scarcity Line
- Bottom Social Proof

Only use information supported by the provided context. Never invent unrealistic numbers or exaggerated claims.

This section should make the reader think: "Wow... lots of people are getting results with this."$RULES$
WHERE id = 'c8445e8e-ee01-47b2-a016-4757de6d68c7';
