-- Add share_token column to funnels
ALTER TABLE public.funnels ADD COLUMN share_token text UNIQUE DEFAULT NULL;

-- Allow anyone (including anonymous) to read a funnel by share_token
CREATE POLICY "Anyone can read shared funnels by token"
ON public.funnels
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL AND share_token != '');