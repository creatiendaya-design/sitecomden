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
  revalidatePath: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const prismaMock = mocks.prisma;
const verifyCulqiChargeMock = mocks.verifyCulqiCharge;
const revalidatePathMock = mocks.revalidatePath;
const loggerChildMock = mocks.loggerChild;

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/culqi", () => ({ verifyCulqiCharge: mocks.verifyCulqiCharge }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/logger", () => ({
  logger: { child: () => mocks.loggerChild },
}));

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
});

describe("POST /api/culqi/webhook - charge.succeeded", () => {
  it("marks order as PAID and decrements product stock", async () => {
    verifyCulqiChargeMock.mockResolvedValue(true);
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_abc",
      orderNumber: "PED-0001",
      paymentStatus: "PENDING",
      items: [
        { productId: "prod_1", variantId: null, quantity: 2 },
        { productId: null, variantId: "var_1", quantity: 1 },
      ],
    });
    prismaMock.order.update.mockResolvedValue({});

    const res = await POST(makeWebhookRequest(chargeSucceededEvent()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // Verified against Culqi API before trusting the webhook.
    expect(verifyCulqiChargeMock).toHaveBeenCalledWith(
      "chr_test_123",
      19990,
      "PEN",
    );

    // Order moved to PAID.
    const updateCall = prismaMock.order.update.mock.calls[0]?.[0];
    expect(updateCall.where).toEqual({ id: "order_abc" });
    expect(updateCall.data.status).toBe("PAID");
    expect(updateCall.data.paymentStatus).toBe("PAID");
    expect(updateCall.data.paymentId).toBe("chr_test_123");
    expect(updateCall.data.paymentProvider).toBe("culqi");
    expect(updateCall.data.paidAt).toBeInstanceOf(Date);

    // Stock decremented for both the product and the variant.
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { decrement: 2 } },
    });
    expect(prismaMock.productVariant.update).toHaveBeenCalledWith({
      where: { id: "var_1" },
      data: { stock: { decrement: 1 } },
    });

    // Two inventory movements recorded (one per item kind).
    expect(prismaMock.inventoryMovement.create).toHaveBeenCalledTimes(2);

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

    const res = await POST(makeWebhookRequest(chargeSucceededEvent()));

    expect(res.status).toBe(200);
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(loggerChildMock.error).toHaveBeenCalled();
  });

  it("does NOT update an order that is already PAID (idempotency)", async () => {
    verifyCulqiChargeMock.mockResolvedValue(true);
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_abc",
      orderNumber: "PED-0001",
      paymentStatus: "PAID",
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
  it("marks the matching order as REFUNDED", async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order_ref_1",
      orderNumber: "PED-0007",
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
    const updateCall = prismaMock.order.update.mock.calls[0]?.[0];
    expect(updateCall.where).toEqual({ id: "order_ref_1" });
    expect(updateCall.data.status).toBe("REFUNDED");
    expect(updateCall.data.paymentStatus).toBe("REFUNDED");
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
