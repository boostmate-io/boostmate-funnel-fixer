UPDATE public.copy_components
SET
  name = 'Objections & Solutions (FAQ)',
  description = 'Answer objections',
  icon = 'HelpCircle',
  ui_interface_slug = 'faq_objections_ui',
  ai_action_slug = 'generate_sales_copy_component',
  required_blueprint_fields = ARRAY['customer_avatar','pain_points','dream_outcome','core_offer_stack','pricing','guarantees','proof_authority']::text[],
  output_structure = '[
    {"key":"section_headline","label":"Section Headline","type":"text"},
    {"key":"section_subheadline","label":"Section Subheadline","type":"text"},
    {"key":"faq_1_question","label":"FAQ 1 - Question","type":"text"},
    {"key":"faq_1_answer","label":"FAQ 1 - Answer","type":"long_text"},
    {"key":"faq_2_question","label":"FAQ 2 - Question","type":"text"},
    {"key":"faq_2_answer","label":"FAQ 2 - Answer","type":"long_text"},
    {"key":"faq_3_question","label":"FAQ 3 - Question","type":"text"},
    {"key":"faq_3_answer","label":"FAQ 3 - Answer","type":"long_text"},
    {"key":"faq_4_question","label":"FAQ 4 - Question","type":"text"},
    {"key":"faq_4_answer","label":"FAQ 4 - Answer","type":"long_text"},
    {"key":"faq_5_question","label":"FAQ 5 - Question","type":"text"},
    {"key":"faq_5_answer","label":"FAQ 5 - Answer","type":"long_text"}
  ]'::jsonb,
  instructions = $$Generate the FAQ (Objections & Solutions) section of a high-ticket sales page.

PURPOSE
Remove the final objections that could prevent someone from taking action. Every answer should increase clarity, trust and confidence.

WHAT TO GENERATE
- section_headline: One section headline.
- section_subheadline: One supporting subheadline.
- Then generate the requested number of FAQ items (num_faqs input; default 5). Each FAQ has one question and one concise answer, in fields faq_{n}_question / faq_{n}_answer.

QUESTION SELECTION
Focus on the objections most relevant to THIS specific offer. Common categories:
- Is this right for me? / Suitability
- How long until I see results?
- Time commitment
- Risk
- What happens after applying?
- Pricing (only if appropriate)
- Experience level
- Implementation
- Support
Avoid generic filler. Always derive questions from the specific offer, customer avatar and pain points in the Blueprint.

ANSWER STYLE
- Conversational, reassuring, transparent.
- Avoid hype and defensive tone.
- Reinforce confidence without feeling like a sales pitch.
- Around 2–4 short paragraphs or 3–6 concise sentences.
- Only use information supported by the provided context. Do not invent guarantees or promises.
- Feel like talking to a knowledgeable advisor, not a legal document.
- Reader should finish thinking: "Every concern I had has been answered."

Respect user selections: section_headline_pattern, section_subheadline_pattern, num_faqs, faq_focus, answer_style. When "ai_recommended", choose the best fit from the Blueprint context.$$
WHERE slug = 'faq';