-- CreateEnum
CREATE TYPE "SwatchType" AS ENUM ('NONE', 'COLOR', 'IMAGE');

-- CreateEnum
CREATE TYPE "OptionDisplayStyle" AS ENUM ('DROPDOWN', 'BUTTONS', 'SWATCHES');

-- AlterTable
ALTER TABLE "ProductOption" ADD COLUMN     "displayStyle" "OptionDisplayStyle" NOT NULL DEFAULT 'DROPDOWN';

-- AlterTable
ALTER TABLE "ProductOptionValue" ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "swatchImage" TEXT,
ADD COLUMN     "swatchType" "SwatchType" NOT NULL DEFAULT 'NONE';
