/**
 * Unit tests for the createOrder input schema.
 *
 * Testing the *schema* (not the handler) is the most useful slice we can
 * do without standing up a real DB: it pins the contract that the client
 * has to satisfy before any business logic runs. A regression here
 * (loosening a required field, accepting a bad payment method) would
 * silently let malformed orders through.
 *
 * The handler itself (`createOrder`) needs Prisma + the promotion
 * resolvers; tests for it belong in a future integration-test pass
 * with a test database, not here.
 */

import { describe, it, expect } from "vitest";
import { createOrderSchema } from "./orders";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    customerName: "Juan Pérez",
    customerEmail: "juan@example.com",
    customerPhone: "987654321",
    address: "Av. Siempre Viva 742",
    district: "Miraflores",
    city: "Lima",
    department: "Lima",
    paymentMethod: "YAPE",
    items: [
      {
        id: "prod_1",
        productId: "prod_1",
        name: "Camiseta",
        price: 50,
        quantity: 2,
      },
    ],
    ...overrides,
  };
}

describe("createOrderSchema - happy path", () => {
  it("accepts a minimal valid YAPE payload", () => {
    const result = createOrderSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("accepts all valid payment methods", () => {
    for (const method of ["YAPE", "PLIN", "CARD", "PAYPAL", "MERCADOPAGO"]) {
      const result = createOrderSchema.safeParse(
        validPayload({ paymentMethod: method }),
      );
      expect(result.success, `payment method ${method} should be valid`).toBe(
        true,
      );
    }
  });

  it("accepts optional FACTURA fields", () => {
    const result = createOrderSchema.safeParse(
      validPayload({
        documentType: "FACTURA",
        buyerRuc: "20123456789",
        buyerRazonSocial: "Empresa SAC",
        buyerFiscalAddress: "Av. Fiscal 100",
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("createOrderSchema - rejects malformed input", () => {
  it("rejects an empty cart", () => {
    const result = createOrderSchema.safeParse(validPayload({ items: [] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /vacío/i.test(i.message))).toBe(
        true,
      );
    }
  });

  it("rejects invalid email", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ customerEmail: "not-an-email" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects too-short customer name", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ customerName: "Ab" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects too-short phone", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ customerPhone: "12345" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects too-short address", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ address: "ab" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects unknown payment methods", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ paymentMethod: "BITCOIN" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects negative item prices", () => {
    const result = createOrderSchema.safeParse(
      validPayload({
        items: [
          {
            id: "x",
            productId: "x",
            name: "x",
            price: -5,
            quantity: 1,
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity items", () => {
    const result = createOrderSchema.safeParse(
      validPayload({
        items: [
          { id: "x", productId: "x", name: "x", price: 10, quantity: 0 },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects absurdly high quantities (max 9999)", () => {
    const result = createOrderSchema.safeParse(
      validPayload({
        items: [
          { id: "x", productId: "x", name: "x", price: 10, quantity: 100000 },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an unknown document type", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ documentType: "TICKET" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a non-11-digit RUC", () => {
    const result = createOrderSchema.safeParse(
      validPayload({
        documentType: "FACTURA",
        buyerRuc: "123",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects extremely long customer notes (>1000)", () => {
    const result = createOrderSchema.safeParse(
      validPayload({ customerNotes: "x".repeat(1001) }),
    );
    expect(result.success).toBe(false);
  });
});

describe("createOrderSchema - subscription opt-in", () => {
  it("accepts a valid subscription opt-in", () => {
    const result = createOrderSchema.safeParse(
      validPayload({
        items: [
          {
            id: "x",
            productId: "x",
            name: "x",
            price: 10,
            quantity: 1,
            subscriptionOptIn: {
              promotionId: "promo_1",
              email: "sub@example.com",
            },
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects subscription opt-in with invalid email", () => {
    const result = createOrderSchema.safeParse(
      validPayload({
        items: [
          {
            id: "x",
            productId: "x",
            name: "x",
            price: 10,
            quantity: 1,
            subscriptionOptIn: {
              promotionId: "promo_1",
              email: "not-an-email",
            },
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });
});
