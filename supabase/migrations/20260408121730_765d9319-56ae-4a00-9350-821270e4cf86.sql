
-- Add name columns to profiles
ALTER TABLE public.profiles ADD COLUMN first_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN last_name text NOT NULL DEFAULT '';

-- Update trigger to store first/last name from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$function$;
