-- AlterTable
ALTER TABLE "Theme" ADD COLUMN "homePageId" TEXT;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_homePageId_fkey" FOREIGN KEY ("homePageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
