import type { Prisma } from "@prisma/client";

/**
 * Devuelve al inventario el stock de los ítems de una orden reembolsada y deja
 * registro en el historial (`InventoryMovement` tipo RETURN).
 *
 * Debe invocarse DENTRO de una `prisma.$transaction`, junto al cambio de estado
 * a REFUNDED, para que stock e historial se muevan de forma atómica con el
 * reembolso. Inverso de `decrementStockAtomic` (ver decrement-stock.ts).
 *
 * Ítems sin `productId` (producto eliminado) se omiten — no hay fila que ajustar.
 */

export interface StockRestoreItem {
  productId: string | null;
  variantId: string | null;
  quantity: number;
}

export interface RestoreStockArgs {
  items: StockRestoreItem[];
  orderNumber: string;
  orderId: string;
  userId?: string;
}

export async function restoreStockForOrder(
  tx: Prisma.TransactionClient,
  { items, orderNumber, orderId, userId }: RestoreStockArgs
): Promise<void> {
  for (const item of items) {
    if (item.quantity <= 0) continue;

    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    } else if (item.productId) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    } else {
      continue; // sin producto ni variante: nada que ajustar
    }

    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        variantId: item.variantId,
        type: "RETURN",
        quantity: item.quantity,
        reason: `Reembolso orden #${orderNumber}`,
        reference: orderId,
        userId,
      },
    });
  }
}
