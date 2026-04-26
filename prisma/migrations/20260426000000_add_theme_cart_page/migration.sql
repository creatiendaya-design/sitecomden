-- AlterTable
ALTER TABLE "Theme" ADD COLUMN "cartPageId" TEXT;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_cartPageId_fkey" FOREIGN KEY ("cartPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
