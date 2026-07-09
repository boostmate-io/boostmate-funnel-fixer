
-- Add funnel-node link fields to copy_documents
ALTER TABLE public.copy_documents
  ADD COLUMN IF NOT EXISTS funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funnel_node_id text;

CREATE INDEX IF NOT EXISTS idx_copy_documents_funnel_id ON public.copy_documents(funnel_id);

-- Remove Assets Library entirely
DROP TABLE IF EXISTS public.asset_sections CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;

-- Strip old asset references from funnel nodes and seed templates.
-- We keep any existing copySections on nodes (they were plain fallbacks); only
-- linkedAssetId is now meaningless.
UPDATE public.funnels
SET nodes = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN node ? 'data' AND node->'data' ? 'linkedAssetId'
        THEN jsonb_set(node, '{data}', (node->'data') - 'linkedAssetId')
      ELSE node
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(nodes) AS node
)
WHERE nodes IS NOT NULL AND jsonb_typeof(nodes) = 'array';

UPDATE public.seed_templates
SET nodes = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN node ? 'data' AND node->'data' ? 'linkedAssetId'
        THEN jsonb_set(node, '{data}', (node->'data') - 'linkedAssetId')
      ELSE node
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(nodes) AS node
)
WHERE nodes IS NOT NULL AND jsonb_typeof(nodes) = 'array';
