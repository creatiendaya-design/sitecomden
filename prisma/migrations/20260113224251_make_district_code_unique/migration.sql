/*
  Warnings:

  - A unique constraint covering the columns `[districtCode]` on the table `ShippingZoneDistrict` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ShippingZoneDistrict_shippingZoneId_districtCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZoneDistrict_districtCode_key" ON "ShippingZoneDistrict"("districtCode");
