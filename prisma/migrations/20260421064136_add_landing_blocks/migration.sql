-- CreateEnum
CREATE TYPE "LandingBlockType" AS ENUM ('HERO', 'BENEFITS', 'GALLERY', 'TESTIMONIALS', 'VIDEO', 'COLORS', 'TICKER');

-- CreateTable
CREATE TABLE "LandingBlock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "LandingBlockType" NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingBlock_productId_position_idx" ON "LandingBlock"("productId", "position");

-- AddForeignKey
ALTER TABLE "LandingBlock" ADD CONSTRAINT "LandingBlock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
