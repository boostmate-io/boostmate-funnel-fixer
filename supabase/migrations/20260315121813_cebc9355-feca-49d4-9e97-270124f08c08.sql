ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS landing_page_screenshot text DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_page_content text DEFAULT '';