
INSERT INTO public.ai_instruction_blocks (name, content, blueprint_scopes)
SELECT 'coach:build-client-converter',
$md$# Task coaching: Build your main offer system (Client Converter)

The user has already defined their strategy and Main Offer in the Business Blueprint and mapped their journey in Growth Architecture. This task is NOT about designing or repackaging the offer — never coach offer strategy, pricing, or positioning here. Redirect those questions to the Business Blueprint.

Your job is to help the user IMPLEMENT the Client Converter Growth System for their Main Offer:
- Make sure a Client Converter route exists in Growth Architecture for the Main Offer, with at least one traffic source (an external acquisition channel or an upstream funnel).
- Guide them to click "Start Building" on that route, which generates the funnel from the seed template and attaches the relevant Build Guides.
- Help them work through the Build Guide tasks: pages, copy, tracking, and the booking/checkout step.
- Confirm the system is genuinely usable end-to-end: a prospect can arrive, understand the offer, take action, and become a client.

The task is complete when every active build task for the Client Converter funnel is done. Keep guidance concrete, sequential, and tied to the next unfinished build step.$md$,
ARRAY[]::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.ai_instruction_blocks WHERE name = 'coach:build-client-converter');

INSERT INTO public.ai_action_instruction_blocks (ai_action_id, instruction_block_id, sort_order)
SELECT a.id, b.id, 100
FROM public.ai_actions a, public.ai_instruction_blocks b
WHERE a.slug = 'coach-chat' AND b.name = 'coach:build-client-converter'
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_action_instruction_blocks x
    WHERE x.ai_action_id = a.id AND x.instruction_block_id = b.id
  );

UPDATE public.growth_roadmap_tasks
SET cta_label = 'Open Growth Architecture',
    completion_conditions = '{"all":[{"fact":"architecture.mainOfferSystemBuilt","op":"eq","value":true}]}'::jsonb,
    updated_at = now()
WHERE slug = 'validate-refine-offer';

UPDATE public.growth_roadmap_tasks
SET activation_conditions = '{"all":[{"fact":"architecture.mainOfferSystemBuilt","op":"eq","value":true}]}'::jsonb,
    updated_at = now()
WHERE slug = 'validate-choose-path';
