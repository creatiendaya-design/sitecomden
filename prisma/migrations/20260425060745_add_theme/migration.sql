-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "defaultProductLandingTemplateId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Theme_active_idx" ON "Theme"("active");

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_defaultProductLandingTemplateId_fkey" FOREIGN KEY ("defaultProductLandingTemplateId") REFERENCES "LandingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
