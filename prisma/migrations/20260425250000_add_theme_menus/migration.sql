-- AlterTable
ALTER TABLE "Theme" ADD COLUMN "headerMenuId" TEXT;
ALTER TABLE "Theme" ADD COLUMN "footerMenuId" TEXT;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_headerMenuId_fkey" FOREIGN KEY ("headerMenuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_footerMenuId_fkey" FOREIGN KEY ("footerMenuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
