-- Drop the BENEFITS value from the LandingBlockType enum.
-- Postgres cannot drop an enum value directly, so we:
--   1. Delete every block row that currently uses BENEFITS.
--   2. Rename the existing enum out of the way.
--   3. Create a new enum without BENEFITS.
--   4. Re-point every column to the new enum (USING ::text::new_enum).
--   5. Drop the old enum.

-- 1. Clean rows that reference the value we're about to drop.
DELETE FROM "LandingBlock"  WHERE "type" = 'BENEFITS';
DELETE FROM "TemplateBlock" WHERE "type" = 'BENEFITS';
DELETE FROM "PageBlock"     WHERE "type" = 'BENEFITS';
DELETE FROM "CategoryBlock" WHERE "type" = 'BENEFITS';

-- 2. Park the old enum so we can recreate it under the same name.
ALTER TYPE "LandingBlockType" RENAME TO "LandingBlockType_old";

-- 3. New enum without BENEFITS.
CREATE TYPE "LandingBlockType" AS ENUM (
  'HERO',
  'GALLERY',
  'TESTIMONIALS',
  'VIDEO',
  'COLORS',
  'TICKER',
  'RICH_TEXT',
  'FAQ',
  'IMAGE_TEXT',
  'RELATED_PRODUCTS',
  'TRUST_BADGES',
  'PRODUCT_GRID',
  'COMPARISON'
);

-- 4. Migrate columns to the new enum.
ALTER TABLE "LandingBlock"
  ALTER COLUMN "type" TYPE "LandingBlockType"
  USING "type"::text::"LandingBlockType";

ALTER TABLE "TemplateBlock"
  ALTER COLUMN "type" TYPE "LandingBlockType"
  USING "type"::text::"LandingBlockType";

ALTER TABLE "PageBlock"
  ALTER COLUMN "type" TYPE "LandingBlockType"
  USING "type"::text::"LandingBlockType";

ALTER TABLE "CategoryBlock"
  ALTER COLUMN "type" TYPE "LandingBlockType"
  USING "type"::text::"LandingBlockType";

-- 5. Drop the old enum.
DROP TYPE "LandingBlockType_old";
