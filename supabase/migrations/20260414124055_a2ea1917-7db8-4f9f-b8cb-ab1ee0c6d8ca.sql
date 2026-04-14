-- Add not_interested to outreach_status enum
ALTER TYPE public.outreach_status ADD VALUE IF NOT EXISTS 'not_interested';

-- Add extended fields to outreach_setup_types
ALTER TABLE public.outreach_setup_types
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_action text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_problem text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_angle text NOT NULL DEFAULT '';

-- Add soft delete and follow-up tracking to outreach_leads
ALTER TABLE public.outreach_leads
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS opener_sent_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fu1_sent_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fu2_sent_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fu3_sent_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fu4_sent_at timestamp with time zone DEFAULT NULL;

-- Update RLS policy to exclude soft-deleted leads
DROP POLICY IF EXISTS "Sub account members can manage outreach leads" ON public.outreach_leads;
CREATE POLICY "Sub account members can manage outreach leads"
ON public.outreach_leads
FOR ALL
TO authenticated
USING (
  (deleted_at IS NULL) AND
  (is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid()))
)
WITH CHECK (
  is_sub_account_member(auth.uid(), sub_account_id) OR is_app_admin(auth.uid())
);