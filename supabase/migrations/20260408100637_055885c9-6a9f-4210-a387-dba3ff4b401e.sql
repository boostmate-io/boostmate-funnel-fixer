
ALTER TABLE public.funnels
  ADD COLUMN linked_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

CREATE POLICY "Anyone can read offers via shared funnels"
  ON public.offers FOR SELECT
  TO anon, authenticated
  USING (id IN (
    SELECT f.linked_offer_id FROM public.funnels f
    WHERE f.linked_offer_id IS NOT NULL
      AND f.share_token IS NOT NULL AND f.share_token <> ''
  ));

CREATE POLICY "Anyone can update offers via shared funnels if not approved"
  ON public.offers FOR UPDATE
  TO anon, authenticated
  USING (
    status <> 'approved'
    AND id IN (
      SELECT f.linked_offer_id FROM public.funnels f
      WHERE f.linked_offer_id IS NOT NULL
        AND f.share_token IS NOT NULL AND f.share_token <> ''
    )
  )
  WITH CHECK (
    status <> 'approved'
    AND id IN (
      SELECT f.linked_offer_id FROM public.funnels f
      WHERE f.linked_offer_id IS NOT NULL
        AND f.share_token IS NOT NULL AND f.share_token <> ''
    )
  );
