-- AlterTable
ALTER TABLE "ProductReview" ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "repliedBy" TEXT,
ADD COLUMN     "reply" TEXT;
