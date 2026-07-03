UPDATE public.copy_components
SET
  name = 'Urgency / Exclusivity Decision',
  description = 'Decision moment',
  icon = 'Flag',
  ui_interface_slug = 'urgency_exclusivity_decision_ui',
  ai_action_slug = 'generate_sales_copy_component',
  required_blueprint_fields = ARRAY['customer_avatar','pain_points','dream_outcome','transformation','core_offer_stack','proof_authority']::text[],
  output_structure = '[
    {"key":"section_headline","label":"Section Headline","type":"text"},
    {"key":"section_subheadline","label":"Section Subheadline","type":"text"},
    {"key":"option_1_title","label":"Option 1 Title","type":"text"},
    {"key":"option_1_point_1","label":"Option 1 - Point 1","type":"text"},
    {"key":"option_1_point_2","label":"Option 1 - Point 2","type":"text"},
    {"key":"option_1_point_3","label":"Option 1 - Point 3","type":"text"},
    {"key":"option_1_point_4","label":"Option 1 - Point 4","type":"text"},
    {"key":"option_1_question","label":"Option 1 Reflection Question","type":"text"},
    {"key":"option_2_title","label":"Option 2 Title","type":"text"},
    {"key":"option_2_point_1","label":"Option 2 - Point 1","type":"text"},
    {"key":"option_2_point_2","label":"Option 2 - Point 2","type":"text"},
    {"key":"option_2_point_3","label":"Option 2 - Point 3","type":"text"},
    {"key":"option_2_point_4","label":"Option 2 - Point 4","type":"text"},
    {"key":"cta_button_text","label":"CTA Button Text","type":"text"},
    {"key":"cta_subtext","label":"CTA Subtext","type":"text"},
    {"key":"scarcity_line","label":"Scarcity Line","type":"text"},
    {"key":"bottom_social_proof","label":"Bottom Social Proof","type":"text"}
  ]'::jsonb,
  instructions = $$Generate the Urgency / Exclusivity Decision section of a high-ticket sales page.

PURPOSE
Create an internal decision — not through pressure, but through contrast. The reader should clearly compare "Continue doing what I've always done" vs. "Choose the better future."

WHAT TO GENERATE
- section_headline: One urgency-driven headline.
- section_subheadline: One supporting subheadline.

OPTION 1 — Represents remaining where they are
- option_1_title: One title.
- option_1_point_1..4: Four short consequences describing staying stuck, repeating old patterns, continued frustration, missed opportunities, emotional cost.
- option_1_question: One reflective closing question. Create reflection, not guilt.

OPTION 2 — Represents moving forward
- option_2_title: One title.
- option_2_point_1..4: Four positive outcome bullets focused on clarity, momentum, confidence, transformation, identity shift. Each bullet describes what becomes possible after taking action. Avoid exaggeration.

CTA — Reuse the previously generated CTA system when cta_mode = "reuse_hero":
- cta_button_text, cta_subtext, scarcity_line, bottom_social_proof.

STYLE RULES
- Do NOT invent fake scarcity.
- Do NOT pressure or manipulate.
- Create urgency by emphasizing that delaying change usually prolongs the current problem.
- Emotion target: clarity and commitment, not pressure.
- The reader should naturally conclude: "I don't want another six months to look exactly like the last six months."

Respect all user selections (section_headline_pattern, section_subheadline_pattern, left_title_pattern, left_focus, right_title_pattern, right_focus). When "ai_recommended", pick the best fit from the business context (Customer Avatar, Pain Points, Dream Outcome, Transformation, Core Offer / Stack, Proof & Authority).$$
WHERE slug = 'decision_section';