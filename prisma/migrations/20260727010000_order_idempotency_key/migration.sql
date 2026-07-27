-- Idempotency key for checkout submissions.
--
-- Nullable on purpose: existing orders keep NULL and Postgres allows any
-- number of NULLs under a unique index, so no backfill is needed and order
-- creation paths that don't send a key keep working unchanged.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
