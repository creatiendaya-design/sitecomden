/**
 * Integration tests for the Culqi webhook handler.
 *
 * We mock `prisma`, `verifyCulqiCharge`, `revalidatePath`, and the logger
 * so the test exercises the full branching logic without a database or a
 * real network call. The matcher is the same surface a webhook delivery
 * would hit: build a Request, invoke POST(req), assert on the response
 * AND on the mocked Prisma calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above all imports/declarations. We use
// vi.hoisted() so our shared mock objects are constructed in the same
// hoisted phase and can be referenced from both the factory and the
// individual tests below.
const mocks = vi.hoisted(() => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    productVariant: { update: vi.fn() },
    product: { update: vi.fn() },
    inventoryMovement: { create: vi.fn() },
  },
  verifyCulqiCharge: vi.fn(),
  getCulqiCharge: vi.fn(),
  revalidatePath: vi.fn(),
  applyRefund: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const prismaMock = mocks.prisma;
const verifyCulqiChargeMock = mocks.verifyCulqiCharge;
const getCulqiChargeMock = mocks.getCulqiCharge;
const revalidatePathMock = mocks.revalidatePath;
const applyRefundMock = mocks.applyRefund;
const loggerChildMock = mocks.loggerChild;

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/culqi", () => ({
  verifyCulqiCharge: mocks.verifyCulqiCharge,
  getCulqiCharge: mocks.getCulqiCharge,
  solesToCents: (soles: number) => Math.round(soles * 100),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/logger", () => ({
  logger: { child: () => mocks.loggerChild },
}));
// Loyalty accounting is a separate concern with its own tests; stub it here
// so this file only exercises the webhook's own branching logic.
vi.mock("@/lib/loyalty/award-purchase", () => ({ onOrderPaid: vi.fn() }));
// Refund side effects (stock restore, loyalty revert, email) have their own
// tests; here we only assert the webhook delegates to applyRefund.
vi.mock("@/lib/orders/apply-refund", () => ({ applyRefund: mocks.applyRefund }));

// Import AFTER mocks are registered.
import { POST, GET } from "./route";

function makeWebhookRequest(body: unknown) {
  return new Request("http://localhost/api/culqi/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as Parameters<typeof POST>[0];
}

function chargeSucceededEvent(overrides: Record<string, unknown> = {}) {
  return {
    object: "event",
    id: "evt_test_1",
    type: "charge.succeeded",
    data: {
      object: "charge",
      id: "chr_test_123",
      amount: 19990,
      currency_code: "PEN",
      email: "buyer@example.com",
      metadata: { order_id: "order_abc" },
      reference_code: "REF-1",
      authorization_code: "AUTH-1",
      source: {
        card_number: "411111******1111",
        last_four: "1111",
        iin: { card_brand: "Visa", card_type: "credit" },
      },
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Por defecto ningún otro pedido reclama el mismo cargo.
  prismaMock.order.findFirst.mockResolvedValue(null);
});

describe("POST /api/culqi/webhook - charge.succeeded", () => {
  it("marks order as PAID without touching stock (already decremented atomically in createOrder)", async () => {
    verifyCulqiChargeMock.mockResolvedValue(true);
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_abc",
      orderNumber: "PED-0001",
      paymentStatus: "PENDING",
      total: 199.9,
      items: [
        { productId: "prod_1", variantId: null, quantity: 2 },
        { productId: null, variantId: "var_1", quantity: 1 },
      ],
    });
    prismaMock.order.update.mockResolvedValue({});

    const res = await POST(makeWebhookRequest(chargeSucceededEvent()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // Verificado contra la API de Culqi usando el importe de la ORDEN (no el
    // que trae el evento) y ligado al orderId concreto.
    expect(verifyCulqiChargeMock).toHaveBeenCalledWith(
      "chr_test_123",
      19990,
      "PEN",
      "order_abc",
    );

    // Order moved to PAID.
    const updateCall = prismaMock.order.update.mock.calls[0]?.[0];
    expect(updateCall.where).toEqual({ id: "order_abc" });
    expect(updateCall.data.status).toBe("PAID");
    expect(updateCall.data.paymentStatus).toBe("PAID");
    expect(updateCall.data.paymentId).toBe("chr_test_123");
    expect(updateCall.data.paymentProvider).toBe("culqi");
    expect(updateCall.data.paidAt).toBeInstanceOf(Date);

    // Stock is NOT touched here — createOrder already decremented it
    // atomically when the order was placed. Decrementing again here would
    // double-count (see the NOTA comment in handleChargeSucceeded).
    expect(prismaMock.product.update).not.toHaveBeenCalled();
    expect(prismaMock.productVariant.update).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();

    // Cache invalidated.
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/ordenes");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/orden/order_abc/confirmacion",
    );
  });

  it("is a no-op when metadata.order_id is missing", async () => {
    const event = chargeSucceededEvent({ metadata: {} });

    const res = await POST(makeWebhookRequest(event));

    expect(res.status).toBe(200);
    expect(verifyCulqiChargeMock).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it("rejects the webhook when Culqi verification fails", async () => {
    verifyCulqiChargeMock.mockResolvedValue(false);
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_abc",
      orderNumber: "PED-0001",
      paymentStatus: "PENDING",
      total: 199.9,
      items: [],
    });

    const res = await POST(makeWebhookRequest(chargeSucceededEvent()));

    expect(res.status).toBe(200);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(loggerChildMock.error).toHaveBeenCalled();
  });

  it("does NOT mark the order PAID when the charge is for a smaller amount than the order total", async () => {
    // El escenario que motivó el fix: el atacante POSTea un evento con un
    // cargo real suyo de S/1 y el order_id de una orden de S/199.90. El cargo
    // existe en Culqi, así que verificar "el cargo contra lo que el evento
    // declara" pasaría. Verificarlo contra Order.total no.
    verifyCulqiChargeMock.mockImplementation(
      async (_chargeId: string, expectedAmount: number) => expectedAmount === 100,
    );
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_abc",
      orderNumber: "PED-0001",
      paymentStatus: "PENDING",
      total: 199.9,
      items: [],
    });

    const res = await POST(
      makeWebhookRequest(chargeSucceededEvent({ amount: 100 })),
    );

    expect(res.status).toBe(200);
    expect(verifyCulqiChargeMock).toHaveBeenCalledWith(
      "chr_test_123",
      19990, // el total real de la orden, NO los 100 del evento
      "PEN",
      "order_abc",
    );
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(loggerChildMock.error).toHaveBeenCalled();
  });

  it("refuses to apply one charge to a second order", async () => {
    verifyCulqiChargeMock.mockResolvedValue(true);
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_abc",
      orderNumber: "PED-0001",
      paymentStatus: "PENDING",
      total: 199.9,
      items: [],
    });
    prismaMock.order.findFirst.mockResolvedValue({ id: "order_previous" });

    const res = await POST(makeWebhookRequest(chargeSucceededEvent()));

    expect(res.status).toBe(200);
    expect(verifyCulqiChargeMock).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(loggerChildMock.error).toHaveBeenCalled();
  });

  it("does NOT update an order that is already PAID (idempotency)", async () => {
    verifyCulqiChargeMock.mockResolvedValue(true);
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_abc",
      orderNumber: "PED-0001",
      paymentStatus: "PAID",
      total: 199.9,
      items: [],
    });

    const res = await POST(makeWebhookRequest(chargeSucceededEvent()));

    expect(res.status).toBe(200);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

  it("is a no-op when the referenced order does not exist", async () => {
    verifyCulqiChargeMock.mockResolvedValue(true);
    prismaMock.order.findUnique.mockResolvedValue(null);

    const res = await POST(makeWebhookRequest(chargeSucceededEvent()));

    expect(res.status).toBe(200);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/culqi/webhook - charge.failed", () => {
  it("marks order as FAILED with failure reason in paymentDetails", async () => {
    // handleChargeFailed verifies against Culqi's API before trusting the
    // webhook — a truly-failed charge reports an outcome other than
    // "venta_exitosa".
    getCulqiChargeMock.mockResolvedValue({
      object: "charge",
      outcome: { type: "fraudulent" },
    });
    prismaMock.order.findUnique.mockResolvedValue({
      paymentStatus: "PENDING",
    });

    const event = {
      object: "event",
      id: "evt_test_2",
      type: "charge.failed",
      data: {
        object: "charge",
        id: "chr_failed_1",
        amount: 5000,
        currency_code: "PEN",
        email: "buyer@example.com",
        metadata: { order_id: "order_xyz" },
        outcome: {
          type: "fraudulent",
          code: "CARD_DECLINED",
          merchant_message: "Bank declined",
          user_message: "Tarjeta rechazada",
        },
      },
    };

    const res = await POST(makeWebhookRequest(event));

    expect(res.status).toBe(200);
    const updateCall = prismaMock.order.update.mock.calls[0]?.[0];
    expect(updateCall.where).toEqual({ id: "order_xyz" });
    expect(updateCall.data.paymentStatus).toBe("FAILED");
    expect(updateCall.data.paymentDetails.failureReason).toBe("Tarjeta rechazada");
    expect(updateCall.data.paymentDetails.failureCode).toBe("CARD_DECLINED");

    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/ordenes");
  });

  it("warns and skips when metadata.order_id is missing", async () => {
    const event = {
      object: "event",
      id: "evt_test_3",
      type: "charge.failed",
      data: { id: "chr_x", amount: 1, currency_code: "PEN", email: "x", metadata: {} },
    };

    const res = await POST(makeWebhookRequest(event));

    expect(res.status).toBe(200);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(loggerChildMock.warn).toHaveBeenCalled();
  });
});

describe("POST /api/culqi/webhook - refund.succeeded", () => {
  it("delegates every refund effect to applyRefund (stock, loyalty, email)", async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order_ref_1",
      orderNumber: "PED-0007",
    });
    applyRefundMock.mockResolvedValue({ ok: true });
    // handleRefundSucceeded verifies against Culqi's API before trusting the
    // webhook — a confirmed refund reports amount_refunded > 0.
    getCulqiChargeMock.mockResolvedValue({
      object: "charge",
      amount_refunded: 5000,
    });

    const event = {
      object: "event",
      id: "evt_test_4",
      type: "refund.succeeded",
      data: {
        object: "refund",
        id: "chr_refunded_1",
        amount: 0,
        currency_code: "PEN",
        email: "x",
      },
    };

    const res = await POST(makeWebhookRequest(event));

    expect(res.status).toBe(200);
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: { paymentId: "chr_refunded_1" },
    });

    // El webhook ya no toca los estados a mano: eso dejaba el stock sin
    // devolver y los puntos de lealtad regalados.
    expect(applyRefundMock).toHaveBeenCalledWith("order_ref_1", {
      source: "webhook",
    });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/ordenes");
  });

  it("logs an error and skips when no order matches the chargeId", async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    const event = {
      object: "event",
      id: "evt_test_5",
      type: "refund.succeeded",
      data: { object: "refund", id: "chr_unknown", amount: 0, currency_code: "PEN", email: "x" },
    };

    const res = await POST(makeWebhookRequest(event));

    expect(res.status).toBe(200);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(loggerChildMock.error).toHaveBeenCalled();
  });
});

describe("POST /api/culqi/webhook - misc", () => {
  it("returns 200 for unknown event types without touching the DB", async () => {
    const event = { type: "unknown.event", data: {} };

    const res = await POST(makeWebhookRequest(event));

    expect(res.status).toBe(200);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it("returns 500 on malformed JSON body", async () => {
    const req = new Request("http://localhost/api/culqi/webhook", {
      method: "POST",
      body: "{not-json",
      headers: { "content-type": "application/json" },
    }) as Parameters<typeof POST>[0];

    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(loggerChildMock.error).toHaveBeenCalled();
  });
});

describe("GET /api/culqi/webhook", () => {
  it("returns 405", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
