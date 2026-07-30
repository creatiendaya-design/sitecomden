/**
 * Tests de la confirmación de PayPal.
 *
 * Lo que importa aquí: que el importe capturado se compare contra el total del
 * pedido (antes sólo se validaba la divisa, así que cualquier cantidad cerraba
 * la orden como pagada) y que una orden cancelada no pueda volver a PAID.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { order: { findUnique: vi.fn() } },
  getPaypalOrder: vi.fn(),
  capturePaypalOrder: vi.fn(),
  readPaypalSettings: vi.fn(),
  claimOrderAsPaid: vi.fn(),
  recordOrphanPayment: vi.fn(),
  cancelOrderForFailedPayment: vi.fn(),
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
vi.mock("./client", () => ({
  getPaypalOrder: mocks.getPaypalOrder,
  capturePaypalOrder: mocks.capturePaypalOrder,
}));
vi.mock("./config", async () => {
  const actual = await vi.importActual<typeof import("./config")>("./config");
  return { readPaypalSettings: mocks.readPaypalSettings, convertPenToCharge: actual.convertPenToCharge };
});
// `isDuplicateProviderPayment` se deja REAL: es una comparación pura de ids y
// mockearla escondería justo lo que estos tests deben comprobar (que un segundo
// cobro distinto no se traga como "ya pagada").
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

import { captureAndConfirmPaypalOrder } from "./confirm-payment";

/** Orden de S/380 → con tipo de cambio 3.8 debe cobrar exactamente 100 USD. */
function seedOrder(overrides: Record<string, unknown> = {}) {
  mocks.prisma.order.findUnique.mockResolvedValue({
    id: "ord_1",
    orderNumber: "A1",
    total: 380,
    paymentStatus: "PENDING",
    status: "PENDING",
    customerName: "Ana",
    customerEmail: "ana@example.com",
    viewToken: "vt_1",
    items: [],
    ...overrides,
  });
}

function seedPaypal(overrides: Record<string, unknown> = {}) {
  mocks.getPaypalOrder.mockResolvedValue({
    id: "PP-1",
    status: "COMPLETED",
    customId: "ord_1",
    captureId: "CAP-1",
    captureStatus: "COMPLETED",
    amountValue: 100,
    currencyCode: "USD",
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readPaypalSettings.mockResolvedValue({ currency: "USD", exchangeRate: 3.8 });
  mocks.claimOrderAsPaid.mockResolvedValue({ outcome: "claimed" });
  mocks.cancelOrderForFailedPayment.mockResolvedValue({ cancelled: true, restoredUnits: 2 });
});

describe("importe capturado", () => {
  it("confirma cuando el importe coincide con el total convertido", async () => {
    seedOrder();
    seedPaypal();

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "paid" });
    expect(mocks.claimOrderAsPaid).toHaveBeenCalled();
  });

  it("rechaza un pago por menos del total (el agujero F-04)", async () => {
    seedOrder();
    seedPaypal({ amountValue: 1 });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result.ok).toBe(false);
    expect(mocks.claimOrderAsPaid).not.toHaveBeenCalled();
  });

  it("rechaza si PayPal no reporta importe", async () => {
    seedOrder();
    seedPaypal({ amountValue: null });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result.ok).toBe(false);
    expect(mocks.claimOrderAsPaid).not.toHaveBeenCalled();
  });

  it("acepta un pago de más en vez de dejar al cliente cobrado y sin pedido", async () => {
    seedOrder();
    seedPaypal({ amountValue: 100.5 });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toMatchObject({ ok: true, status: "paid" });
  });

  it("no confirma sin tipo de cambio configurado: no habría con qué validar", async () => {
    seedOrder();
    seedPaypal();
    mocks.readPaypalSettings.mockResolvedValue({ currency: "USD", exchangeRate: 0 });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result.ok).toBe(false);
    expect(mocks.claimOrderAsPaid).not.toHaveBeenCalled();
  });

  it("sigue rechazando divisa distinta a la configurada", async () => {
    seedOrder();
    seedPaypal({ currencyCode: "EUR" });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result.ok).toBe(false);
  });
});

