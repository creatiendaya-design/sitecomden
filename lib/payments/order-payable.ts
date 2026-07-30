/**
 * ¿Puede esta orden recibir un pago AHORA? Predicado único, puro y server/client
 * safe, compartido por TODOS los iniciadores de pago.
 *
 * Por qué existe:
 *
 * Cada punto de entrada al pago tenía su propia idea de "orden pagable", y todas
 * coincidían en la misma versión pobre: `paymentStatus === "PAID"`. Esa condición
 * deja pasar una orden CANCELADA o REEMBOLSADA —que ya devolvió su stock al
 * inventario— y también una cuya reserva caducó. El resultado es una URL de pago
 * válida y cobrable sobre un pedido que ya no puede surtirse: el dinero entra y
 * `claimOrderAsPaid` lo rechaza al final, convirtiéndolo en un cobro huérfano que
 * alguien tiene que reembolsar a mano.
 *
 * La regla correcta es no llegar a emitir esa URL. Este módulo la centraliza para
 * que `startGatewayCheckout`, las páginas puente de MercadoPago/PayPal, la página
 * de tarjeta y el claim de Culqi no puedan volver a divergir.
 *
 * Relación con `order-payment-state.ts`: allí vive el claim FINAL (el
 * compare-and-swap que marca PAID). Este predicado es la barrera de ENTRADA y es
 * deliberadamente más estricto — ver `NON_STARTABLE_PAYMENT_STATUS`.
 */

import type { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * Estados de orden terminales: ya devolvieron el inventario, así que confirmar
 * un pago sobre ellos vendería unidades inexistentes.
 *
 * DELIVERED no aparece porque es inalcanzable sin pago previo
 * (`updateOrderStatus` lo impide), y por tanto ya lo cubre `PAID`.
 */
export const NON_PAYABLE_ORDER_STATUS = ["CANCELLED", "REFUNDED"] as const;

/** Estados de pago terminales para el claim final. */
export const NON_PAYABLE_PAYMENT_STATUS = ["PAID", "REFUNDED"] as const;

/**
 * Estados de pago desde los que NO se debe ABRIR un nuevo intento de pago.
 *
 * Añade `VERIFYING` a los terminales, y ésa es la diferencia importante con el
 * claim final: `VERIFYING` significa que hay un cobro en vuelo o pendiente de
 * conciliación manual. `processCardPayment` deja ahí las órdenes cuyo resultado
 * con Culqi fue indeterminado (la red murió, el cargo pudo haberse creado)
 * precisamente para que un humano las revise; el barrido de reservas también las
 * excluye a propósito. Abrir una sesión nueva de pasarela en ese estado es la
 * forma más directa de cobrar dos veces al mismo cliente.
 *
 * El claim final sí debe aceptar `VERIFYING` — es justo el estado que confirma.
 */
export const NON_STARTABLE_PAYMENT_STATUS = [
  ...NON_PAYABLE_PAYMENT_STATUS,
  "VERIFYING",
] as const;

export type PaymentStartBlockedReason =
  | "order-terminal"
  | "already-paid"
  | "payment-in-flight"
  | "reservation-expired";

export interface PaymentStartCandidate {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /**
   * Caducidad de la reserva de stock. `null` significa "no caduca" (Yape/Plin,
   * COD, y toda orden ya pagada). Ver `lib/inventory/reservation-policy.ts`.
   */
  reservationExpiresAt?: Date | null;
}

export type PaymentStartState =
  | { canStart: true }
  | {
      canStart: false;
      reason: PaymentStartBlockedReason;
      /** Texto apto para mostrar al cliente: explica y dice qué hacer. */
      message: string;
    };

/**
 * Decide si se puede iniciar un pago para la orden dada.
 *
 * El orden de las comprobaciones importa para el mensaje: "ya fue pagada" es más
 * útil que "estado terminal" cuando ambas aplican.
 */
export function canStartPayment(
  order: PaymentStartCandidate,
  now: Date = new Date(),
): PaymentStartState {
  if (order.paymentStatus === "PAID") {
    return {
      canStart: false,
      reason: "already-paid",
      message: "Esta orden ya fue pagada.",
    };
  }

  if ((NON_PAYABLE_ORDER_STATUS as readonly string[]).includes(order.status)) {
    return {
      canStart: false,
      reason: "order-terminal",
      message:
        "Este pedido ya está cerrado y no admite pagos. Si necesitas el producto, haz un pedido nuevo.",
    };
  }

  if (
    (NON_STARTABLE_PAYMENT_STATUS as readonly string[]).includes(order.paymentStatus)
  ) {
    // Aquí sólo pueden quedar REFUNDED y VERIFYING: PAID salió arriba.
    return order.paymentStatus === "REFUNDED"
      ? {
          canStart: false,
          reason: "order-terminal",
          message:
            "Este pedido ya fue reembolsado y no admite pagos. Si necesitas el producto, haz un pedido nuevo.",
        }
      : {
          canStart: false,
          reason: "payment-in-flight",
          message:
            "Ya hay un pago de este pedido en verificación. No vuelvas a pagar: te confirmaremos en breve.",
        };
  }

  // Reserva vencida: el stock que respaldaba el pedido puede haberse liberado ya
  // (o lo liberará el barrido en la próxima pasada). Cobrar aquí produce un
  // pedido pagado sin unidades detrás, que es el caso que más cuesta deshacer.
  if (order.reservationExpiresAt && order.reservationExpiresAt.getTime() <= now.getTime()) {
    return {
      canStart: false,
      reason: "reservation-expired",
      message:
        "El tiempo para pagar este pedido expiró y liberamos el stock reservado. Vuelve a hacer el pedido para completar la compra.",
    };
  }

  return { canStart: true };
}
