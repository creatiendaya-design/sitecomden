/*
  Warnings:

  - You are about to drop the column `order` on the `CodFormBlock` table. All the data in the column will be lost.
  - Added the required column `position` to the `CodFormBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CodFormBlock` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CodFormBlock_templateId_order_idx";

-- AlterTable
ALTER TABLE "CodFormBlock" DROP COLUMN "order",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "position" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "CodFormBlock_templateId_position_idx" ON "CodFormBlock"("templateId", "position");
