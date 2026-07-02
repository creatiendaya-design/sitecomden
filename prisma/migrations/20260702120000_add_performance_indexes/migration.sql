-- CreateIndex
CREATE INDEX "Product_landingTemplateId_idx" ON "Product"("landingTemplateId");

-- CreateIndex
CREATE INDEX "Product_active_createdAt_idx" ON "Product"("active", "createdAt");

-- CreateIndex
CREATE INDEX "Product_active_basePrice_idx" ON "Product"("active", "basePrice");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_customerId_createdAt_idx" ON "PointTransaction"("customerId", "createdAt");
