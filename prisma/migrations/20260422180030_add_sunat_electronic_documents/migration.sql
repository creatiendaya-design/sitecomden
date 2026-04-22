-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'ISSUED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "IgvType" AS ENUM ('GRAVADO', 'EXONERADO', 'INAFECTO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BOLETA', 'FACTURA');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "buyerFiscalAddress" TEXT,
ADD COLUMN     "buyerRazonSocial" TEXT,
ADD COLUMN     "buyerRuc" TEXT,
ADD COLUMN     "documentType" "DocumentType";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "igvType" "IgvType" NOT NULL DEFAULT 'GRAVADO';

-- CreateTable
CREATE TABLE "ElectronicDocument" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "series" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "fullNumber" TEXT NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "xmlContent" TEXT,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "cdrUrl" TEXT,
    "sunatCode" INTEGER,
    "hash" TEXT,
    "nubefactId" TEXT,
    "errorMessage" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicDocument_orderId_key" ON "ElectronicDocument"("orderId");

-- CreateIndex
CREATE INDEX "ElectronicDocument_orderId_idx" ON "ElectronicDocument"("orderId");

-- CreateIndex
CREATE INDEX "ElectronicDocument_status_idx" ON "ElectronicDocument"("status");

-- CreateIndex
CREATE INDEX "ElectronicDocument_type_idx" ON "ElectronicDocument"("type");

-- CreateIndex
CREATE INDEX "ElectronicDocument_fullNumber_idx" ON "ElectronicDocument"("fullNumber");

-- AddForeignKey
ALTER TABLE "ElectronicDocument" ADD CONSTRAINT "ElectronicDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
