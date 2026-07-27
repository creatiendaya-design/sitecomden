/**
 * Tests de la política de reserva.
 *
 * Lo que importa: que sólo caduquen los métodos que descuentan stock ANTES de
 * cobrar. Marcar caducidad de más cancela ventas reales (COD); marcarla de
 * menos deja el agujero que este trabajo cierra.
 */

import { describe, it, expect, afterEach } from "vitest";

import {
  DEFAULT_RESERVATION_MINUTES,
  SWEEPABLE_PAYMENT_STATUS,
  reservationExpiryFor,
  reservationMinutes,
  reservesStockBeforePayment,
} from "./reservation-policy";

const ORIGINAL = process.env.ORDER_RESERVATION_MINUTES;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ORDER_RESERVATION_MINUTES;
  else process.env.ORDER_RESERVATION_MINUTES = ORIGINAL;
});

describe("reservesStockBeforePayment", () => {
  it("las pasarelas reservan antes de cobrar", () => {
    expect(reservesStockBeforePayment("CARD")).toBe(true);
    expect(reservesStockBeforePayment("MERCADOPAGO")).toBe(true);
    expect(reservesStockBeforePayment("PAYPAL")).toBe(true);
  });

  it("Yape y Plin no reservan: su stock se descuenta al aprobar el comprobante", () => {
    expect(reservesStockBeforePayment("YAPE")).toBe(false);
    expect(reservesStockBeforePayment("PLIN")).toBe(false);
  });

  it("COD no caduca: es un pedido comprometido, no un checkout a medias", () => {
    expect(reservesStockBeforePayment("COD")).toBe(false);
  });
});

describe("reservationExpiryFor", () => {
  const now = new Date("2026-07-27T10:00:00.000Z");

  it("fija la caducidad a la ventana configurada para las pasarelas", () => {
    const expiry = reservationExpiryFor("CARD", now);

    expect(expiry).toEqual(
      new Date(now.getTime() + DEFAULT_RESERVATION_MINUTES * 60_000),
    );
  });

  it("devuelve null para los métodos que no reservan", () => {
    expect(reservationExpiryFor("YAPE", now)).toBeNull();
    expect(reservationExpiryFor("PLIN", now)).toBeNull();
    expect(reservationExpiryFor("COD", now)).toBeNull();
  });
});

describe("reservationMinutes", () => {
  it("usa el valor por defecto sin configuración", () => {
    delete process.env.ORDER_RESERVATION_MINUTES;
    expect(reservationMinutes()).toBe(DEFAULT_RESERVATION_MINUTES);
  });

  it("respeta el valor del entorno", () => {
    process.env.ORDER_RESERVATION_MINUTES = "30";
    expect(reservationMinutes()).toBe(30);
  });

  it("ignora un valor no numérico en vez de romper el checkout", () => {
    process.env.ORDER_RESERVATION_MINUTES = "no-es-un-numero";
    expect(reservationMinutes()).toBe(DEFAULT_RESERVATION_MINUTES);
  });

  it("acota valores absurdos por arriba y por abajo", () => {
    process.env.ORDER_RESERVATION_MINUTES = "0";
    expect(reservationMinutes()).toBe(5);

    process.env.ORDER_RESERVATION_MINUTES = "999999";
    expect(reservationMinutes()).toBe(60 * 24 * 7);
  });
});

describe("SWEEPABLE_PAYMENT_STATUS", () => {
  it("barre lo pendiente y lo rechazado-reintentable", () => {
    expect(SWEEPABLE_PAYMENT_STATUS).toContain("PENDING");
    expect(SWEEPABLE_PAYMENT_STATUS).toContain("FAILED");
  });

  // La exclusión que importa: VERIFYING significa cobro en vuelo o pendiente de
  // conciliación manual (el caso indeterminado de Culqi). Cancelarlo
  // automáticamente crearía el cobro sobre orden cancelada que estamos evitando.
  it("nunca barre un cobro en vuelo ni uno ya cobrado", () => {
    expect(SWEEPABLE_PAYMENT_STATUS).not.toContain("VERIFYING");
    expect(SWEEPABLE_PAYMENT_STATUS).not.toContain("PAID");
    expect(SWEEPABLE_PAYMENT_STATUS).not.toContain("REFUNDED");
  });
});
