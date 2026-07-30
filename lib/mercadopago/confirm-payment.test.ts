/**
 * Tests de la confirmación de pago de MercadoPago.
 *
 * El foco es ADV-02: `buildPreferenceInput` crea una preferencia NUEVA en cada
 * visita a la página puente, así que un cliente puede tener dos sesiones vivas
 * para el mismo pedido y pagar las dos. La primera confirmación deja la orden
 * PAGADA; la segunda caía en la guarda de idempotencia y respondía `ignored`, de
 * modo que ese segundo cobro —dinero real en la cuenta de MercadoPago— no
 * quedaba registrado en ninguna parte y nadie lo devolvía.
 *
 * El segundo foco es el efecto colateral de arreglarlo: si al admin se le pide
 * reembolsar el cobro duplicado, MercadoPago manda un webhook `refunded` con el
 * id de ESE pago. Ese evento NO debe reembolsar el pedido entero.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { order: { findUnique: vi.fn(), update: vi.fn() } },
  getMercadoPagoPayment: vi.fn(),
  claimOrderAsPaid: vi.fn(),
  recordOrphanPayment: vi.fn(),
  cancelOrderForFailedPayment: vi.fn(),
  applyRefund: vi.fn(),
  onOrderPaid: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => mocks.loggerChild } }));
vi.mock("@/lib/site-settings", () => ({ getSiteSettings: async () => ({}) }));
vi.mock("@/lib/loyalty/award-purchase", () => ({ onOrderPaid: mocks.onOrderPaid }));
vi.mock("@/actions/sunat", () => ({ autoEmitOnPayment: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendPaymentApprovedEmail: vi.fn() }));
vi.mock("@/lib/orders/apply-refund", () => ({ applyRefund: mocks.applyRefund }));
vi.mock("./client", () => ({ getMercadoPagoPayment: mocks.getMercadoPagoPayment }));
// `isDuplicateProviderPayment` se deja REAL: es la comparación de ids que estos
// tests deben ejercitar de verdad.
vi.mock("@/lib/payments/order-payment-state", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/payments/order-payment-state")
  >("@/lib/payments/order-payment-state");
  return {
    isDuplicateProviderPayment: actual.isDuplicateProviderPayment,
    claimOrderAsPaid: mocks.claimOrderAsPaid,
    recordOrphanPayment: mocks.recordOrphanPayment,
    cancelOrderForFailedPayment: mocks.cancelOrderForFailedPayment,
  };
});

import { confirmMercadoPagoPayment } from "./confirm-payment";

function seedOrder(overrides: Record<string, unknown> = {}) {
  mocks.prisma.order.findUnique.mockResolvedValue({
    id: "ord_1",
    orderNumber: "A1",
    total: 199.9,
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentId: null,
    customerName: "Ana",
    customerEmail: "ana@example.com",
    viewToken: "vt_1",
    items: [],
    ...overrides,
  });
}

function seedPayment(overrides: Record<string, unknown> = {}) {
  mocks.getMercadoPagoPayment.mockResolvedValue({
    id: "mp_222",
    status: "approved",
    statusDetail: "accredited",
    externalReference: "ord_1",
    transactionAmount: 199.9,
    currencyId: "PEN",
    paymentMethodId: "visa",
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.claimOrderAsPaid.mockResolvedValue({ outcome: "claimed" });
  mocks.applyRefund.mockResolvedValue({ ok: true });
});

describe("camino normal", () => {
  it("confirma un pago aprobado por el importe exacto", async () => {
    seedOrder();
    seedPayment();

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "paid" });
    expect(mocks.onOrderPaid).toHaveBeenCalledWith("ord_1");
  });

  it("rechaza un importe que no cuadra con el total del pedido", async () => {
    seedOrder();
    seedPayment({ transactionAmount: 1 });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toMatchObject({ ok: false, retryable: false });
    expect(mocks.claimOrderAsPaid).not.toHaveBeenCalled();
  });
});

describe("ADV-02: segundo cobro sobre un pedido ya pagado", () => {
  it("lo registra como duplicado en vez de responder ignored", async () => {
    seedOrder({ status: "PAID", paymentStatus: "PAID", paymentId: "mp_111" });
    seedPayment({ id: "mp_222" });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "orphaned" });
    expect(mocks.recordOrphanPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "duplicate",
        provider: "MercadoPago",
        providerPaymentId: "mp_222",
        appliedPaymentId: "mp_111",
      }),
    );
    // El pedido ya estaba correcto: no se vuelve a reclamar ni a aplicar efectos.
    expect(mocks.claimOrderAsPaid).not.toHaveBeenCalled();
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
  });

  it("no marca duplicada la reentrega del mismo pago", async () => {
    seedOrder({ status: "PAID", paymentStatus: "PAID", paymentId: "mp_222" });
    seedPayment({ id: "mp_222" });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "ignored" });
    expect(mocks.recordOrphanPayment).not.toHaveBeenCalled();
  });

  it("no reclama dinero de un duplicado que fue rechazado (nunca cobró)", async () => {
    seedOrder({ status: "PAID", paymentStatus: "PAID", paymentId: "mp_111" });
    seedPayment({ id: "mp_222", status: "rejected" });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "ignored" });
    expect(mocks.recordOrphanPayment).not.toHaveBeenCalled();
    // Y no debe pisar el estado de pago del pedido, que está PAGADO.
    expect(mocks.prisma.order.update).not.toHaveBeenCalled();
  });

  // El efecto colateral de pedirle al admin que reembolse el duplicado: el
  // webhook `refunded` de ESE pago no puede reembolsar el pedido entero.
  it("no reembolsa el pedido cuando el reembolsado es el cobro duplicado", async () => {
    seedOrder({ status: "PAID", paymentStatus: "PAID", paymentId: "mp_111" });
    seedPayment({ id: "mp_222", status: "refunded" });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "ignored" });
    expect(mocks.applyRefund).not.toHaveBeenCalled();
  });

  it("sí reembolsa el pedido cuando el reembolsado es el cobro aplicado", async () => {
    seedOrder({ status: "PAID", paymentStatus: "PAID", paymentId: "mp_111" });
    seedPayment({ id: "mp_111", status: "refunded" });

    const result = await confirmMercadoPagoPayment("mp_111");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "refunded" });
    expect(mocks.applyRefund).toHaveBeenCalledWith("ord_1", { source: "webhook" });
  });

  it("registra el duplicado ganado en la carrera del claim", async () => {
    seedOrder();
    seedPayment({ id: "mp_222" });
    mocks.claimOrderAsPaid.mockResolvedValue({
      outcome: "already-paid",
      paymentId: "mp_111",
      paymentProvider: "mercadopago",
    });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "orphaned" });
    expect(mocks.recordOrphanPayment).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "duplicate", appliedPaymentId: "mp_111" }),
    );
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
  });

  it("no registra nada si la carrera la ganó el MISMO pago", async () => {
    seedOrder();
    seedPayment({ id: "mp_222" });
    mocks.claimOrderAsPaid.mockResolvedValue({
      outcome: "already-paid",
      paymentId: "mp_222",
      paymentProvider: "mercadopago",
    });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "ignored" });
    expect(mocks.recordOrphanPayment).not.toHaveBeenCalled();
  });
});

describe("orden no pagable", () => {
  it("no revive un pedido cancelado y deja constancia del cobro", async () => {
    seedOrder({ status: "CANCELLED", paymentStatus: "FAILED" });
    seedPayment();
    mocks.claimOrderAsPaid.mockResolvedValue({
      outcome: "not-payable",
      status: "CANCELLED",
      paymentStatus: "FAILED",
    });

    const result = await confirmMercadoPagoPayment("mp_222");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "orphaned" });
    expect(mocks.recordOrphanPayment).toHaveBeenCalledWith(
      expect.objectContaining({ providerPaymentId: "mp_222" }),
    );
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
  });
});
