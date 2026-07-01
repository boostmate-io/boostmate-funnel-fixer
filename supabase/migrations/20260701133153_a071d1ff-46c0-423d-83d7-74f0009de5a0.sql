
-- Convert outreach_messages.message_type from enum to text
ALTER TABLE public.outreach_messages
  ALTER COLUMN message_type TYPE text
  USING message_type::text;

-- Drop the old enum (safe: no more columns use it)
DROP TYPE IF EXISTS public.outreach_message_type;

-- Add jsonb map for arbitrary follow-up sent-at timestamps
ALTER TABLE public.outreach_leads
  ADD COLUMN IF NOT EXISTS followups_sent_at jsonb NOT NULL DEFAULT '{}'::jsonb;
