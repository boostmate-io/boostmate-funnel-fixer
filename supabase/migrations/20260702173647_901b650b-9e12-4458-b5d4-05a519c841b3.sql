
UPDATE public.ai_actions
SET output_structure = '[
  {"key":"announcement_bar","label":"Top announcement bar text","type":"string"},
  {"key":"proof_badge","label":"Proof badge (short credibility indicator shown above the headline)","type":"string"},
  {"key":"pre_headline","label":"Pre-headline (call-out for the target audience or their pain)","type":"string"},
  {"key":"headline","label":"Main headline (outcome-driven, specific)","type":"string"},
  {"key":"subheadline","label":"Subheadline (expands the promise, handles objections)","type":"string"},
  {"key":"video_intro","label":"Short intro line above the video (empty string if no video)","type":"string"},
  {"key":"cta_button_text","label":"CTA button text","type":"string"},
  {"key":"cta_subtext","label":"CTA subtext (small line under the button)","type":"string"},
  {"key":"scarcity_line","label":"Scarcity or availability line under the CTA","type":"string"},
  {"key":"bottom_social_proof","label":"Bottom social proof badge (e.g. Loved by X clients)","type":"string"},
  {"key":"testimonial_quote","label":"Featured testimonial quote (client words only)","type":"string"},
  {"key":"testimonial_author","label":"Featured testimonial author (name + short context)","type":"string"},
  {"key":"logo_label","label":"Label above the featured logos row"}
]'::jsonb
WHERE slug = 'generate_big_promise_hero';
