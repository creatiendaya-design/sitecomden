/**
 * Tests de releaseOrderStock.
 *
 * El valor de esta función está en lo que NO devuelve: stock de órdenes que
 * nunca lo descontaron (Yape/Plin) y segundas devoluciones sobre una orden ya
 * liberada. Los casos negativos son, por tanto, los importantes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { releaseOrderStock } from "./release-order-stock";

type Movement = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
};

function makeTx(movements: Movement[]) {
  return {
    inventoryMovement: {
      findMany: vi.fn().mockResolvedValue(movements),
      create: vi.fn().mockResolvedValue({}),
    },
    product: { update: vi.fn().mockResolvedValue({}) },
    productVariant: { update: vi.fn().mockResolvedValue({}) },
  };
}

const args = {
  orderId: "order_1",
  orderNumber: "PED-0001",
  reason: "Cancelación",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("releaseOrderStock", () => {
  it("devuelve lo que la orden retiene, por producto y por variante", async () => {
    const tx = makeTx([
      { productId: "prod_1", variantId: null, quantity: -2 },
      { productId: null, variantId: "var_1", quantity: -3 },
    ]);

    const result = await releaseOrderStock(tx as never, args);

    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 2 } },
    });
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "var_1" },
      data: { stock: { increment: 3 } },
    });
    expect(result).toEqual({ restoredUnits: 5, restoredLines: 2 });
  });

  it("NO devuelve nada cuando la orden nunca descontó stock (Yape/Plin)", async () => {
    // El checkout estándar no decrementa para pagos de verificación manual,
    // así que no hay movimientos SALE con esta referencia.
    const tx = makeTx([]);

    const result = await releaseOrderStock(tx as never, args);

    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.productVariant.update).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(result).toEqual({ restoredUnits: 0, restoredLines: 0 });
  });

  it("es idempotente: una segunda pasada no vuelve a devolver stock", async () => {
    // Estado del ledger tras una primera liberación: SALE -2 y RETURN +2.
    const tx = makeTx([
      { productId: "prod_1", variantId: null, quantity: -2 },
      { productId: "prod_1", variantId: null, quantity: 2 },
    ]);

    const result = await releaseOrderStock(tx as never, args);

    expect(tx.product.update).not.toHaveBeenCalled();
    expect(result).toEqual({ restoredUnits: 0, restoredLines: 0 });
  });

  it("devuelve sólo el remanente cuando ya hubo una devolución parcial", async () => {
    const tx = makeTx([
      { productId: "prod_1", variantId: null, quantity: -5 },
      { productId: "prod_1", variantId: null, quantity: 2 },
    ]);

    const result = await releaseOrderStock(tx as never, args);

    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 3 } },
    });
    expect(result).toEqual({ restoredUnits: 3, restoredLines: 1 });
  });

  it("registra el movimiento RETURN con la referencia de la orden", async () => {
    const tx = makeTx([{ productId: null, variantId: "var_9", quantity: -1 }]);

    await releaseOrderStock(tx as never, { ...args, userId: "user_7" });

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: {
        productId: null,
        variantId: "var_9",
        type: "RETURN",
        quantity: 1,
        reason: "Cancelación - Orden #PED-0001",
        reference: "order_1",
        userId: "user_7",
      },
    });
  });

  it("agrupa varios movimientos de la misma línea antes de decidir", async () => {
    // Dos SALE sobre el mismo producto (p. ej. producto + regalo) se suman.
    const tx = makeTx([
      { productId: "prod_1", variantId: null, quantity: -2 },
      { productId: "prod_1", variantId: null, quantity: -1 },
    ]);

    const result = await releaseOrderStock(tx as never, args);

    expect(tx.product.update).toHaveBeenCalledTimes(1);
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 3 } },
    });
    expect(result).toEqual({ restoredUnits: 3, restoredLines: 1 });
  });

  it("consulta sólo movimientos SALE/RETURN de esa orden", async () => {
    const tx = makeTx([]);

    await releaseOrderStock(tx as never, args);

    expect(tx.inventoryMovement.findMany).toHaveBeenCalledWith({
      where: { reference: "order_1", type: { in: ["SALE", "RETURN"] } },
      select: { productId: true, variantId: true, quantity: true },
    });
  });
});
