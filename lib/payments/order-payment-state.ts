/**
 * Transiciones de estado orden↔pago que las pasarelas externas (MercadoPago,
 * PayPal, Culqi) comparten. Server-only.
 *
 * Por qué existe este módulo:
 *
 * Cada confirmación de pasarela hacía su propio `order.update` con su propia
 * idea de cuándo una orden puede pasar a PAGADA. La condición efectiva era
 * "si no está ya PAID", lo que dejaba pasar órdenes CANCELADAS: un pago que
 * llega tras la cancelación (el cliente completa el checkout de la pasarela
 * minutos después de que un admin canceló) marcaba la orden PAID con el stock
 * ya devuelto al inventario, y esa orden se enviaba sin unidades que la
 * respalden. Concentrar aquí la regla evita que las tres implementaciones
 * vuelvan a divergir.
 *
 * Ver también `lib/payments/verify-pending-payment.ts`, que hace lo propio
 * para los pagos de verificación manual (Yape/Plin).
 */

import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { releaseOrderStock } from "@/lib/inventory/release-order-stock";

const log = logger.child({ module: "order-payment-state" });

/**
 * Estados desde los que una orden ya NO admite un pago.
 *
 * CANCELLED y REFUNDED son terminales y ya devolvieron el inventario;
 * confirmarlos vendería unidades inexistentes. DELIVERED no aparece porque es
 * inalcanzable sin pago previo (`updateOrderStatus` lo impide).
 */
const NON_PAYABLE_ORDER_STATUS = ["CANCELLED", "REFUNDED"] as const;
const NON_PAYABLE_PAYMENT_STATUS = ["PAID", "REFUNDED"] as const;

export type ClaimOrderAsPaidResult =
  /** La orden era pagable y este flujo ganó el claim: ejecuta los efectos. */
  | { outcome: "claimed" }
  /** Otro flujo (webhook vs retorno) ya la marcó pagada: no repitas efectos. */
  | { outcome: "already-paid" }
  /** La orden ya no admite pago. El dinero cobrado necesita intervención. */
  | {
      outcome: "not-payable";
      status: OrderStatus;
      paymentStatus: PaymentStatus;
    };

/**
 * Marca una orden como pagada de forma atómica, sólo si sigue siendo pagable.
 *
 * Es un compare-and-swap: la lectura previa de la orden que hace el llamador
 * NO es una garantía (entre esa lectura y la escritura caben una cancelación o
 * una segunda entrega del webhook). El `updateMany` condicionado sí lo es, y
 * `count` distingue quién ganó.
 */
export async function claimOrderAsPaid(
  orderId: string,
  data: Prisma.OrderUpdateManyMutationInput,
): Promise<ClaimOrderAsPaidResult> {
  const claim = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: { notIn: [...NON_PAYABLE_ORDER_STATUS] },
      paymentStatus: { notIn: [...NON_PAYABLE_PAYMENT_STATUS] },
    },
    // La caducidad de la reserva se limpia aquí, no en cada llamador: una orden
    // pagada ya no tiene reserva que vencer. Ponerlo en el helper evita que una
    // pasarela futura se olvide y el barrido acabe cancelando pedidos cobrados.
    // (El barrido además filtra por estado de pago, así que esto es la segunda
    // barrera, no la única.)
    data: { ...data, reservationExpiresAt: null },
  });

  if (claim.count > 0) {
    return { outcome: "claimed" };
  }

  // El claim falló: releer para saber por qué. Puede ser inocuo (una carrera
  // que ya la dejó pagada) o grave (cobramos sobre una orden cancelada).
  const current = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentStatus: true },
  });

  if (!current || current.paymentStatus === "PAID") {
    return { outcome: "already-paid" };
  }

  return {
    outcome: "not-payable",
    status: current.status,
    paymentStatus: current.paymentStatus,
  };
}

export interface OrphanPaymentInput {
  orderId: string;
  orderNumber: string;
  provider: string;
  /** Id del pago/captura en la pasarela: es lo que se usa para reembolsar. */
  providerPaymentId: string;
  amount: number | null;
  currency: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}

