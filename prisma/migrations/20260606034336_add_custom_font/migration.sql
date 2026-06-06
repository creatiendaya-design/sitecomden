-- CreateTable
CREATE TABLE "CustomFont" (
    "id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFont_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFont_family_key" ON "CustomFont"("family");

-- CreateIndex
CREATE INDEX "CustomFont_updatedAt_idx" ON "CustomFont"("updatedAt");
