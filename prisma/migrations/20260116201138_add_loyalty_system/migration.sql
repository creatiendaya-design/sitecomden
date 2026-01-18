-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('PURCHASE', 'REFERRAL_BONUS', 'WELCOME_BONUS', 'BIRTHDAY_BONUS', 'ADMIN_ADJUSTMENT', 'REWARD_REDEMPTION', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DISCOUNT', 'PERCENTAGE', 'FREE_SHIPPING', 'PRODUCT');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "customerTier" "LoyaltyTier",
ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "dni" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "totalPointsSpent" INTEGER NOT NULL DEFAULT 0,
    "loyaltyTier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "birthday" TIMESTAMP(3),
    "address" JSONB,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPurchaseAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "PointTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardValue" DECIMAL(10,2) NOT NULL,
    "minPurchase" DECIMAL(10,2),
    "maxUses" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "allowedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "couponCode" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "usedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyProgramSettings" (
    "id" TEXT NOT NULL,
    "pointsPerSol" INTEGER NOT NULL DEFAULT 1,
    "solsPerPoint" DECIMAL(10,2) NOT NULL DEFAULT 0.10,
    "welcomeBonus" INTEGER NOT NULL DEFAULT 100,
    "referralBonus" INTEGER NOT NULL DEFAULT 200,
    "referredBonus" INTEGER NOT NULL DEFAULT 100,
    "birthdayBonus" INTEGER NOT NULL DEFAULT 150,
    "silverThreshold" INTEGER NOT NULL DEFAULT 500,
    "goldThreshold" INTEGER NOT NULL DEFAULT 2000,
    "platinumThreshold" INTEGER NOT NULL DEFAULT 5000,
    "silverDiscount" INTEGER NOT NULL DEFAULT 5,
    "goldDiscount" INTEGER NOT NULL DEFAULT 10,
    "platinumDiscount" INTEGER NOT NULL DEFAULT 15,
    "platinumFreeShipping" BOOLEAN NOT NULL DEFAULT true,
    "pointsExpireDays" INTEGER NOT NULL DEFAULT 365,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgramSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_dni_key" ON "Customer"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_referralCode_key" ON "Customer"("referralCode");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_referralCode_idx" ON "Customer"("referralCode");

-- CreateIndex
CREATE INDEX "Customer_referredById_idx" ON "Customer"("referredById");

-- CreateIndex
CREATE INDEX "PointTransaction_customerId_idx" ON "PointTransaction"("customerId");

-- CreateIndex
CREATE INDEX "PointTransaction_type_idx" ON "PointTransaction"("type");

-- CreateIndex
CREATE INDEX "PointTransaction_createdAt_idx" ON "PointTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Reward_pointsCost_idx" ON "Reward"("pointsCost");

-- CreateIndex
CREATE INDEX "Reward_active_idx" ON "Reward"("active");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_couponCode_key" ON "RewardRedemption"("couponCode");

-- CreateIndex
CREATE INDEX "RewardRedemption_customerId_idx" ON "RewardRedemption"("customerId");

-- CreateIndex
CREATE INDEX "RewardRedemption_status_idx" ON "RewardRedemption"("status");

-- CreateIndex
CREATE INDEX "RewardRedemption_couponCode_idx" ON "RewardRedemption"("couponCode");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
