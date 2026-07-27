/**
 * Política de reserva de inventario: quién reserva, por cuánto tiempo y qué
 * órdenes puede barrer el job de vencimiento.
 *
 * Vive aparte del checkout y del cron porque los dos necesitan la MISMA regla:
 * si `createOrder` marca una caducidad que el barrido no reconoce (o al revés),
 * el resultado son reservas inmortales o pedidos cancelados de más. Un solo
 * sitio, dos consumidores.
 */

import type { PaymentMethod, PaymentStatus } from "@prisma/client";

/**
 * Métodos que descuentan stock ANTES de que exista el pago y, por tanto,
 * necesitan caducidad.
 *
 * Fuera quedan, por motivos distintos:
 *  - YAPE / PLIN: no tocan inventario al crear la orden. El stock se descuenta
 *    cuando un admin aprueba el comprobante, así que no hay nada que caducar.
 *  - COD: sí descuenta al crear, pero es un pedido comprometido (se paga contra
 *    entrega), no un checkout a medias. Cancelarlo por inactividad sería
 *    cancelar ventas reales.
 */
const RESERVING_PAYMENT_METHODS: readonly PaymentMethod[] = [
  "CARD",
  "MERCADOPAGO",
  "PAYPAL",
];

export function reservesStockBeforePayment(method: PaymentMethod): boolean {
  return RESERVING_PAYMENT_METHODS.includes(method);
}

/**
 * Minutos que una orden de pasarela retiene stock sin haber pagado.
 *
 * Una hora por defecto: cubre de sobra el ida y vuelta a MercadoPago o PayPal
 * (incluido el cliente que se distrae) sin inmovilizar inventario un día
 * entero. Ajustable por entorno para tiendas con tickets altos o pasarelas
 * lentas, sin recompilar.
 */
export const DEFAULT_RESERVATION_MINUTES = 60;

/** Cotas de cordura: un valor absurdo por env no debe romper el checkout. */
const MIN_RESERVATION_MINUTES = 5;
const MAX_RESERVATION_MINUTES = 60 * 24 * 7;

export function reservationMinutes(): number {
  const raw = process.env.ORDER_RESERVATION_MINUTES;
  if (!raw) return DEFAULT_RESERVATION_MINUTES;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_RESERVATION_MINUTES;

  return Math.min(Math.max(parsed, MIN_RESERVATION_MINUTES), MAX_RESERVATION_MINUTES);
}

/**
 * Fecha de caducidad para una orden nueva, o `null` si su método no reserva.
 * `null` se escribe tal cual en la columna y significa "no caduca".
 */
export function reservationExpiryFor(
  method: PaymentMethod,
  now: Date = new Date(),
): Date | null {
  if (!reservesStockBeforePayment(method)) return null;
  return new Date(now.getTime() + reservationMinutes() * 60_000);
}

/**
 * Estados de pago cuya reserva el barrido PUEDE liberar.
 *
 * `VERIFYING` queda deliberadamente fuera y es la exclusión importante:
 * significa que hay un cobro en vuelo o pendiente de conciliación manual.
 * `processCardPayment` deja ahí las órdenes cuyo resultado con Culqi fue
 * indeterminado (la red murió, el cargo pudo haberse creado) precisamente para
 * que un humano las revise. Cancelarlas automáticamente convertiría ese caso en
 * un cobro sobre orden cancelada, que es justo lo que estamos evitando.
 *
 * `FAILED` sí entra: es el rechazo reintentable —una tarjeta declinada en
 * MercadoPago mantiene el pedido vivo para que el cliente pruebe otro medio—.
 * Sin caducidad esas unidades quedaban retenidas indefinidamente.
 */
export const SWEEPABLE_PAYMENT_STATUS: readonly PaymentStatus[] = [
  "PENDING",
  "FAILED",
];
