/*
  Warnings:

  - A unique constraint covering the columns `[viewToken]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - The required column `viewToken` was added to the `Order` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "viewToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_viewToken_key" ON "Order"("viewToken");
