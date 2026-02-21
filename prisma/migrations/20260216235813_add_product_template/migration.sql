-- CreateEnum
CREATE TYPE "ProductTemplate" AS ENUM ('STANDARD', 'LANDING', 'MINIMAL', 'GALLERY');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "template" "ProductTemplate" NOT NULL DEFAULT 'STANDARD';

-- CreateIndex
CREATE INDEX "Product_template_idx" ON "Product"("template");
