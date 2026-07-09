ALTER TABLE public.funnel_analytics_entries ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'day';
ALTER TABLE public.funnel_analytics_entries ADD COLUMN IF NOT EXISTS period_end date;
UPDATE public.funnel_analytics_entries SET period_end = date WHERE period_end IS NULL;
ALTER TABLE public.funnel_analytics_entries ALTER COLUMN period_end SET NOT NULL;
ALTER TABLE public.funnel_analytics_entries DROP CONSTRAINT IF EXISTS funnel_analytics_entries_funnel_id_date_key;
ALTER TABLE public.funnel_analytics_entries ADD CONSTRAINT funnel_analytics_entries_funnel_period_key UNIQUE (funnel_id, date, period_type);