/**
 * Barrido de reservas de inventario vencidas. Server-only.
 *
 * Las órdenes de pasarela (CARD / MERCADOPAGO / PAYPAL) descuentan stock al
 * crearse, antes de que exista el pago. Como la mayoría de los checkouts se
 * abandonan, sin caducidad esas unidades quedaban retenidas para siempre: la
 * tienda se quedaba "sin stock" sola, sin que nadie la atacara. Lo mismo con
 * los rechazos reintentables, que mantienen el pedido vivo a propósito.
 *
 * Al vencer, la orden se CANCELA y devuelve su stock. Se eligió cancelar en vez
 * de sólo liberar para no abrir una ventana de sobreventa: si el pedido siguiera
 * vivo sin unidades detrás, un pago tardío lo confirmaría y no habría con qué
 * surtirlo. El pago que llegue después entra por el camino de cobro huérfano
 * (`recordOrphanPayment`), que lo deja anotado para reembolso manual.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cancelOrderForFailedPayment } from "@/lib/payments/order-payment-state";
import { SWEEPABLE_PAYMENT_STATUS } from "./reservation-policy";

const log = logger.child({ module: "release-expired-reservations" });

/**
 * Tope de órdenes por pasada. Acota el tiempo de la función y el número de
 * transacciones; si hay más acumuladas, la siguiente pasada sigue drenando.
 */
export const DEFAULT_BATCH_LIMIT = 100;

export interface ReleaseExpiredReservationsResult {
  /** Órdenes vencidas encontradas en esta pasada. */
  scanned: number;
  /** Órdenes efectivamente canceladas por este barrido. */
  cancelled: number;
  /** Unidades devueltas al inventario. */
  restoredUnits: number;
  /**
   * Órdenes que ya no estaban cancelables cuando les llegó el turno (otro flujo
   * las pagó o canceló entre la consulta y la escritura). No es un error.
   */
  skipped: number;
  /** Órdenes cuya cancelación falló; quedan para la siguiente pasada. */
  failed: number;
}

/**
 * Cancela y libera las órdenes cuya reserva ya venció.
 *
 * Idempotente por partida doble: `cancelOrderForFailedPayment` sólo prospera si
 * la orden sigue siendo cancelable, y `releaseOrderStock` calcula lo retenido
 * desde el ledger de movimientos, así que una segunda pasada sobre la misma
 * orden no devuelve stock de más.
 *
 * Cada orden va en su propia transacción a propósito: un fallo aislado (una fila
 * bloqueada, un error de red) no debe abortar el resto del lote.
 */
export async function releaseExpiredReservations(options?: {
  now?: Date;
  batchLimit?: number;
}): Promise<ReleaseExpiredReservationsResult> {
  const now = options?.now ?? new Date();
  const batchLimit = options?.batchLimit ?? DEFAULT_BATCH_LIMIT;

  const expired = await prisma.order.findMany({
    where: {
      reservationExpiresAt: { not: null, lte: now },
      // El estado del pedido lo vuelve a comprobar `cancelOrderForFailedPayment`
      // dentro de la transacción; esto sólo acota el lote.
      status: { notIn: ["CANCELLED", "REFUNDED", "SHIPPED", "DELIVERED"] },
      paymentStatus: { in: [...SWEEPABLE_PAYMENT_STATUS] },
    },
    orderBy: { reservationExpiresAt: "asc" },
    take: batchLimit,
    select: { id: true, orderNumber: true, paymentMethod: true },
  });

  const result: ReleaseExpiredReservationsResult = {
    scanned: expired.length,
    cancelled: 0,
    restoredUnits: 0,
    skipped: 0,
    failed: 0,
  };

  for (const order of expired) {
    try {
      const outcome = await cancelOrderForFailedPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: "Reserva vencida sin pago",
      });

      if (outcome.cancelled) {
        result.cancelled += 1;
        result.restoredUnits += outcome.restoredUnits;
        log.info(
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            restoredUnits: outcome.restoredUnits,
          },
          "Expired reservation released",
        );
      } else {
        // Otro flujo ganó la carrera entre la consulta y la transacción.
        result.skipped += 1;
      }
    } catch (error) {
      // Una orden problemática no puede llevarse por delante el lote: sigue
      // vencida y la próxima pasada volverá a intentarlo.
      result.failed += 1;
      log.error(
        { err: error, orderId: order.id, orderNumber: order.orderNumber },
        "Failed to release expired reservation",
      );
    }
  }

  return result;
}
