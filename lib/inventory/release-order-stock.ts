/**
 * Devuelve al inventario el stock que una orden TODAVÍA retiene, calculado
 * desde el ledger `InventoryMovement` en lugar de deducirlo del método de pago.
 *
 * Por qué el ledger y no `order.items`:
 *
 * No todas las órdenes descuentan stock al crearse. El checkout estándar sólo
 * decrementa cuando el pago no requiere verificación manual, así que Yape/Plin
 * crean la orden SIN tocar el inventario. Restaurar `item.quantity` a ciegas
 * —como hacía la ruta de rechazo— INFLA el stock de esas órdenes: devuelve
 * unidades que nunca se retiraron. Y restaurar dos veces (cancelar una orden
 * ya reembolsada) lo infla otra vez.
 *
 * Los movimientos con `reference = orderId` son el registro real de lo que se
 * retiró (SALE, cantidad negativa) y de lo que ya se devolvió (RETURN, cantidad
 * positiva). Su suma por línea dice exactamente cuántas unidades siguen
 * retenidas: si es >= 0 no hay nada que devolver. Eso hace la operación
 * idempotente por construcción y correcta también para las órdenes históricas,
 * sin necesidad de backfill.
 */

import type { Prisma } from "@prisma/client";

export interface ReleaseOrderStockArgs {
  orderId: string;
  orderNumber: string;
  /** Texto que queda en el historial de inventario. */
  reason: string;
  userId?: string;
}

export interface ReleaseOrderStockResult {
  /** Unidades efectivamente devueltas al inventario. */
  restoredUnits: number;
  /** Número de líneas (producto o variante) ajustadas. */
  restoredLines: number;
}

/** Clave estable por línea de inventario: una variante o un producto simple. */
function lineKey(productId: string | null, variantId: string | null): string {
  return variantId ? `v:${variantId}` : `p:${productId}`;
}

/**
 * Debe invocarse DENTRO de una `prisma.$transaction`, junto al cambio de estado
 * que motiva la liberación, para que stock e historial se muevan de forma
 * atómica con él.
 */
export async function releaseOrderStock(
  tx: Prisma.TransactionClient,
  { orderId, orderNumber, reason, userId }: ReleaseOrderStockArgs,
): Promise<ReleaseOrderStockResult> {
  const movements = await tx.inventoryMovement.findMany({
    where: { reference: orderId, type: { in: ["SALE", "RETURN"] } },
    select: { productId: true, variantId: true, quantity: true },
  });

  // Saldo neto por línea. SALE llega en negativo y RETURN en positivo, así que
  // un neto negativo es exactamente lo que la orden sigue reteniendo.
  const held = new Map<
    string,
    { productId: string | null; variantId: string | null; net: number }
  >();

  for (const movement of movements) {
    const key = lineKey(movement.productId, movement.variantId);
    const current = held.get(key);

    if (current) {
      held.set(key, { ...current, net: current.net + movement.quantity });
    } else {
      held.set(key, {
        productId: movement.productId,
        variantId: movement.variantId,
        net: movement.quantity,
      });
    }
  }

  let restoredUnits = 0;
  let restoredLines = 0;

  for (const line of held.values()) {
    const toRestore = -line.net;
    if (toRestore <= 0) continue; // nada retenido (o ya devuelto)

    if (line.variantId) {
      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { stock: { increment: toRestore } },
      });
    } else if (line.productId) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { increment: toRestore } },
      });
    } else {
      continue; // movimiento sin producto ni variante: nada que ajustar
    }

    await tx.inventoryMovement.create({
      data: {
        productId: line.productId,
        variantId: line.variantId,
        type: "RETURN",
        quantity: toRestore,
        reason: `${reason} - Orden #${orderNumber}`,
        reference: orderId,
        userId,
      },
    });

    restoredUnits += toRestore;
    restoredLines += 1;
  }

  return { restoredUnits, restoredLines };
}
