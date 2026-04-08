-- Add share_token to offers
ALTER TABLE public.offers ADD COLUMN share_token text UNIQUE;

-- Allow anonymous read access via share_token
CREATE POLICY "Anyone can view offers via share_token"
ON public.offers
FOR SELECT
TO anon
USING (share_token IS NOT NULL);

-- Allow anonymous update for offers shared and not approved
CREATE POLICY "Anon can update shared non-approved offers"
ON public.offers
FOR UPDATE
TO anon
USING (share_token IS NOT NULL AND status != 'approved')
WITH CHECK (share_token IS NOT NULL AND status != 'approved');