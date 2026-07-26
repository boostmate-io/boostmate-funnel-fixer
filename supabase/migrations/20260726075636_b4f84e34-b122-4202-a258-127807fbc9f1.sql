ALTER TABLE public.ai_instruction_blocks
  ADD COLUMN IF NOT EXISTS blueprint_scopes text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.ai_instruction_blocks SET blueprint_scopes = ARRAY['offer_design'] WHERE name = 'coach:offer-strategy';
UPDATE public.ai_instruction_blocks SET blueprint_scopes = ARRAY['offer_tier:free'] WHERE name = 'coach:free-offer';
UPDATE public.ai_instruction_blocks SET blueprint_scopes = ARRAY['offer_tier:low_mid'] WHERE name = 'coach:low-mid-ticket-offer';
UPDATE public.ai_instruction_blocks SET blueprint_scopes = ARRAY['offer_tier:high'] WHERE name = 'coach:high-ticket-offer';