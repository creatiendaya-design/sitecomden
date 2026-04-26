-- AlterTable
ALTER TABLE "Category" ADD COLUMN "hideProductGrid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CategoryBlock" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "LandingBlockType" NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryBlock_categoryId_position_idx" ON "CategoryBlock"("categoryId", "position");

-- AddForeignKey
ALTER TABLE "CategoryBlock" ADD CONSTRAINT "CategoryBlock_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
