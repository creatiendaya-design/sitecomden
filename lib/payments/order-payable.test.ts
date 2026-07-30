/**
 * Tests del predicado que decide si se puede ABRIR un pago.
 *
 * Lo que importa aquí: que no se emita nunca una URL cobrable para un pedido que
 * ya no puede surtirse. Cada `false` de estos correspondía antes a una sesión de
 * pasarela real, perfectamente pagable, cuyo dinero acababa en un cobro huérfano
 * que alguien tenía que reembolsar a mano.
 */

import { describe, it, expect } from "vitest";

import {
  canStartPayment,
  NON_PAYABLE_ORDER_STATUS,
  NON_PAYABLE_PAYMENT_STATUS,
  NON_STARTABLE_PAYMENT_STATUS,
  type PaymentStartCandidate,
} from "./order-payable";

const NOW = new Date("2026-07-29T12:00:00.000Z");

function order(overrides: Partial<PaymentStartCandidate> = {}): PaymentStartCandidate {
  return {
    status: "PENDING",
    paymentStatus: "PENDING",
    reservationExpiresAt: null,
    ...overrides,
  };
}

describe("canStartPayment", () => {
  it("permite pagar un pedido pendiente sin caducidad", () => {
    expect(canStartPayment(order(), NOW)).toEqual({ canStart: true });
  });

  it("permite pagar mientras la reserva siga viva", () => {
    const alive = new Date(NOW.getTime() + 60_000);
    expect(canStartPayment(order({ reservationExpiresAt: alive }), NOW)).toEqual({
      canStart: true,
    });
  });

  it("permite reintentar tras un rechazo (FAILED sigue siendo pagable)", () => {
    expect(canStartPayment(order({ paymentStatus: "FAILED" }), NOW).canStart).toBe(true);
  });

  it("bloquea un pedido ya pagado", () => {
    const result = canStartPayment(order({ status: "PAID", paymentStatus: "PAID" }), NOW);
    expect(result).toMatchObject({ canStart: false, reason: "already-paid" });
  });

  // El agujero original: sólo se comprobaba PAID, así que una orden cancelada
  // —que ya devolvió su stock al inventario— obtenía una URL de pago válida.
  it("bloquea un pedido cancelado aunque su pago siga PENDING", () => {
    const result = canStartPayment(
      order({ status: "CANCELLED", paymentStatus: "PENDING" }),
      NOW,
    );
    expect(result).toMatchObject({ canStart: false, reason: "order-terminal" });
  });

  it("bloquea un pedido reembolsado por estado de orden", () => {
    const result = canStartPayment(order({ status: "REFUNDED" }), NOW);
    expect(result).toMatchObject({ canStart: false, reason: "order-terminal" });
  });

  it("bloquea un pedido reembolsado por estado de pago", () => {
    const result = canStartPayment(order({ paymentStatus: "REFUNDED" }), NOW);
    expect(result).toMatchObject({ canStart: false, reason: "order-terminal" });
  });

  // VERIFYING significa cobro en vuelo o pendiente de conciliación manual: abrir
  // otra sesión ahí es la forma más directa de cobrar dos veces.
  it("bloquea cuando ya hay un cobro en verificación", () => {
    const result = canStartPayment(order({ paymentStatus: "VERIFYING" }), NOW);
    expect(result).toMatchObject({ canStart: false, reason: "payment-in-flight" });
  });

  it("bloquea cuando la reserva de stock ya venció", () => {
    const expired = new Date(NOW.getTime() - 1);
    const result = canStartPayment(order({ reservationExpiresAt: expired }), NOW);
    expect(result).toMatchObject({ canStart: false, reason: "reservation-expired" });
  });

  it("trata la caducidad exacta como vencida", () => {
    const result = canStartPayment(order({ reservationExpiresAt: new Date(NOW) }), NOW);
    expect(result).toMatchObject({ canStart: false, reason: "reservation-expired" });
  });

  it("siempre explica el motivo al cliente cuando bloquea", () => {
    const blocked = [
      order({ status: "CANCELLED" }),
      order({ paymentStatus: "PAID" }),
      order({ paymentStatus: "VERIFYING" }),
      order({ reservationExpiresAt: new Date(NOW.getTime() - 1) }),
    ];

    for (const candidate of blocked) {
      const result = canStartPayment(candidate, NOW);
      expect(result.canStart).toBe(false);
      if (!result.canStart) {
        expect(result.message.length).toBeGreaterThan(20);
      }
    }
  });
});

describe("listas de estados compartidas", () => {
  // Si el iniciador y el claim final no comparten la misma lista de terminales,
  // vuelve a abrirse el hueco que ambos intentan cerrar.
  it("el claim final excluye cancelada y reembolsada", () => {
    expect(NON_PAYABLE_ORDER_STATUS).toEqual(["CANCELLED", "REFUNDED"]);
    expect(NON_PAYABLE_PAYMENT_STATUS).toEqual(["PAID", "REFUNDED"]);
  });

  // El iniciador es MÁS estricto que el claim: éste debe poder confirmar una
  // orden VERIFYING, aquél no debe abrir un pago nuevo sobre ella.
  it("el iniciador añade VERIFYING sobre los terminales del claim", () => {
    expect(NON_STARTABLE_PAYMENT_STATUS).toContain("VERIFYING");
    for (const status of NON_PAYABLE_PAYMENT_STATUS) {
      expect(NON_STARTABLE_PAYMENT_STATUS).toContain(status);
    }
  });
});
