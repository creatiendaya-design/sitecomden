-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "policyType" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Policy_slug_key" ON "Policy"("slug");

-- CreateIndex
CREATE INDEX "Policy_slug_active_idx" ON "Policy"("slug", "active");

-- CreateIndex
CREATE INDEX "Policy_policyType_idx" ON "Policy"("policyType");
