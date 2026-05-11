-- CreateEnum
CREATE TYPE "ProductPromotionType" AS ENUM ('VOLUME', 'SUBSCRIPTION', 'FREE_GIFT', 'BUNDLE');

-- CreateTable
CREATE TABLE "ProductPromotion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "ProductPromotionType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPromotion_productId_idx" ON "ProductPromotion"("productId");

-- CreateIndex
CREATE INDEX "ProductPromotion_productId_active_idx" ON "ProductPromotion"("productId", "active");

-- CreateIndex
CREATE INDEX "ProductPromotion_type_idx" ON "ProductPromotion"("type");

-- AddForeignKey
ALTER TABLE "ProductPromotion" ADD CONSTRAINT "ProductPromotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
