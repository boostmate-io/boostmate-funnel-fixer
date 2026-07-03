UPDATE public.copy_components
SET
  description = 'Client success stories',
  icon = 'Video',
  ui_interface_slug = 'results_proof_ui',
  ai_action_slug = 'generate_sales_copy_component',
  required_blueprint_fields = ARRAY['customer_avatar','dream_outcome','core_offer','proof_authority','client_results']::text[],
  output_structure = '[
    {"key":"section_headline","label":"Section Headline","type":"text"},
    {"key":"section_subheadline","label":"Section Subheadline","type":"text"},
    {"key":"video_1_quote","label":"Video 1 Quote","type":"text"},
    {"key":"video_1_author","label":"Video 1 Author","type":"text"},
    {"key":"video_2_quote","label":"Video 2 Quote","type":"text"},
    {"key":"video_2_author","label":"Video 2 Author","type":"text"},
    {"key":"video_3_quote","label":"Video 3 Quote","type":"text"},
    {"key":"video_3_author","label":"Video 3 Author","type":"text"},
    {"key":"case_1_result","label":"Case 1 Result","type":"text"},
    {"key":"case_2_result","label":"Case 2 Result","type":"text"},
    {"key":"case_3_result","label":"Case 3 Result","type":"text"},
    {"key":"case_4_result","label":"Case 4 Result","type":"text"},
    {"key":"cta_button_text","label":"CTA Button","type":"text"},
    {"key":"cta_subtext","label":"CTA Subtext","type":"text"},
    {"key":"scarcity_line","label":"Scarcity Line","type":"text"},
    {"key":"bottom_social_proof","label":"Bottom Social Proof","type":"text"}
  ]'::jsonb,
  instructions = $INSTR$Generate the Results Proof section of a high-ticket sales page.

The purpose of this section is to build belief by showing real, believable client outcomes.

Focus on:
- Build trust through proof instead of persuasion.
- Use language that sounds authentic and natural.
- Prioritize specificity over hype.
- Show a variety of client successes when possible.
- Make every result believable.
- Never exaggerate or invent unrealistic outcomes.

Generate:
• One section headline.
• One supporting subheadline.

Generate three testimonial quotes. Each testimonial should:
- Feel authentic.
- Mention one specific result or transformation.
- Stay under 30 words.
- Include an author attribution (video_N_author).

Generate four case-result summaries. Each case summary should:
- Briefly describe the client's starting point.
- Explain the outcome they achieved.
- Stay concise.
- Read naturally underneath a case study thumbnail.

Also generate a CTA block: cta_button_text, cta_subtext, scarcity_line, bottom_social_proof — consistent with the rest of the sales page.

Only use information available in the provided context. Never invent numbers, testimonials or outcomes not supported by the context. If the number of testimonials or case studies requested by the user is higher than what the context supports, generate fewer rather than fabricate.
$INSTR$
WHERE slug = 'results_proof';