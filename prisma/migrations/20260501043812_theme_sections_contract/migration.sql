-- Plan 16 Phase E — Drop legacy Theme.headerMenuId / Theme.footerMenuId
-- columns. The Theme.sections relation (ThemeSection rows) is now the
-- source of truth for storefront header/footer composition.

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_headerMenuId_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_footerMenuId_fkey";

-- AlterTable
ALTER TABLE "Theme" DROP COLUMN "headerMenuId";
ALTER TABLE "Theme" DROP COLUMN "footerMenuId";
