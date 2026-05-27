-- Plan 18 — Optimistic locking (Tier 1).
-- Adds a `version` column (Int, default 0) to every editable resource.
-- ADD COLUMN with a default is metadata-only in PG ≥ 11 (no table rewrite,
-- no row-level locks held during the migration). Safe to run on Neon.

ALTER TABLE "CategoryBlock"     ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product"           ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LandingBlock"      ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant"    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order"             ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Coupon"            ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Role"              ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Setting"           ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LandingTemplate"   ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Page"              ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Menu"              ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MenuItem"          ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PageBlock"         ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Policy"            ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Theme"             ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TemplateBlock"     ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ThemeSection"      ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ThemeSectionBlock" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
