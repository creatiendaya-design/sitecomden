/**
 * Tests del ajuste manual de stock.
 *
 * Lo que importa: que el movimiento del ledger y el stock cambien juntos o no
 * cambien, y que dos ajustes concurrentes no se pisen registrando una
 * diferencia que nunca ocurrió.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  tx: {
    product: { findUnique: vi.fn(), updateMany: vi.fn() },
    productVariant: { findUnique: vi.fn(), updateMany: vi.fn() },
    inventoryMovement: { create: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));

import { setStockAbsolute } from "./set-stock";

const PRODUCT = { productId: "prod_1" };
const VARIANT = { variantId: "var_1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.$transaction.mockImplementation(
    (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx),
  );
});

describe("setStockAbsolute", () => {
  it("registra la diferencia y escribe el stock en la misma transacción", async () => {
    mocks.tx.product.findUnique.mockResolvedValue({ stock: 10 });
    mocks.tx.product.updateMany.mockResolvedValue({ count: 1 });

    const result = await setStockAbsolute({
      target: PRODUCT,
      newStock: 25,
      reason: "Recuento físico",
    });

    expect(result).toEqual({
      outcome: "adjusted",
      previousStock: 10,
      newStock: 25,
      difference: 15,
    });
    expect(mocks.tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "ADJUSTMENT", quantity: 15 }),
      }),
    );
    // Un solo $transaction: movimiento y stock no pueden separarse.
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("registra diferencia negativa cuando el ajuste baja el stock", async () => {
    mocks.tx.productVariant.findUnique.mockResolvedValue({ stock: 8 });
    mocks.tx.productVariant.updateMany.mockResolvedValue({ count: 1 });

    const result = await setStockAbsolute({
      target: VARIANT,
      newStock: 3,
      reason: "Merma",
    });

    expect(result).toMatchObject({ outcome: "adjusted", difference: -5 });
    expect(mocks.tx.inventoryMovement.create.mock.calls[0][0].data.quantity).toBe(-5);
  });

  it("condiciona la escritura al stock leído (compare-and-swap)", async () => {
    mocks.tx.product.findUnique.mockResolvedValue({ stock: 10 });
    mocks.tx.product.updateMany.mockResolvedValue({ count: 1 });

    await setStockAbsolute({ target: PRODUCT, newStock: 25, reason: "x" });

    expect(mocks.tx.product.updateMany.mock.calls[0][0].where).toEqual({
      id: "prod_1",
      stock: 10,
    });
  });

  it("no escribe nada si el stock ya está en el valor pedido", async () => {
    mocks.tx.product.findUnique.mockResolvedValue({ stock: 25 });

    const result = await setStockAbsolute({
      target: PRODUCT,
      newStock: 25,
      reason: "x",
    });

    expect(result).toEqual({ outcome: "unchanged", previousStock: 25 });
    expect(mocks.tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(mocks.tx.product.updateMany).not.toHaveBeenCalled();
  });

  it("no deja movimiento fantasma cuando otro flujo ganó la carrera", async () => {
    mocks.tx.product.findUnique.mockResolvedValue({ stock: 10 });
    mocks.tx.product.updateMany.mockResolvedValue({ count: 0 });

    const result = await setStockAbsolute({
      target: PRODUCT,
      newStock: 25,
      reason: "x",
    });

    expect(result).toEqual({ outcome: "conflict" });
    expect(mocks.tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("reintenta con el valor fresco y registra la diferencia real", async () => {
    // Primer intento: leemos 10, pero alguien lo dejó en 7 antes de escribir.
    // Segundo intento: leemos 7 y el CAS prospera. La diferencia registrada
    // debe ser 25-7=18, no 25-10=15.
    mocks.tx.product.findUnique
      .mockResolvedValueOnce({ stock: 10 })
      .mockResolvedValueOnce({ stock: 7 });
    mocks.tx.product.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await setStockAbsolute({
      target: PRODUCT,
      newStock: 25,
      reason: "x",
    });

    expect(result).toMatchObject({
      outcome: "adjusted",
      previousStock: 7,
      difference: 18,
    });
  });

  it("se rinde tras varios conflictos seguidos en vez de insistir", async () => {
    mocks.tx.product.findUnique.mockResolvedValue({ stock: 10 });
    mocks.tx.product.updateMany.mockResolvedValue({ count: 0 });

    const result = await setStockAbsolute({
      target: PRODUCT,
      newStock: 25,
      reason: "x",
    });

    expect(result).toEqual({ outcome: "conflict" });
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("reporta not-found si la fila no existe", async () => {
    mocks.tx.productVariant.findUnique.mockResolvedValue(null);

    const result = await setStockAbsolute({
      target: VARIANT,
      newStock: 5,
      reason: "x",
    });

    expect(result).toEqual({ outcome: "not-found" });
  });

  it("la variante manda sobre el producto cuando vienen ambos", async () => {
    mocks.tx.productVariant.findUnique.mockResolvedValue({ stock: 2 });
    mocks.tx.productVariant.updateMany.mockResolvedValue({ count: 1 });

    await setStockAbsolute({
      target: { productId: "prod_1", variantId: "var_1" },
      newStock: 4,
      reason: "x",
    });

    expect(mocks.tx.product.updateMany).not.toHaveBeenCalled();
    // El movimiento se cuelga de la variante, no del producto.
    const data = mocks.tx.inventoryMovement.create.mock.calls[0][0].data;
    expect(data.variantId).toBe("var_1");
    expect(data.productId).toBeUndefined();
  });
});
