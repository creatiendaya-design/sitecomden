/**
 * Tests de aprobación/rechazo de pagos manuales (Yape/Plin).
 *
 * Lo que importa aquí: que aprobar descuente inventario (antes no lo hacía por
 * ninguna de las dos rutas que usaba la UI) y que aprobar dos veces no lo
 * descuente dos veces.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    pendingPayment: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    pendingPayment: { updateMany: vi.fn() },
    order: { update: vi.fn() },
    inventoryMovement: { create: vi.fn() },
  },
  decrementStockAtomic: vi.fn(),
  releaseOrderStock: vi.fn(),
  onOrderPaid: vi.fn(),
  logAudit: vi.fn(),
  revalidatePath: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => mocks.loggerChild } }));
vi.mock("@/lib/audit-log", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/lib/loyalty/award-purchase", () => ({ onOrderPaid: mocks.onOrderPaid }));
vi.mock("@/lib/inventory/release-order-stock", () => ({
  releaseOrderStock: mocks.releaseOrderStock,
}));
vi.mock("@/lib/inventory/decrement-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/inventory/decrement-stock")
  >("@/lib/inventory/decrement-stock");
  return {
    decrementStockAtomic: mocks.decrementStockAtomic,
    StockUnavailableError: actual.StockUnavailableError,
  };
});

import { approvePendingPayment, rejectPendingPayment } from "./verify-pending-payment";

const actor = { id: "user_1", email: "admin@shopgood.pe" };

function seedPayment(overrides: Record<string, unknown> = {}) {
  mocks.prisma.pendingPayment.findUnique.mockResolvedValue({
    id: "pay_1",
    amount: 199.9,
    method: "YAPE",
    order: {
      id: "order_1",
      orderNumber: "PED-0001",
      items: [
        { productId: "prod_1", variantId: null, quantity: 2, name: "Polo" },
      ],
    },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(mocks.tx),
  );
  mocks.tx.pendingPayment.updateMany.mockResolvedValue({ count: 1 });
  mocks.decrementStockAtomic.mockResolvedValue({ ok: true });
  mocks.releaseOrderStock.mockResolvedValue({ restoredUnits: 0, restoredLines: 0 });
});

describe("approvePendingPayment", () => {
  it("descuenta inventario al aprobar (Yape/Plin no descuentan al crear la orden)", async () => {
    seedPayment();

    const result = await approvePendingPayment("pay_1", actor);

    expect(result).toMatchObject({ ok: true, orderId: "order_1" });
    expect(mocks.decrementStockAtomic).toHaveBeenCalledWith(mocks.tx, {
      productId: "prod_1",
      variantId: undefined,
      quantity: 2,
      name: "Polo",
    });
    expect(mocks.tx.inventoryMovement.create).toHaveBeenCalledTimes(1);
    expect(mocks.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order_1" } }),
    );
  });

  it("reclama el pago de forma atómica sólo si seguía pendiente", async () => {
    seedPayment();

    await approvePendingPayment("pay_1", actor);

    expect(mocks.tx.pendingPayment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "pending" },
      data: expect.objectContaining({ status: "verified", verifiedBy: "user_1" }),
    });
  });

  it("una segunda aprobación no repite efectos", async () => {
    seedPayment();
    mocks.tx.pendingPayment.updateMany.mockResolvedValue({ count: 0 });

    const result = await approvePendingPayment("pay_1", actor);

    expect(result).toMatchObject({ ok: true, alreadyProcessed: true });
    expect(mocks.decrementStockAtomic).not.toHaveBeenCalled();
    expect(mocks.tx.order.update).not.toHaveBeenCalled();
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
  });

  it("revierte y avisa cuando el stock se agotó entre la compra y la aprobación", async () => {
    seedPayment();
    mocks.decrementStockAtomic.mockResolvedValue({
      ok: false,
      error: "Stock insuficiente para \"Polo\".",
    });

    const result = await approvePendingPayment("pay_1", actor);

    expect(result).toMatchObject({ ok: false, code: "STOCK_UNAVAILABLE" });
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
  });

  it("registra la aprobación en el audit log", async () => {
    seedPayment();

    await approvePendingPayment("pay_1", actor);

    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payment.approved",
        userId: "user_1",
        entityId: "pay_1",
      }),
    );
  });

  it("responde NOT_FOUND si el pago no existe", async () => {
    mocks.prisma.pendingPayment.findUnique.mockResolvedValue(null);

    const result = await approvePendingPayment("pay_x", actor);

    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});

describe("rejectPendingPayment", () => {
  it("cancela la orden y libera sólo el stock realmente retenido", async () => {
    seedPayment();

    const result = await rejectPendingPayment("pay_1", "Comprobante ilegible", actor);

    expect(result).toMatchObject({ ok: true, orderId: "order_1" });
    expect(mocks.tx.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: expect.objectContaining({
        paymentStatus: "FAILED",
        status: "CANCELLED",
      }),
    });
    expect(mocks.releaseOrderStock).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({ orderId: "order_1" }),
    );
  });

  it("un segundo rechazo no repite efectos", async () => {
    seedPayment();
    mocks.tx.pendingPayment.updateMany.mockResolvedValue({ count: 0 });

    const result = await rejectPendingPayment("pay_1", "motivo", actor);

    expect(result).toMatchObject({ ok: true, alreadyProcessed: true });
    expect(mocks.releaseOrderStock).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});
