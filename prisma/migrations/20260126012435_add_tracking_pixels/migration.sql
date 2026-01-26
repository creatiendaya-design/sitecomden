-- CreateEnum
CREATE TYPE "PixelPlatform" AS ENUM ('FACEBOOK', 'TIKTOK', 'GOOGLE_ADS', 'GOOGLE_ANALYTICS');

-- CreateTable
CREATE TABLE "TrackingPixel" (
    "id" TEXT NOT NULL,
    "platform" "PixelPlatform" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingPixel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackingPixel_platform_idx" ON "TrackingPixel"("platform");

-- CreateIndex
CREATE INDEX "TrackingPixel_enabled_idx" ON "TrackingPixel"("enabled");
