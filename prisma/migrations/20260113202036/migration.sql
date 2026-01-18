/*
  Warnings:

  - You are about to drop the column `baseCost` on the `ShippingZone` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDays` on the `ShippingZone` table. All the data in the column will be lost.
  - You are about to drop the column `freeShippingMin` on the `ShippingZone` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ShippingZone_active_idx";

-- AlterTable
ALTER TABLE "ShippingZone" DROP COLUMN "baseCost",
DROP COLUMN "estimatedDays",
DROP COLUMN "freeShippingMin";

-- CreateTable
CREATE TABLE "ShippingRateGroup" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRateGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseCost" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "maxOrderAmount" DECIMAL(10,2),
    "freeShippingMin" DECIMAL(10,2),
    "estimatedDays" TEXT,
    "carrier" TEXT,
    "shippingType" TEXT,
    "timeWindow" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingRateGroup_zoneId_idx" ON "ShippingRateGroup"("zoneId");

-- CreateIndex
CREATE INDEX "ShippingRate_groupId_idx" ON "ShippingRate"("groupId");

-- AddForeignKey
ALTER TABLE "ShippingRateGroup" ADD CONSTRAINT "ShippingRateGroup_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ShippingRateGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
