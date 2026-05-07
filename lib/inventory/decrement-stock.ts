import type { Prisma } from "@prisma/client";

export interface StockDecrementItem {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
}

export interface StockDecrementResult {
  ok: boolean;
  error?: string;
}

/**
 * Atomically decrements stock for a single line item using `updateMany` with
 * a `stock: { gte: quantity }` guard. The UPDATE only succeeds when the row
 * still has enough stock at write time, so concurrent checkouts can never
 * push stock below zero (TOCTOU-safe).
 *
 * Must be invoked inside a `prisma.$transaction` so that the caller can
 * roll back the surrounding order/payment writes if the decrement fails.
 */
export async function decrementStockAtomic(
  tx: Prisma.TransactionClient,
  item: StockDecrementItem,
): Promise<StockDecrementResult> {
  if (item.variantId) {
    const result = await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        active: true,
        stock: { gte: item.quantity },
      },
      data: { stock: { decrement: item.quantity } },
    });

    if (result.count === 0) {
      return {
        ok: false,
        error: `Stock insuficiente para "${item.name}". Otro cliente acaba de comprarlo.`,
      };
    }
    return { ok: true };
  }

  const result = await tx.product.updateMany({
    where: {
      id: item.productId,
      active: true,
      stock: { gte: item.quantity },
    },
    data: { stock: { decrement: item.quantity } },
  });

  if (result.count === 0) {
    return {
      ok: false,
      error: `Stock insuficiente para "${item.name}". Otro cliente acaba de comprarlo.`,
    };
  }
  return { ok: true };
}

/**
 * Thrown inside `$transaction` to roll back when stock cannot be decremented.
 * Callers convert it back to a structured `{ success: false, error }` reply.
 */
export class StockUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockUnavailableError";
  }
}
