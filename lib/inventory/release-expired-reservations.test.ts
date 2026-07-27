/**
 * Tests del barrido de reservas vencidas.
 *
 * Lo que importa: que sólo alcance órdenes que de verdad retienen stock sin
 * pagar, que un fallo aislado no se lleve por delante el lote, y que una
 * carrera con otro flujo (el cliente pagando justo entonces) no se contabilice
 * como cancelación.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { order: { findMany: vi.fn() } },
  cancelOrderForFailedPayment: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => mocks.loggerChild } }));
vi.mock("@/lib/payments/order-payment-state", () => ({
  cancelOrderForFailedPayment: mocks.cancelOrderForFailedPayment,
}));

import { releaseExpiredReservations } from "./release-expired-reservations";

function order(id: string) {
  return { id, orderNumber: `A-${id}`, paymentMethod: "MERCADOPAGO" };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.order.findMany.mockResolvedValue([]);
  mocks.cancelOrderForFailedPayment.mockResolvedValue({
    cancelled: true,
    restoredUnits: 2,
  });
});

describe("selección de órdenes", () => {
  it("sólo mira órdenes con caducidad ya pasada", async () => {
    const now = new Date("2026-07-27T12:00:00.000Z");

    await releaseExpiredReservations({ now });

    const where = mocks.prisma.order.findMany.mock.calls[0][0].where;
    expect(where.reservationExpiresAt).toEqual({ not: null, lte: now });
  });

  it("no toca órdenes ya cerradas ni en camino al cliente", async () => {
    await releaseExpiredReservations();

    const where = mocks.prisma.order.findMany.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(["CANCELLED", "REFUNDED", "SHIPPED", "DELIVERED"]),
    );
  });

  // La exclusión crítica: VERIFYING es un cobro en vuelo o pendiente de
  // conciliación. Barrerlo convertiría el caso en un cobro sobre orden cancelada.
  it("sólo barre pagos pendientes o rechazados, nunca uno en vuelo", async () => {
    await releaseExpiredReservations();

    const where = mocks.prisma.order.findMany.mock.calls[0][0].where;
    expect(where.paymentStatus.in).toEqual(["PENDING", "FAILED"]);
    expect(where.paymentStatus.in).not.toContain("VERIFYING");
    expect(where.paymentStatus.in).not.toContain("PAID");
  });

  it("acota el lote y atiende primero las más vencidas", async () => {
    await releaseExpiredReservations({ batchLimit: 25 });

    const query = mocks.prisma.order.findMany.mock.calls[0][0];
    expect(query.take).toBe(25);
    expect(query.orderBy).toEqual({ reservationExpiresAt: "asc" });
  });
});

describe("liberación", () => {
  it("cancela cada orden vencida y suma el stock devuelto", async () => {
    mocks.prisma.order.findMany.mockResolvedValue([order("1"), order("2")]);

    const result = await releaseExpiredReservations();

    expect(result).toEqual({
      scanned: 2,
      cancelled: 2,
      restoredUnits: 4,
      skipped: 0,
      failed: 0,
    });
    expect(mocks.cancelOrderForFailedPayment).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "1", reason: "Reserva vencida sin pago" }),
    );
  });

  it("no cuenta como cancelada la orden que otro flujo ganó en la carrera", async () => {
    mocks.prisma.order.findMany.mockResolvedValue([order("1")]);
    // El cliente pagó entre la consulta y la transacción: el claim no prospera.
    mocks.cancelOrderForFailedPayment.mockResolvedValue({
      cancelled: false,
      restoredUnits: 0,
    });

    const result = await releaseExpiredReservations();

    expect(result).toMatchObject({ scanned: 1, cancelled: 0, skipped: 1 });
  });

  it("una orden problemática no aborta el resto del lote", async () => {
    mocks.prisma.order.findMany.mockResolvedValue([
      order("1"),
      order("2"),
      order("3"),
    ]);
    mocks.cancelOrderForFailedPayment
      .mockResolvedValueOnce({ cancelled: true, restoredUnits: 1 })
      .mockRejectedValueOnce(new Error("fila bloqueada"))
      .mockResolvedValueOnce({ cancelled: true, restoredUnits: 3 });

    const result = await releaseExpiredReservations();

    expect(result).toMatchObject({
      scanned: 3,
      cancelled: 2,
      restoredUnits: 4,
      failed: 1,
    });
    // La que falló sigue vencida: la próxima pasada volverá a intentarlo.
    expect(mocks.loggerChild.error).toHaveBeenCalled();
  });

  it("una pasada sin nada vencido no escribe nada", async () => {
    const result = await releaseExpiredReservations();

    expect(result).toEqual({
      scanned: 0,
      cancelled: 0,
      restoredUnits: 0,
      skipped: 0,
      failed: 0,
    });
    expect(mocks.cancelOrderForFailedPayment).not.toHaveBeenCalled();
  });
});
