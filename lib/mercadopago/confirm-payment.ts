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

const log = logger.child({ module: "mercadopago-confirm" });

export type ConfirmResult =
  | { ok: true; orderId: string; status: "paid" | "failed" | "pending" | "ignored" }
  | { ok: false; error: string };

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
    return { ok: false, error: "No se pudo verificar el pago en MercadoPago" };
  }

  const orderId = payment.externalReference;
  if (!orderId) {
    log.error({ paymentId }, "Payment without external_reference");
    return { ok: false, error: "Pago sin referencia de orden" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    log.error({ paymentId, orderId }, "Order not found for payment");
    return { ok: false, error: "Orden no encontrada" };
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
      return { ok: false, error: "El monto del pago no coincide con la orden" };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
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
      },
    });

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

  // ----- Pago rechazado / cancelado -----
  if (payment.status === "rejected" || payment.status === "cancelled") {
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
    log.info({ orderId, status: payment.status }, "MercadoPago payment not approved");
    return { ok: true, orderId, status: "failed" };
  }

  // ----- Pendiente / en proceso / autorizado: dejar la orden como está -----
  log.info({ orderId, status: payment.status }, "MercadoPago payment still pending");
  return { ok: true, orderId, status: "pending" };
}
