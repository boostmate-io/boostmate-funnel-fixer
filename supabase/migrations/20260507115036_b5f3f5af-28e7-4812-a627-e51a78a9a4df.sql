-- 1. Dedupe existing blueprint_core offers: keep oldest per blueprint
WITH ranked AS (
  SELECT id, blueprint_id,
         ROW_NUMBER() OVER (PARTITION BY blueprint_id ORDER BY created_at ASC) AS rn
  FROM offers
  WHERE source = 'blueprint_core'
)
DELETE FROM offers WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Prevent future duplicates at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS offers_unique_blueprint_core
ON offers (blueprint_id)
WHERE source = 'blueprint_core';