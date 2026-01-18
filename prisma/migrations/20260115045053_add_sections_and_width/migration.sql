-- AlterTable
ALTER TABLE "ComplaintFormField" ADD COLUMN     "section" TEXT,
ADD COLUMN     "width" TEXT NOT NULL DEFAULT 'full';

-- CreateIndex
CREATE INDEX "ComplaintFormField_section_idx" ON "ComplaintFormField"("section");
