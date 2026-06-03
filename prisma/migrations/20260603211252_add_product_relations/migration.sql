-- CreateEnum
CREATE TYPE "ProductRelationType" AS ENUM ('BOUGHT_TOGETHER', 'CROSS_SELL');

-- CreateTable
CREATE TABLE "ProductRelation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "relatedProductId" TEXT NOT NULL,
    "type" "ProductRelationType" NOT NULL DEFAULT 'BOUGHT_TOGETHER',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductRelation_productId_type_position_idx" ON "ProductRelation"("productId", "type", "position");

-- CreateIndex
CREATE INDEX "ProductRelation_relatedProductId_idx" ON "ProductRelation"("relatedProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRelation_productId_relatedProductId_type_key" ON "ProductRelation"("productId", "relatedProductId", "type");

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_relatedProductId_fkey" FOREIGN KEY ("relatedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
