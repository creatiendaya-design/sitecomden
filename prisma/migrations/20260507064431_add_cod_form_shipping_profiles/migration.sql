-- AlterTable
ALTER TABLE "ShippingRate" ADD COLUMN     "excludeFromRegularCheckout" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_CodFormTemplateShippingRates" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CodFormTemplateShippingRates_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CodFormTemplateShippingRates_B_index" ON "_CodFormTemplateShippingRates"("B");

-- AddForeignKey
ALTER TABLE "_CodFormTemplateShippingRates" ADD CONSTRAINT "_CodFormTemplateShippingRates_A_fkey" FOREIGN KEY ("A") REFERENCES "CodFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CodFormTemplateShippingRates" ADD CONSTRAINT "_CodFormTemplateShippingRates_B_fkey" FOREIGN KEY ("B") REFERENCES "ShippingRate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
