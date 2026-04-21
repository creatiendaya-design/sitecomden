-- CreateEnum
CREATE TYPE "CheckoutMode" AS ENUM ('STANDARD', 'COD_ONLY', 'COD_AND_CART');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'COD';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "checkoutMode" "CheckoutMode" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "codFormSettings" JSONB;