describe("orden que ya no admite pago", () => {
  it("no la marca pagada y registra el cobro huérfano", async () => {
    seedOrder({ status: "CANCELLED" });
    seedPaypal();
    mocks.claimOrderAsPaid.mockResolvedValue({
      outcome: "not-payable",
      status: "CANCELLED",
      paymentStatus: "FAILED",
    });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "orphaned" });
    expect(mocks.recordOrphanPayment).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "ord_1", providerPaymentId: "CAP-1" }),
    );
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
  });

  it("no repite los efectos si otro flujo ya la pagó", async () => {
    seedOrder();
    seedPaypal();
    mocks.claimOrderAsPaid.mockResolvedValue({
      outcome: "already-paid",
      paymentId: "CAP-1",
      paymentProvider: "paypal",
    });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "ignored" });
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
    expect(mocks.recordOrphanPayment).not.toHaveBeenCalled();
  });

  // ADV-02: la página puente crea una orden de PayPal nueva en cada visita, así
  // que el cliente puede pagar dos. Antes la segunda respondía `ignored` y el
  // importe quedaba capturado sin rastro en el sistema.
  it("registra como duplicado un segundo cobro ganado en la carrera del claim", async () => {
    seedOrder();
    seedPaypal();
    mocks.claimOrderAsPaid.mockResolvedValue({
      outcome: "already-paid",
      paymentId: "CAP-OTHER",
      paymentProvider: "paypal",
    });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "orphaned" });
    expect(mocks.recordOrphanPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "duplicate",
        providerPaymentId: "CAP-1",
        appliedPaymentId: "CAP-OTHER",
      }),
    );
    expect(mocks.onOrderPaid).not.toHaveBeenCalled();
  });
});

describe("segundo cobro sobre un pedido ya pagado", () => {
  it("lo registra como duplicado en vez de descartarlo en silencio", async () => {
    seedOrder({ paymentStatus: "PAID", status: "PAID", paymentId: "CAP-FIRST" });
    seedPaypal({ captureId: "CAP-SECOND" });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "orphaned" });
    expect(mocks.recordOrphanPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "duplicate",
        providerPaymentId: "CAP-SECOND",
        appliedPaymentId: "CAP-FIRST",
        provider: "PayPal",
      }),
    );
    // El pedido ya estaba correcto: no se reclama de nuevo.
    expect(mocks.claimOrderAsPaid).not.toHaveBeenCalled();
  });

  it("no marca duplicado la reentrega del mismo cobro", async () => {
    seedOrder({ paymentStatus: "PAID", status: "PAID", paymentId: "CAP-1" });
    seedPaypal({ captureId: "CAP-1" });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "ignored" });
    expect(mocks.recordOrphanPayment).not.toHaveBeenCalled();
  });

  // Una orden de PayPal creada y abandonada no cobró nada: anotarla llenaría los
  // pedidos de avisos falsos y enseñaría al admin a ignorarlos.
  it("no marca duplicada una orden de PayPal sin captura", async () => {
    seedOrder({ paymentStatus: "PAID", status: "PAID", paymentId: "CAP-FIRST" });
    seedPaypal({ id: "PP-2", status: "CREATED", captureId: null, captureStatus: null });

    const result = await captureAndConfirmPaypalOrder("PP-2");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "ignored" });
    expect(mocks.recordOrphanPayment).not.toHaveBeenCalled();
  });
});

describe("orden anulada en PayPal", () => {
  it("cancela el pedido y libera el stock retenido", async () => {
    seedOrder();
    seedPaypal({ status: "VOIDED", captureStatus: null, captureId: null });

    const result = await captureAndConfirmPaypalOrder("PP-1");

    expect(result).toEqual({ ok: true, orderId: "ord_1", status: "failed" });
    expect(mocks.cancelOrderForFailedPayment).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "ord_1", orderNumber: "A1" }),
    );
  });
});
