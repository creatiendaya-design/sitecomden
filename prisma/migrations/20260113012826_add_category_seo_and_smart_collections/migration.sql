-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('MANUAL', 'SMART');

-- CreateEnum
CREATE TYPE "ConditionRelation" AS ENUM ('AND', 'OR');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "collectionType" "CollectionType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT;

-- CreateTable
CREATE TABLE "CategoryCondition" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "relation" "ConditionRelation" NOT NULL DEFAULT 'AND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryCondition_categoryId_idx" ON "CategoryCondition"("categoryId");

-- CreateIndex
CREATE INDEX "Category_collectionType_idx" ON "Category"("collectionType");

-- AddForeignKey
ALTER TABLE "CategoryCondition" ADD CONSTRAINT "CategoryCondition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
