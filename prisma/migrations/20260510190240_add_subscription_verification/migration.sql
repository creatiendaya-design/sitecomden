-- CreateTable
CREATE TABLE "SubscriptionVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionVerification_email_key" ON "SubscriptionVerification"("email");

-- CreateIndex
CREATE INDEX "SubscriptionVerification_email_idx" ON "SubscriptionVerification"("email");

-- CreateIndex
CREATE INDEX "SubscriptionVerification_verifiedAt_idx" ON "SubscriptionVerification"("verifiedAt");
