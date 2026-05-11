-- Flatten shipping rates: drop ShippingRateGroup, move zoneId + category to ShippingRate
-- Single transactional migration: expand + backfill + contract.

BEGIN;

-- 1. Add new columns to ShippingRate (nullable initially for backfill)
ALTER TABLE "ShippingRate" ADD COLUMN "zoneId" TEXT;
ALTER TABLE "ShippingRate" ADD COLUMN "category" TEXT;

-- 2. Backfill zoneId from the related group
UPDATE "ShippingRate" r
SET "zoneId" = g."zoneId"
FROM "ShippingRateGroup" g
WHERE r."groupId" = g."id";

-- 3. Backfill category from group name (only if non-default)
--    Default-like names are dropped because they were synthetic placeholders.
UPDATE "ShippingRate" r
SET "category" = g."name"
FROM "ShippingRateGroup" g
WHERE r."groupId" = g."id"
  AND LOWER(TRIM(g."name")) NOT IN (
    'default',
    'estandar',
    'estándar',
    'standard',
    'general',
    'tarifas'
  );

-- 4. Make zoneId NOT NULL now that it is populated
ALTER TABLE "ShippingRate" ALTER COLUMN "zoneId" SET NOT NULL;

-- 5. Add FK + index for new zoneId column
ALTER TABLE "ShippingRate"
  ADD CONSTRAINT "ShippingRate_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ShippingRate_zoneId_idx" ON "ShippingRate"("zoneId");

-- 6. Drop old groupId column + FK + index
ALTER TABLE "ShippingRate" DROP CONSTRAINT IF EXISTS "ShippingRate_groupId_fkey";
DROP INDEX IF EXISTS "ShippingRate_groupId_idx";
ALTER TABLE "ShippingRate" DROP COLUMN "groupId";

-- 7. Drop ShippingRateGroup table
DROP TABLE "ShippingRateGroup";

COMMIT;
