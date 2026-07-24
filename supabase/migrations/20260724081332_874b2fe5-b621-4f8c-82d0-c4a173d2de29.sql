
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_build_guides TO authenticated;
GRANT ALL ON public.funnel_build_guides TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_build_task_progress TO authenticated;
GRANT ALL ON public.funnel_build_task_progress TO service_role;

GRANT SELECT ON public.build_guides TO authenticated, anon;
GRANT ALL ON public.build_guides TO service_role;

GRANT SELECT ON public.build_guide_stages TO authenticated, anon;
GRANT ALL ON public.build_guide_stages TO service_role;

GRANT SELECT ON public.build_guide_tasks TO authenticated, anon;
GRANT ALL ON public.build_guide_tasks TO service_role;

GRANT SELECT ON public.acquisition_channel_build_guides TO authenticated, anon;
GRANT ALL ON public.acquisition_channel_build_guides TO service_role;

GRANT SELECT ON public.growth_system_build_guides TO authenticated, anon;
GRANT ALL ON public.growth_system_build_guides TO service_role;
