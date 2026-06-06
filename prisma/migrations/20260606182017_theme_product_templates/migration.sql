-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "themeProductTemplateId" TEXT;

-- AlterTable
ALTER TABLE "ThemeSection" ADD COLUMN     "detached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "productTemplateId" TEXT,
ADD COLUMN     "sourceSectionId" TEXT;

-- CreateTable
CREATE TABLE "ThemeProductTemplate" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ThemeProductTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThemeProductTemplate_themeId_position_idx" ON "ThemeProductTemplate"("themeId", "position");

-- CreateIndex
CREATE INDEX "Product_themeProductTemplateId_idx" ON "Product"("themeProductTemplateId");

-- CreateIndex
CREATE INDEX "ThemeSection_productTemplateId_position_idx" ON "ThemeSection"("productTemplateId", "position");

-- CreateIndex
CREATE INDEX "ThemeSection_productId_position_idx" ON "ThemeSection"("productId", "position");

-- CreateIndex
CREATE INDEX "ThemeSection_sourceSectionId_idx" ON "ThemeSection"("sourceSectionId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_themeProductTemplateId_fkey" FOREIGN KEY ("themeProductTemplateId") REFERENCES "ThemeProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeProductTemplate" ADD CONSTRAINT "ThemeProductTemplate_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeSection" ADD CONSTRAINT "ThemeSection_productTemplateId_fkey" FOREIGN KEY ("productTemplateId") REFERENCES "ThemeProductTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeSection" ADD CONSTRAINT "ThemeSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Plan 19 data backfill (expand): every theme gets one default product
-- template, and its existing PRODUCT-group sections are attached to it so the
-- storefront keeps rendering identically. Products keep themeProductTemplateId
-- = NULL (= use the theme default). Pure-additive, zero data loss.
-- ---------------------------------------------------------------------------
INSERT INTO "ThemeProductTemplate" ("id", "themeId", "name", "isDefault", "position", "createdAt", "updatedAt", "version")
SELECT gen_random_uuid()::text, t."id", 'Predeterminada', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM "Theme" t;

UPDATE "ThemeSection" s
SET "productTemplateId" = tpt."id"
FROM "ThemeProductTemplate" tpt
WHERE tpt."themeId" = s."themeId"
  AND tpt."isDefault" = true
  AND s."group" = 'PRODUCT'
  AND s."productId" IS NULL
  AND s."productTemplateId" IS NULL;
