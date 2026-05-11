-- CreateEnum
CREATE TYPE "SizeUnit" AS ENUM ('CM', 'IN');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sizeGuideId" TEXT;

-- CreateTable
CREATE TABLE "SizeGuide" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "SizeUnit" NOT NULL DEFAULT 'CM',
    "tabs" JSONB NOT NULL DEFAULT '[]',
    "table" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SizeGuide_active_idx" ON "SizeGuide"("active");

-- CreateIndex
CREATE INDEX "Product_sizeGuideId_idx" ON "Product"("sizeGuideId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sizeGuideId_fkey" FOREIGN KEY ("sizeGuideId") REFERENCES "SizeGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
