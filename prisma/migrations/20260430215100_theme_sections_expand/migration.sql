-- CreateEnum
CREATE TYPE "ThemeSectionGroup" AS ENUM ('HEADER', 'FOOTER');

-- AlterTable
ALTER TABLE "Theme" ADD COLUMN     "sectionCatalog" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "ThemeSection" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "group" "ThemeSectionGroup" NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeSectionBlock" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSectionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThemeSection_themeId_group_position_idx" ON "ThemeSection"("themeId", "group", "position");

-- CreateIndex
CREATE INDEX "ThemeSectionBlock_sectionId_position_idx" ON "ThemeSectionBlock"("sectionId", "position");

-- AddForeignKey
ALTER TABLE "ThemeSection" ADD CONSTRAINT "ThemeSection_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeSectionBlock" ADD CONSTRAINT "ThemeSectionBlock_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ThemeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill default sections for every existing theme. Idempotent: each
-- INSERT is guarded by NOT EXISTS so re-running is safe.

-- HEADER_MAIN at position 0 (carries the legacy headerMenuId in content.menuId).
INSERT INTO "ThemeSection" ("id", "themeId", "group", "type", "position", "content", "enabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'HEADER',
  'HEADER_MAIN',
  0,
  jsonb_build_object('menuId', t."headerMenuId"),
  true,
  now(),
  now()
FROM "Theme" t
WHERE NOT EXISTS (
  SELECT 1 FROM "ThemeSection" s
  WHERE s."themeId" = t.id AND s."group" = 'HEADER' AND s."type" = 'HEADER_MAIN'
);

-- FOOTER_COLUMNS at position 0 (carries the legacy footerMenuId in __legacyFooterMenuId,
-- which the backfill script consumes to create LINK_COLUMN sub-blocks).
INSERT INTO "ThemeSection" ("id", "themeId", "group", "type", "position", "content", "enabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'FOOTER',
  'FOOTER_COLUMNS',
  0,
  jsonb_build_object(
    '__legacyFooterMenuId', t."footerMenuId",
    'aboutTitle', '',
    'aboutText', ''
  ),
  true,
  now(),
  now()
FROM "Theme" t
WHERE NOT EXISTS (
  SELECT 1 FROM "ThemeSection" s
  WHERE s."themeId" = t.id AND s."group" = 'FOOTER' AND s."type" = 'FOOTER_COLUMNS'
);

-- FOOTER_COPYRIGHT at position 1.
INSERT INTO "ThemeSection" ("id", "themeId", "group", "type", "position", "content", "enabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'FOOTER',
  'FOOTER_COPYRIGHT',
  1,
  '{}'::jsonb,
  true,
  now(),
  now()
FROM "Theme" t
WHERE NOT EXISTS (
  SELECT 1 FROM "ThemeSection" s
  WHERE s."themeId" = t.id AND s."group" = 'FOOTER' AND s."type" = 'FOOTER_COPYRIGHT'
);