/**
 * Deja constancia de un cobro que llegó sobre una orden que ya no lo admite.
 *
 * No lo resolvemos automáticamente: reembolsar requiere la integración por
 * proveedor que aún no existe (ver auditoría, F-06). Lo que sí hacemos es que
 * el dinero no desaparezca en silencio — queda en el log de error y en las
 * notas del pedido, que es donde un admin lo ve.
 */
export async function recordOrphanPayment(input: OrphanPaymentInput): Promise<void> {
  log.error(
    {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      amount: input.amount,
      currency: input.currency,
      orderStatus: input.status,
      paymentStatus: input.paymentStatus,
    },
    "Payment received on a non-payable order — money needs manual reconciliation",
  );

  const stamp = new Date().toISOString();
  const note =
    `[${stamp}] COBRO SIN APLICAR: ${input.provider} confirmó un pago ` +
    `(${input.providerPaymentId}${
      input.amount != null ? `, ${input.amount} ${input.currency ?? ""}`.trimEnd() : ""
    }) sobre una orden en estado ${input.status}/${input.paymentStatus}. ` +
    `La orden NO se marcó pagada. Revisar y reembolsar en el panel de ${input.provider}.`;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        select: { adminNotes: true },
      });
      if (!order) return;

      // Ya anotado (webhook reintentado): no duplicar la nota.
      if (order.adminNotes?.includes(input.providerPaymentId)) return;

      await tx.order.update({
        where: { id: input.orderId },
        data: {
          adminNotes: order.adminNotes ? `${order.adminNotes}\n\n${note}` : note,
        },
      });
    });
  } catch (error) {
    // La nota es un extra sobre el log de error; no puede tumbar el webhook.
    log.error({ err: error, orderId: input.orderId }, "Failed to annotate orphan payment");
  }
}

export interface CancelOrderForFailedPaymentInput {
  orderId: string;
  orderNumber: string;
  /** Texto que queda en el historial de inventario. */
  reason: string;
  paymentDetails?: Prisma.InputJsonValue;
}

export interface CancelOrderForFailedPaymentResult {
  cancelled: boolean;
  restoredUnits: number;
}

/**
 * Cierra una orden cuyo pago falló de forma TERMINAL y devuelve al inventario
 * lo que todavía retenía, en la misma transacción.
 *
 * Sólo para estados irreversibles de la pasarela (PayPal VOIDED, MercadoPago
 * `cancelled`). Un rechazo reintentable —una tarjeta declinada en MercadoPago,
 * donde el cliente vuelve al mismo pedido y prueba otro medio— NO debe pasar
 * por aquí: liberar su stock dejaría la orden viva sin unidades detrás, y el
 * reintento exitoso confirmaría un pedido que no puede surtirse.
 *
 * Idempotente por partida doble: el claim sólo prospera una vez y
 * `releaseOrderStock` calcula lo retenido desde el ledger de movimientos.
 */
export async function cancelOrderForFailedPayment(
  input: CancelOrderForFailedPaymentInput,
): Promise<CancelOrderForFailedPaymentResult> {
  return prisma.$transaction(async (tx) => {
    // No tocamos órdenes ya pagadas: devolver ese dinero es un reembolso, no
    // una cancelación, y tiene su propio flujo.
    const claim = await tx.order.updateMany({
      where: {
        id: input.orderId,
        status: { notIn: [...NON_PAYABLE_ORDER_STATUS] },
        paymentStatus: { notIn: [...NON_PAYABLE_PAYMENT_STATUS] },
      },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
        cancelledAt: new Date(),
        // Una orden cancelada ya no retiene nada: la columna sólo debe tener
        // fecha mientras haya reserva viva.
        reservationExpiresAt: null,
        ...(input.paymentDetails !== undefined
          ? { paymentDetails: input.paymentDetails }
          : {}),
      },
    });

    if (claim.count === 0) {
      return { cancelled: false, restoredUnits: 0 };
    }

    const released = await releaseOrderStock(tx, {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      reason: input.reason,
    });

    return { cancelled: true, restoredUnits: released.restoredUnits };
  });
}
