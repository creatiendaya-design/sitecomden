/**
 * Ajuste manual de stock a un valor absoluto ("deja este SKU en 40"). Server-only.
 *
 * Por qué no es un `update` directo:
 *
 * El ajuste manual necesita registrar en el ledger la DIFERENCIA aplicada, y
 * esa diferencia se calcula contra el stock actual. Leer, calcular y escribir
 * en tres pasos sueltos rompía de dos maneras:
 *
 *  1. Dos admins ajustando a la vez leían el mismo valor de partida; el segundo
 *     pisaba al primero y el ledger quedaba con dos movimientos que no suman lo
 *     que el stock realmente cambió.
 *  2. El movimiento se creaba ANTES de escribir el stock y fuera de toda
 *     transacción: si la escritura fallaba, quedaba un movimiento fantasma que
 *     nadie aplicó (y al revés, con otro orden).
 *
 * Aquí el movimiento y la escritura viven en la misma transacción, y la
 * escritura es un compare-and-swap contra el stock leído: si alguien lo movió
 * en medio (otro admin, o una venta que descontó unidades) el CAS no prospera y
 * reintentamos con el valor fresco, de modo que la diferencia registrada
 * siempre corresponde al cambio real.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Sobre qué fila se ajusta. Si vienen ambos, manda la variante. */
export interface SetStockTarget {
  productId?: string | null;
  variantId?: string | null;
}

export type SetStockResult =
  | {
      outcome: "adjusted";
      previousStock: number;
      newStock: number;
      /** Firmada: positiva si entra mercancía, negativa si sale. */
      difference: number;
    }
  /** Ya estaba en ese valor: no se escribe nada ni se registra movimiento. */
  | { outcome: "unchanged"; previousStock: number }
  | { outcome: "not-found" }
  /** El stock cambió bajo nuestros pies más veces de las que reintentamos. */
  | { outcome: "conflict" };

/**
 * Cuántas veces reintentar el CAS. Tres cubre de sobra la contención real
 * (dos admins, o un admin y una venta); más que eso indica que algo está
 * escribiendo en bucle y es mejor fallar visiblemente que insistir.
 */
const MAX_ATTEMPTS = 3;

export async function setStockAbsolute(input: {
  target: SetStockTarget;
  newStock: number;
  reason: string;
}): Promise<SetStockResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await attemptSetStock(input);
    if (result.outcome !== "conflict") return result;
  }
  return { outcome: "conflict" };
}

async function attemptSetStock(input: {
  target: SetStockTarget;
  newStock: number;
  reason: string;
}): Promise<SetStockResult> {
  const { target, newStock, reason } = input;
  const variantId = target.variantId || null;
  const productId = variantId ? null : target.productId || null;

  if (!variantId && !productId) return { outcome: "not-found" };

  return prisma.$transaction(async (tx) => {
    const previousStock = await readStock(tx, { variantId, productId });
    if (previousStock === null) return { outcome: "not-found" };

    const difference = newStock - previousStock;
    if (difference === 0) return { outcome: "unchanged", previousStock };

    // Compare-and-swap: sólo escribe si el stock sigue siendo el que leímos.
    const claim = variantId
      ? await tx.productVariant.updateMany({
          where: { id: variantId, stock: previousStock },
          data: { stock: newStock },
        })
      : await tx.product.updateMany({
          where: { id: productId!, stock: previousStock },
          data: { stock: newStock },
        });

    if (claim.count === 0) return { outcome: "conflict" };

    await tx.inventoryMovement.create({
      data: {
        productId: productId ?? undefined,
        variantId: variantId ?? undefined,
        type: "ADJUSTMENT",
        quantity: difference,
        reason,
      },
    });

    return { outcome: "adjusted", previousStock, newStock, difference };
  });
}

async function readStock(
  tx: Prisma.TransactionClient,
  target: { variantId: string | null; productId: string | null },
): Promise<number | null> {
  if (target.variantId) {
    const variant = await tx.productVariant.findUnique({
      where: { id: target.variantId },
      select: { stock: true },
    });
    return variant?.stock ?? null;
  }

  const product = await tx.product.findUnique({
    where: { id: target.productId! },
    select: { stock: true },
  });
  return product?.stock ?? null;
}
