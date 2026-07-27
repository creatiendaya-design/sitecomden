/**
 * Confirmación de pago de MercadoPago (server-only, idempotente).
 *
 * Es la única fuente de verdad para marcar una orden como pagada vía MercadoPago.
 * SIEMPRE re-verifica el pago contra la API de MercadoPago (no confía en el
 * payload del webhook ni en los query params del retorno del cliente) y valida
 * que el `external_reference` corresponda a la orden y que el monto/moneda
 * coincidan con `order.total`. La invocan tanto el webhook como el retorno.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { getMercadoPagoPayment } from "./client";
import { MERCADOPAGO_CURRENCY } from "./config";
import { onOrderPaid } from "@/lib/loyalty/award-purchase";
import {
  cancelOrderForFailedPayment,
  claimOrderAsPaid,
  recordOrphanPayment,
} from "@/lib/payments/order-payment-state";

const log = logger.child({ module: "mercadopago-confirm" });

export type ConfirmResult =
  | {
      ok: true;
      orderId: string;
      /** `orphaned`: se cobró sobre una orden que ya no admitía pago. */
      status: "paid" | "failed" | "pending" | "ignored" | "refunded" | "orphaned";
    }
  | {
      ok: false;
      error: string;
      /**
       * `true` cuando volver a intentar puede prosperar (MercadoPago o la BD no
       * respondieron). El webhook lo traduce en un 5xx para que MercadoPago
       * reentregue el evento; con `false` responde 200 y deja de insistir,
       * porque repetir no arregla el problema (importe que no cuadra, pago sin
       * referencia de orden).
       */
      retryable: boolean;
    };

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "http://localhost:3000"
  );
}

/**
 * Confirma un pago de MercadoPago por su id. Idempotente: si la orden ya está
 * pagada no hace nada. Marca PAID solo si el pago está `approved` y el monto
 * coincide; marca FAILED si fue `rejected`/`cancelled`.
 */
