-- CreateEnum
CREATE TYPE "CodFormBlockType" AS ENUM ('HEADER', 'CART_ITEMS', 'SHIPPING_OPTIONS', 'ORDER_SUMMARY', 'SUBMIT_BUTTON', 'FIELD_NAME', 'FIELD_PHONE', 'FIELD_EMAIL', 'FIELD_DNI', 'FIELD_ADDRESS', 'FIELD_ADDRESS_2', 'FIELD_PROVINCE', 'FIELD_CITY', 'FIELD_REFERENCE', 'FIELD_NOTES');

-- CreateEnum
CREATE TYPE "PostSubmitAction" AS ENUM ('INLINE_THANK_YOU', 'WHATSAPP_REDIRECT', 'THANK_YOU_PAGE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "codFormTemplateId" TEXT,
ADD COLUMN     "shippingRestriction" JSONB;

-- CreateTable
CREATE TABLE "CodFormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "buttonText" TEXT NOT NULL DEFAULT 'Realizar Pedido y Pagar al Recibir',
    "buttonStyle" JSONB NOT NULL DEFAULT '{}',
    "postSubmitAction" "PostSubmitAction" NOT NULL DEFAULT 'INLINE_THANK_YOU',
    "thankYouTitle" TEXT,
    "thankYouMessage" TEXT,
    "whatsappNumber" TEXT,
    "whatsappMessage" TEXT,
    "thankYouPageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodFormBlock" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "CodFormBlockType" NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CodFormBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodFormTemplate_name_key" ON "CodFormTemplate"("name");

-- CreateIndex
CREATE INDEX "CodFormTemplate_isDefault_idx" ON "CodFormTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "CodFormTemplate_thankYouPageId_idx" ON "CodFormTemplate"("thankYouPageId");

-- CreateIndex
CREATE INDEX "CodFormBlock_templateId_order_idx" ON "CodFormBlock"("templateId", "order");

-- CreateIndex
CREATE INDEX "Product_codFormTemplateId_idx" ON "Product"("codFormTemplateId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_codFormTemplateId_fkey" FOREIGN KEY ("codFormTemplateId") REFERENCES "CodFormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodFormTemplate" ADD CONSTRAINT "CodFormTemplate_thankYouPageId_fkey" FOREIGN KEY ("thankYouPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodFormBlock" ADD CONSTRAINT "CodFormBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CodFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
