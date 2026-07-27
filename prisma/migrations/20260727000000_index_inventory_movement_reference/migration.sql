-- releaseOrderStock() looks up an order's inventory movements by `reference`
-- to compute how much stock the order still holds. Without this index every
-- cancellation and payment rejection seq-scans InventoryMovement.

-- CreateIndex
CREATE INDEX "InventoryMovement_reference_idx" ON "InventoryMovement"("reference");