export async function confirmMercadoPagoPayment(
  paymentId: string
): Promise<ConfirmResult> {
  const payment = await getMercadoPagoPayment(paymentId);
  if (!payment) {
    return { ok: false, error: "No se pudo verificar el pago en MercadoPago", retryable: true };
  }

  const orderId = payment.externalReference;
  if (!orderId) {
    log.error({ paymentId }, "Payment without external_reference");
    return { ok: false, error: "Pago sin referencia de orden", retryable: false };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    log.error({ paymentId, orderId }, "Order not found for payment");
    return { ok: false, error: "Orden no encontrada", retryable: false };
  }

  // ----- Reembolso parcial desde el panel: NO soportado (solo total) -----
  // No aplicamos efectos totales (descuadrarían stock/puntos); avisamos para que
  // un admin lo maneje a mano. `ignored` (no `pending`) evita reintentos.
  if (payment.status === "partially_refunded") {
    log.warn(
      { orderId, paymentId },
      "Partial refund from MercadoPago panel — not supported, needs manual handling"
    );
    return { ok: true, orderId, status: "ignored" };
  }

  // ----- Reembolso TOTAL hecho desde el panel de MercadoPago -----
  // (Va antes de la idempotencia de PAID: una orden pagada que se reembolsa
  // desde MercadoPago debe procesarse aquí.)
  if (payment.status === "refunded") {
    // Solo si estaba pagada. Si llega out-of-order sobre una orden no pagada (o
    // ya reembolsada), lo ignoramos: no es error, así el webhook no reintenta.
    if (order.paymentStatus !== "PAID") {
      log.warn(
        { orderId, paymentStatus: order.paymentStatus },
        "Refund webhook on non-PAID order, ignored"
      );
      return { ok: true, orderId, status: "ignored" };
    }
    const { applyRefund } = await import("@/lib/orders/apply-refund");
    const res = await applyRefund(orderId, { source: "webhook" });
    if (!res.ok) {
      return { ok: false, error: res.error ?? "No se pudo aplicar el reembolso", retryable: true };
    }
    log.info({ orderId }, "Order refunded via MercadoPago webhook");
    return { ok: true, orderId, status: "refunded" };
  }

  // Idempotencia: no re-procesar una orden ya pagada.
  if (order.paymentStatus === "PAID") {
    return { ok: true, orderId, status: "ignored" };
  }

  // ----- Pago aprobado -----
  if (payment.status === "approved") {
    const expectedCents = Math.round(Number(order.total) * 100);
    const paidCents = Math.round(payment.transactionAmount * 100);

    if (payment.currencyId !== MERCADOPAGO_CURRENCY || paidCents !== expectedCents) {
      log.error(
        {
          paymentId,
          orderId,
          expectedCents,
          paidCents,
          currency: payment.currencyId,
        },
        "Payment amount/currency mismatch — refusing to confirm"
      );
      return { ok: false, error: "El monto del pago no coincide con la orden", retryable: false };
    }

    // Claim atómico en lugar del `update` directo: la comprobación de
    // idempotencia de arriba es leer-luego-escribir, así que dos entregas
    // concurrentes del webhook (o webhook + retorno del usuario) podían pasar
    // ambas. Aquí el daño era leve —escriben los mismos valores— pero con el
    // claim los efectos posteriores corren una sola vez.
    //
    // La condición NO puede ser sólo "no está PAID": una orden CANCELADA la
    // cumple, y confirmarla la dejaba pagada con el stock ya devuelto al
    // inventario. `claimOrderAsPaid` exige además que siga siendo pagable.
    const claim = await claimOrderAsPaid(orderId, {
      status: "PAID",
      paymentStatus: "PAID",
      paymentId: payment.id,
      paymentProvider: "mercadopago",
      paymentDetails: {
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.statusDetail,
        paymentMethodId: payment.paymentMethodId,
        amount: payment.transactionAmount,
        currency: payment.currencyId,
        processedAt: new Date().toISOString(),
      } satisfies Prisma.InputJsonValue,
      paidAt: new Date(),
    });

    if (claim.outcome === "already-paid") {
      log.info({ orderId, paymentId }, "Order already marked paid by a concurrent flow");
      return { ok: true, orderId, status: "ignored" };
    }

    if (claim.outcome === "not-payable") {
      // Dinero cobrado sobre una orden que ya no lo admite. `ok: true` a
      // propósito: reintentar el webhook no lo va a arreglar, tiene que verlo
      // un humano.
      await recordOrphanPayment({
        orderId,
        orderNumber: order.orderNumber,
        provider: "MercadoPago",
        providerPaymentId: payment.id,
        amount: payment.transactionAmount,
        currency: payment.currencyId,
        status: claim.status,
        paymentStatus: claim.paymentStatus,
      });
      return { ok: true, orderId, status: "orphaned" };
    }

    // Contabilizar la compra en el CRM/lealtad (idempotente).
    await onOrderPaid(orderId);

    // NOTA: el inventario ya se descontó atómicamente en createOrder (para
    // MercadoPago el stock se reserva al crear la orden, igual que tarjeta).
    // NO descontar aquí — duplicaría el descuento.

    // SUNAT: emisión automática del comprobante (no bloquea la confirmación).
    try {
      const { autoEmitOnPayment } = await import("@/actions/sunat");
      await autoEmitOnPayment(order.id);
    } catch (emitError) {
      log.error({ err: emitError, orderId }, "SUNAT auto-emission failed (payment still confirmed)");
    }

    // Email de pago aprobado (no bloquea la confirmación).
    try {
      const { sendPaymentApprovedEmail } = await import("@/lib/email");
      const emailSettings = await getSiteSettings();
      const orderDisplayNumber = displayOrderNumber(order, emailSettings.order_prefix || "PED");
      const viewOrderLink = `${appBaseUrl()}/orden/verificar?token=${order.viewToken}&email=${encodeURIComponent(order.customerEmail)}`;
      await sendPaymentApprovedEmail(
        orderDisplayNumber,
        order.customerName,
        order.customerEmail,
        Number(order.total),
        viewOrderLink
      );
    } catch (emailError) {
      log.error({ err: emailError, orderId }, "Payment-approved email failed");
    }

    revalidatePath("/admin/ordenes");
    revalidatePath(`/orden/${orderId}/confirmacion`);

    log.info({ orderNumber: order.orderNumber, orderId }, "Order confirmed via MercadoPago");
    return { ok: true, orderId, status: "paid" };
  }

  // ----- Pago cancelado (terminal) -----
  // `cancelled` significa que ese intento ya no puede prosperar (expiró o lo
  // canceló el pagador). El pedido no se va a cobrar por esta vía, así que se
  // cierra y devuelve al inventario lo que todavía retenía; antes sólo se
  // marcaba FAILED y las unidades quedaban retenidas indefinidamente.
  if (payment.status === "cancelled") {
    const result = await cancelOrderForFailedPayment({
      orderId,
      orderNumber: order.orderNumber,
      reason: "Pago cancelado en MercadoPago",
      paymentDetails: {
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.statusDetail,
        processedAt: new Date().toISOString(),
      } satisfies Prisma.InputJsonValue,
    });

    if (result.cancelled) {
      revalidatePath("/admin/ordenes");
    }

    log.info(
      { orderId, status: payment.status, ...result },
      "MercadoPago payment cancelled — order cancelled and stock released"
    );
    return { ok: true, orderId, status: "failed" };
  }

  // ----- Pago rechazado (reintentable) -----
  // A diferencia de `cancelled`, un rechazo NO cierra el pedido: la pantalla de
  // fallo de MercadoPago devuelve al cliente a /pago-mercadopago, que genera una
  // preferencia nueva sobre la MISMA orden para que pruebe otro medio de pago.
  //
  // Por eso aquí no se libera el stock: hacerlo dejaría la orden viva sin
  // unidades detrás, y el reintento exitoso confirmaría un pedido que no se
  // puede surtir. El precio es que una tarjeta declinada mantiene la reserva
  // hasta que un admin cancele el pedido — cerrar ese hueco correctamente
  // requiere la reserva con expiración (auditoría, F-01), no liberar aquí.
  if (payment.status === "rejected") {
    // (Ya retornamos arriba si estaba PAID; aquí solo evitamos pisar REFUNDED.)
    if (order.paymentStatus !== "REFUNDED") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "FAILED",
          paymentDetails: {
            paymentId: payment.id,
            status: payment.status,
            statusDetail: payment.statusDetail,
            processedAt: new Date().toISOString(),
          } satisfies Prisma.InputJsonValue,
        },
      });
      revalidatePath("/admin/ordenes");
    }
    log.info({ orderId, status: payment.status }, "MercadoPago payment rejected (order kept for retry)");
    return { ok: true, orderId, status: "failed" };
  }

  // ----- Pendiente / en proceso / autorizado: dejar la orden como está -----
  log.info({ orderId, status: payment.status }, "MercadoPago payment still pending");
  return { ok: true, orderId, status: "pending" };
}
