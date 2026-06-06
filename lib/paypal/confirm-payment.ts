/**
 * Captura + confirmación de pago de PayPal (server-only, idempotente).
 *
 * Única fuente de verdad para marcar una orden como pagada vía PayPal. Captura
 * la orden de PayPal si aún está aprobada (o lee su estado si ya se capturó),
 * valida que el `custom_id` corresponda a nuestra orden y la divisa coincida con
 * la configurada, y marca PAID. La invocan tanto el retorno del cliente como el
 * webhook; ambos pueden correr en carrera y el resultado es idempotente.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { capturePaypalOrder, getPaypalOrder, type PaypalOrderInfo } from "./client";
import { readPaypalSettings } from "./config";
import { onOrderPaid } from "@/lib/loyalty/award-purchase";

const log = logger.child({ module: "paypal-confirm" });

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
 * Captura (si procede) y confirma un pago de PayPal por id de orden de PayPal.
 */
export async function captureAndConfirmPaypalOrder(
  paypalOrderId: string
): Promise<ConfirmResult> {
  // Estado actual en PayPal (evita doble captura en carrera retorno/webhook).
  let info: PaypalOrderInfo | null = await getPaypalOrder(paypalOrderId);
  if (!info) {
    return { ok: false, error: "No se pudo verificar la orden en PayPal" };
  }

  const orderId = info.customId;
  if (!orderId) {
    log.error({ paypalOrderId }, "PayPal order without custom_id");
    return { ok: false, error: "Orden de PayPal sin referencia" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    log.error({ paypalOrderId, orderId }, "Order not found for PayPal order");
    return { ok: false, error: "Orden no encontrada" };
  }

  // Idempotencia.
  if (order.paymentStatus === "PAID") {
    return { ok: true, orderId, status: "ignored" };
  }

  // Si está aprobada pero no capturada, capturar ahora.
  if (info.status === "APPROVED") {
    const captured = await capturePaypalOrder(paypalOrderId);
    if (captured) info = captured;
  }

  // ----- Pago completado -----
  if (info.status === "COMPLETED" && info.captureStatus === "COMPLETED") {
    const settings = await readPaypalSettings();

    if (info.currencyCode && settings.currency && info.currencyCode !== settings.currency) {
      log.error(
        { paypalOrderId, orderId, got: info.currencyCode, expected: settings.currency },
        "PayPal currency mismatch — refusing to confirm"
      );
      return { ok: false, error: "La divisa del pago no coincide con la configurada" };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paymentStatus: "PAID",
        paymentId: info.captureId ?? info.id,
        paymentProvider: "paypal",
        paymentDetails: {
          paypalOrderId: info.id,
          captureId: info.captureId,
          captureStatus: info.captureStatus,
          amount: info.amountValue,
          currency: info.currencyCode,
          processedAt: new Date().toISOString(),
        } satisfies Prisma.InputJsonValue,
        paidAt: new Date(),
      },
    });

    // NOTA: el inventario ya se descontó en createOrder (PayPal no es manual).

    // Contabilizar la compra en el CRM/lealtad (idempotente).
    await onOrderPaid(orderId);

    try {
      const { autoEmitOnPayment } = await import("@/actions/sunat");
      await autoEmitOnPayment(order.id);
    } catch (emitError) {
      log.error({ err: emitError, orderId }, "SUNAT auto-emission failed (payment still confirmed)");
    }

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

    log.info({ orderNumber: order.orderNumber, orderId }, "Order confirmed via PayPal");
    return { ok: true, orderId, status: "paid" };
  }

  // ----- Anulada / fallida -----
  if (info.status === "VOIDED") {
    if (order.paymentStatus !== "REFUNDED") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "FAILED",
          paymentDetails: {
            paypalOrderId: info.id,
            status: info.status,
            processedAt: new Date().toISOString(),
          } satisfies Prisma.InputJsonValue,
        },
      });
      revalidatePath("/admin/ordenes");
    }
    log.info({ orderId, status: info.status }, "PayPal order voided");
    return { ok: true, orderId, status: "failed" };
  }

  // ----- Aún sin completar (CREATED / PAYER_ACTION_REQUIRED) -----
  log.info({ orderId, status: info.status }, "PayPal order not yet completed");
  return { ok: true, orderId, status: "pending" };
}
