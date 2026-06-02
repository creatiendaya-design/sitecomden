-- AlterTable
ALTER TABLE "MediaFile" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'vercel_blob',
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateIndex
CREATE INDEX "MediaFile_providerId_idx" ON "MediaFile"("providerId");
