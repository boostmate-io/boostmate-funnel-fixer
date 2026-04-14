ALTER TABLE public.outreach_leads
  ADD COLUMN last_name text NOT NULL DEFAULT '',
  ADD COLUMN profile_url_2 text NOT NULL DEFAULT '';