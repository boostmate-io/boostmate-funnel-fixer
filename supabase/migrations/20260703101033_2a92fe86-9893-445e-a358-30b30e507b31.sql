UPDATE public.copy_components
SET
  name = 'Risk Reversal (Guarantee)',
  description = 'Risk-free guarantee',
  icon = 'Shield',
  ui_interface_slug = 'risk_reversal_guarantee_ui',
  ai_action_slug = 'generate_sales_copy_component',
  required_blueprint_fields = ARRAY['core_offer_stack','guarantees','proof_authority']::text[],
  output_structure = '[
    {"key":"guarantee_label","label":"Guarantee Label","type":"text"},
    {"key":"section_headline","label":"Section Headline","type":"text"},
    {"key":"paragraph_1","label":"Paragraph 1","type":"long_text"},
    {"key":"paragraph_2","label":"Paragraph 2","type":"long_text"},
    {"key":"cta_button_text","label":"CTA Button Text","type":"text"},
    {"key":"cta_subtext","label":"CTA Subtext","type":"text"},
    {"key":"scarcity_line","label":"Scarcity Line","type":"text"},
    {"key":"bottom_social_proof","label":"Bottom Social Proof","type":"text"}
  ]'::jsonb,
  instructions = $$Generate the Risk Reversal (Guarantee) section of a high-ticket sales page.

PURPOSE
The purpose of this section is to remove fear and make the buying decision feel completely safe. Reassure the prospect that there is little or no downside to taking action.

WHAT TO GENERATE
- guarantee_label: A short label above the headline (e.g. "Risk-Free Guarantee", "Your Success Guarantee", "Our Promise To You").
- section_headline: One strong guarantee headline that communicates confidence and peace of mind.
- paragraph_1: Explain what the guarantee is, how it works, and why it exists.
- paragraph_2: Reassure the reader that the process is simple, there are no hidden tricks, and the company stands behind its work.
- cta_button_text, cta_subtext, scarcity_line, bottom_social_proof: Reuse the previously generated CTA system when cta_mode = "reuse_hero". Otherwise generate a fresh, consistent CTA block.

STYLE RULES
- Keep everything short, human, and confidence-building.
- Do NOT use legal language.
- Do NOT list terms and conditions.
- Do NOT oversell.
- Do NOT generate any checklist items — this section has no checklist.
- The visual guarantee badge already communicates much of the trust, so copy should simply reinforce it.
- Overall feeling: "I have nothing to lose by taking the next step."

TRUTHFULNESS
- Only describe guarantees that are actually supported by the provided business context (Core Offer / Stack, Guarantees, Proof & Authority).
- If no explicit guarantee exists in the Blueprint, do NOT invent a money-back guarantee. Instead, generate copy around the safest truthful commitment available (e.g. transparent communication, satisfaction commitment, flexible support).

Respect the user selections for guarantee_type, headline_pattern, tone, and strength_focus. When set to "ai_recommended", pick the best fit based on the business context.$$
WHERE slug = 'guarantee';