
-- Fix search path on the function
CREATE OR REPLACE FUNCTION public.update_funnel_updated_at()
RETURNS trigger LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
