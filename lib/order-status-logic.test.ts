import { describe, it, expect } from "vitest";
import {
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
  FULFILLMENT_STATUS_TRANSITIONS,
  canCancelOrder,
  canRefundPayment,
  canMarkPaymentAsFailed,
  isTerminalOrderStatus,
  isTerminalPaymentStatus,
  isTerminalFulfillmentStatus,
  validateStatusCoherence,
} from "./order-status-logic";

describe("ORDER_STATUS_TRANSITIONS", () => {
  it("only allows forward progression", () => {
    expect(ORDER_STATUS_TRANSITIONS.PENDING).toEqual(["PAID"]);
    expect(ORDER_STATUS_TRANSITIONS.PAID).toEqual(["PROCESSING"]);
    expect(ORDER_STATUS_TRANSITIONS.PROCESSING).toEqual(["SHIPPED"]);
    expect(ORDER_STATUS_TRANSITIONS.SHIPPED).toEqual(["DELIVERED"]);
  });

  it("terminal states have no outgoing transitions", () => {
    expect(ORDER_STATUS_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.REFUNDED).toEqual([]);
  });
});

describe("PAYMENT_STATUS_TRANSITIONS", () => {
  it("allows manual verification and direct mark-as-paid from PENDING", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.PENDING).toContain("VERIFYING");
    expect(PAYMENT_STATUS_TRANSITIONS.PENDING).toContain("PAID");
  });

  it("VERIFYING can resolve to PAID or FAILED", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.VERIFYING).toEqual(["PAID", "FAILED"]);
  });

  it("PAID has no manual transitions (only via refund button)", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.PAID).toEqual([]);
  });

  it("FAILED can retry by going back to PENDING", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.FAILED).toEqual(["PENDING"]);
  });

  it("REFUNDED is terminal", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.REFUNDED).toEqual([]);
  });
});

describe("FULFILLMENT_STATUS_TRANSITIONS", () => {
  it("UNFULFILLED can become PARTIAL or FULFILLED directly", () => {
    expect(FULFILLMENT_STATUS_TRANSITIONS.UNFULFILLED).toEqual([
      "PARTIAL",
      "FULFILLED",
    ]);
  });

  it("PARTIAL can only finish into FULFILLED", () => {
    expect(FULFILLMENT_STATUS_TRANSITIONS.PARTIAL).toEqual(["FULFILLED"]);
  });

  it("FULFILLED is terminal", () => {
    expect(FULFILLMENT_STATUS_TRANSITIONS.FULFILLED).toEqual([]);
  });
});

describe("canCancelOrder", () => {
  it("allows cancellation before shipping", () => {
    expect(canCancelOrder("PENDING")).toBe(true);
    expect(canCancelOrder("PAID")).toBe(true);
    expect(canCancelOrder("PROCESSING")).toBe(true);
  });

  it("blocks cancellation after shipping", () => {
    expect(canCancelOrder("SHIPPED")).toBe(false);
    expect(canCancelOrder("DELIVERED")).toBe(false);
    expect(canCancelOrder("CANCELLED")).toBe(false);
    expect(canCancelOrder("REFUNDED")).toBe(false);
  });
});

describe("canRefundPayment", () => {
  it("only allows refund of PAID payments", () => {
    expect(canRefundPayment("PAID")).toBe(true);
    expect(canRefundPayment("PENDING")).toBe(false);
    expect(canRefundPayment("VERIFYING")).toBe(false);
    expect(canRefundPayment("FAILED")).toBe(false);
    expect(canRefundPayment("REFUNDED")).toBe(false);
  });
});

describe("canMarkPaymentAsFailed", () => {
  it("only allows from PENDING or VERIFYING", () => {
    expect(canMarkPaymentAsFailed("PENDING")).toBe(true);
    expect(canMarkPaymentAsFailed("VERIFYING")).toBe(true);
    expect(canMarkPaymentAsFailed("PAID")).toBe(false);
    expect(canMarkPaymentAsFailed("FAILED")).toBe(false);
    expect(canMarkPaymentAsFailed("REFUNDED")).toBe(false);
  });
});

describe("terminal status helpers", () => {
  it("isTerminalOrderStatus identifies terminal order states", () => {
    expect(isTerminalOrderStatus("DELIVERED")).toBe(true);
    expect(isTerminalOrderStatus("CANCELLED")).toBe(true);
    expect(isTerminalOrderStatus("REFUNDED")).toBe(true);
    expect(isTerminalOrderStatus("PENDING")).toBe(false);
    expect(isTerminalOrderStatus("SHIPPED")).toBe(false);
  });

  it("isTerminalPaymentStatus identifies REFUNDED as terminal", () => {
    expect(isTerminalPaymentStatus("REFUNDED")).toBe(true);
    expect(isTerminalPaymentStatus("PAID")).toBe(false);
    expect(isTerminalPaymentStatus("PENDING")).toBe(false);
  });

  it("isTerminalFulfillmentStatus identifies FULFILLED as terminal", () => {
    expect(isTerminalFulfillmentStatus("FULFILLED")).toBe(true);
    expect(isTerminalFulfillmentStatus("PARTIAL")).toBe(false);
    expect(isTerminalFulfillmentStatus("UNFULFILLED")).toBe(false);
  });
});

describe("validateStatusCoherence", () => {
  it("rejects DELIVERED without PAID payment", () => {
    const result = validateStatusCoherence("DELIVERED", "PENDING");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/entregado/i);
  });

  it("rejects SHIPPED without PAID payment", () => {
    const result = validateStatusCoherence("SHIPPED", "VERIFYING");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/enviado/i);
  });

  it("accepts DELIVERED with PAID payment", () => {
    expect(validateStatusCoherence("DELIVERED", "PAID")).toEqual({
      valid: true,
    });
  });

  it("accepts SHIPPED with PAID payment", () => {
    expect(validateStatusCoherence("SHIPPED", "PAID")).toEqual({
      valid: true,
    });
  });

  it("doesn't impose payment constraints on PENDING/PROCESSING", () => {
    expect(validateStatusCoherence("PENDING", "PENDING").valid).toBe(true);
    expect(validateStatusCoherence("PROCESSING", "PENDING").valid).toBe(true);
  });
});
