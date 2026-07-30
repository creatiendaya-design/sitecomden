/**
 * Tests de las transiciones orden↔pago compartidas por las pasarelas externas.
 *
 * Lo que importa aquí: que un pago que llega tarde NO pueda resucitar una orden
 * cancelada (que ya devolvió su stock), que ese dinero quede registrado en vez
 * de perderse en silencio, y que cerrar una orden por pago fallido libere el
 * inventario una sola vez.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    order: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    order: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
  releaseOrderStock: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => mocks.loggerChild } }));
vi.mock("@/lib/inventory/release-order-stock", () => ({
  releaseOrderStock: mocks.releaseOrderStock,
}));

import {
  cancelOrderForFailedPayment,
  claimOrderAsPaid,
  isDuplicateProviderPayment,
  recordOrphanPayment,
} from "./order-payment-state";

const PAID_DATA = { status: "PAID", paymentStatus: "PAID" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.$transaction.mockImplementation(
    (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx),
  );
  mocks.releaseOrderStock.mockResolvedValue({ restoredUnits: 0, restoredLines: 0 });
});

describe("claimOrderAsPaid", () => {
  it("marca pagada una orden pagable", async () => {
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await claimOrderAsPaid("ord_1", PAID_DATA);

    expect(result).toEqual({ outcome: "claimed" });
    expect(mocks.prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it("excluye órdenes canceladas y reembolsadas en el propio WHERE", async () => {
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 });

    await claimOrderAsPaid("ord_1", PAID_DATA);

    const where = mocks.prisma.order.updateMany.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(["CANCELLED", "REFUNDED"]),
    );
    expect(where.paymentStatus.notIn).toEqual(
      expect.arrayContaining(["PAID", "REFUNDED"]),
    );
  });

  // Una orden pagada ya no tiene reserva que vencer. Se limpia en el helper,
  // no en cada pasarela, para que ninguna pueda olvidarlo y acabe el barrido
  // cancelando pedidos ya cobrados.
  it("limpia la caducidad de la reserva al marcar pagada", async () => {
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 });

    await claimOrderAsPaid("ord_1", PAID_DATA);

    const data = mocks.prisma.order.updateMany.mock.calls[0][0].data;
    expect(data.reservationExpiresAt).toBeNull();
    expect(data.paymentStatus).toBe("PAID");
  });

  it("no revive una orden cancelada: la reporta como no pagable", async () => {
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.order.findUnique.mockResolvedValue({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    });

    const result = await claimOrderAsPaid("ord_1", PAID_DATA);

    expect(result).toEqual({
      outcome: "not-payable",
      status: "CANCELLED",
      paymentStatus: "FAILED",
    });
  });

  it("distingue la carrera benigna (ya pagada por otro flujo)", async () => {
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.order.findUnique.mockResolvedValue({
      status: "PAID",
      paymentStatus: "PAID",
      paymentId: "chg_1",
      paymentProvider: "culqi",
    });

    const result = await claimOrderAsPaid("ord_1", PAID_DATA);

    expect(result).toEqual({
      outcome: "already-paid",
      paymentId: "chg_1",
      paymentProvider: "culqi",
    });
  });

  // Sin este dato el llamador no puede distinguir "el mismo cobro llegando dos
  // veces" de "dos cobros distintos", que es la diferencia entre no hacer nada y
  // deber un reembolso.
  it("devuelve el pago que ganó, para poder detectar un segundo cobro", async () => {
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.order.findUnique.mockResolvedValue({
      status: "PAID",
      paymentStatus: "PAID",
      paymentId: "mp_111",
      paymentProvider: "mercadopago",
    });

    const result = await claimOrderAsPaid("ord_1", PAID_DATA);

    expect(result).toMatchObject({ outcome: "already-paid", paymentId: "mp_111" });
    expect(
      mocks.prisma.order.findUnique.mock.calls[0][0].select.paymentId,
    ).toBe(true);
  });
});

describe("isDuplicateProviderPayment", () => {
  it("detecta dos cobros distintos sobre el mismo pedido", () => {
    expect(isDuplicateProviderPayment("mp_111", "mp_222")).toBe(true);
  });

  it("no marca duplicado el mismo cobro reentregado", () => {
    expect(isDuplicateProviderPayment("mp_111", "mp_111")).toBe(false);
  });

  // Yape/Plin no guardan id de pasarela, y las órdenes antiguas pueden no
  // tenerlo. Inventar huérfanos sobre datos ausentes generaría avisos falsos que
  // enseñan al admin a ignorarlos.
  it("no asume duplicado cuando falta algún id", () => {
    expect(isDuplicateProviderPayment(null, "mp_222")).toBe(false);
    expect(isDuplicateProviderPayment("mp_111", null)).toBe(false);
    expect(isDuplicateProviderPayment(undefined, undefined)).toBe(false);
  });
});

describe("recordOrphanPayment", () => {
  const orphan = {
    orderId: "ord_1",
    orderNumber: "A1",
    provider: "PayPal",
    providerPaymentId: "CAP-123",
    amount: 52.6,
    currency: "USD",
    status: "CANCELLED" as const,
    paymentStatus: "FAILED" as const,
  };

  it("anota el cobro en el pedido y lo registra como error", async () => {
    mocks.tx.order.findUnique.mockResolvedValue({ adminNotes: null });

    await recordOrphanPayment(orphan);

    expect(mocks.loggerChild.error).toHaveBeenCalled();
    const data = mocks.tx.order.update.mock.calls[0][0].data;
    expect(data.adminNotes).toContain("CAP-123");
    expect(data.adminNotes).toContain("CANCELLED");
  });

  it("conserva las notas previas del admin", async () => {
    mocks.tx.order.findUnique.mockResolvedValue({ adminNotes: "nota previa" });

    await recordOrphanPayment(orphan);

    expect(mocks.tx.order.update.mock.calls[0][0].data.adminNotes).toContain(
      "nota previa",
    );
  });

  it("no duplica la nota si el webhook se reintenta", async () => {
    mocks.tx.order.findUnique.mockResolvedValue({
      adminNotes: "COBRO SIN APLICAR: PayPal ... (CAP-123)",
    });

    await recordOrphanPayment(orphan);

    expect(mocks.tx.order.update).not.toHaveBeenCalled();
  });

  it("no propaga el fallo al anotar (el webhook no debe caerse)", async () => {
    mocks.prisma.$transaction.mockRejectedValue(new Error("db down"));

    await expect(recordOrphanPayment(orphan)).resolves.toBeUndefined();
  });

  // La instrucción al admin es distinta: en `non-payable` el pedido no se cobró y
  // hay que revisarlo; en `duplicate` el pedido está bien y sobra dinero.
  it("distingue el cobro duplicado y nombra el pago que sí se aplicó", async () => {
    mocks.tx.order.findUnique.mockResolvedValue({ adminNotes: null });

    await recordOrphanPayment({
      ...orphan,
      status: "PAID",
      paymentStatus: "PAID",
      kind: "duplicate",
      appliedPaymentId: "CAP-000",
      providerPaymentId: "CAP-999",
    });

    const notes = mocks.tx.order.update.mock.calls[0][0].data.adminNotes as string;
    expect(notes).toContain("COBRO DUPLICADO");
    expect(notes).toContain("CAP-999");
    expect(notes).toContain("CAP-000");
    expect(notes).not.toContain("COBRO SIN APLICAR");
  });
});

describe("cancelOrderForFailedPayment", () => {
  const input = { orderId: "ord_1", orderNumber: "A1", reason: "Pago anulado" };

  it("cancela y libera el stock retenido en la misma transacción", async () => {
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.releaseOrderStock.mockResolvedValue({ restoredUnits: 3, restoredLines: 2 });

    const result = await cancelOrderForFailedPayment(input);

    expect(result).toEqual({ cancelled: true, restoredUnits: 3 });
    expect(mocks.releaseOrderStock).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({ orderId: "ord_1" }),
    );
  });

  it("deja la orden sin reserva viva al cerrarla", async () => {
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });

    await cancelOrderForFailedPayment(input);

    const data = mocks.tx.order.updateMany.mock.calls[0][0].data;
    expect(data.reservationExpiresAt).toBeNull();
    expect(data.status).toBe("CANCELLED");
  });

  it("no libera dos veces si la orden ya estaba cerrada", async () => {
    mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });

    const result = await cancelOrderForFailedPayment(input);

    expect(result).toEqual({ cancelled: false, restoredUnits: 0 });
    expect(mocks.releaseOrderStock).not.toHaveBeenCalled();
  });

  it("nunca cancela una orden ya pagada (eso sería un reembolso)", async () => {
    mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });

    await cancelOrderForFailedPayment(input);

    const where = mocks.tx.order.updateMany.mock.calls[0][0].where;
    expect(where.paymentStatus.notIn).toContain("PAID");
  });
});
