GRANT SELECT ON public.growth_roadmap_tasks TO anon;
GRANT SELECT ON public.growth_systems_catalog TO anon;

CREATE POLICY "Anon can read active roadmap tasks"
  ON public.growth_roadmap_tasks
  FOR SELECT
  TO anon
  USING (is_active);

CREATE POLICY "Anon can read active growth systems"
  ON public.growth_systems_catalog
  FOR SELECT
  TO anon
  USING (is_active);