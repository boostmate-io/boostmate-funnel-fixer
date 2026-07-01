ALTER TABLE public.outreach_leads ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS outreach_leads_archived_at_idx ON public.outreach_leads(archived_at);