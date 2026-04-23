-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LandingBlockType" ADD VALUE 'RICH_TEXT';
ALTER TYPE "LandingBlockType" ADD VALUE 'FAQ';
ALTER TYPE "LandingBlockType" ADD VALUE 'IMAGE_TEXT';
ALTER TYPE "LandingBlockType" ADD VALUE 'RELATED_PRODUCTS';
ALTER TYPE "LandingBlockType" ADD VALUE 'TRUST_BADGES';

-- AlterTable
ALTER TABLE "LandingBlock" ADD COLUMN     "detached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceTemplateBlockId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "landingTemplateId" TEXT;

-- CreateTable
CREATE TABLE "LandingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "thumbnail" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateBlock" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" "LandingBlockType" NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingTemplate_active_category_idx" ON "LandingTemplate"("active", "category");

-- CreateIndex
CREATE INDEX "TemplateBlock_templateId_position_idx" ON "TemplateBlock"("templateId", "position");

-- CreateIndex
CREATE INDEX "LandingBlock_sourceTemplateBlockId_idx" ON "LandingBlock"("sourceTemplateBlockId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_landingTemplateId_fkey" FOREIGN KEY ("landingTemplateId") REFERENCES "LandingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateBlock" ADD CONSTRAINT "TemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LandingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
