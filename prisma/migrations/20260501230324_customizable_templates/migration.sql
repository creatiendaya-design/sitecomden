-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "customDesign" JSONB,
ADD COLUMN     "customDesignImages" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customizableMockupOverrides" JSONB,
ADD COLUMN     "customizableTemplateId" TEXT;

-- CreateTable
CREATE TABLE "CustomizableTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "surcharge" DECIMAL(10,2),
    "zones" JSONB NOT NULL DEFAULT '[]',
    "allowedFonts" JSONB NOT NULL DEFAULT '[]',
    "allowedColors" JSONB NOT NULL DEFAULT '[]',
    "allowCustomColors" BOOLEAN NOT NULL DEFAULT true,
    "sizeGuide" JSONB,
    "maxLayersPerZone" INTEGER NOT NULL DEFAULT 8,
    "maxCharsPerLayer" INTEGER NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomizableTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomizableTemplate_active_idx" ON "CustomizableTemplate"("active");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_customizableTemplateId_fkey" FOREIGN KEY ("customizableTemplateId") REFERENCES "CustomizableTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
