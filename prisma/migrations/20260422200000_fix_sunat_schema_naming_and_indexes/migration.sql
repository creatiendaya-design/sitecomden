-- Rename enum DocStatus -> DocumentStatus for naming consistency
ALTER TYPE "DocStatus" RENAME TO "DocumentStatus";

-- Remove redundant orderId index (the @unique constraint already creates one)
DROP INDEX IF EXISTS "ElectronicDocument_orderId_idx";

-- Add unique constraint on series+number (SUNAT documents must be globally unique per series)
CREATE UNIQUE INDEX "ElectronicDocument_series_number_key" ON "ElectronicDocument"("series", "number");
