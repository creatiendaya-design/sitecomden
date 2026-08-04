/**
 * Captura + confirmación de pago de PayPal (server-only, idempotente).
 *
 * Única fuente de verdad para marcar una orden como pagada vía PayPal. Captura
 * la orden de PayPal si aún está aprobada (o lee su estado si ya se capturó),
 * valida que el `custom_id` corresponda a nuestra orden y que divisa e importe
 * coincidan con lo que la orden debe cobrar, y marca PAID. La invocan tanto el
 * retorno del cliente como el webhook; ambos pueden correr en carrera y el
 * resultado es idempotente.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { capturePaypalOrder, getPaypalOrder, type PaypalOrderInfo } from "./client";
import { readPaypalSettings, convertPenToCharge } from "./config";
import { onOrderPaid } from "@/lib/loyalty/award-purchase";
import { publicSiteUrl } from "@/lib/site-url";
import {
  cancelOrderForFailedPayment,
  claimOrderAsPaid,
  isDuplicateProviderPayment,
  recordOrphanPayment,
} from "@/lib/payments/order-payment-state";

const log = logger.child({ module: "paypal-confirm" });

export type ConfirmResult =
  | {
      ok: true;
      orderId: string;
      /** `orphaned`: se cobró sobre una orden que ya no admitía pago. */
      status: "paid" | "failed" | "pending" | "ignored" | "orphaned";
    }
  | {
      ok: false;
      error: string;
      /**
       * `true` cuando volver a intentar puede prosperar (PayPal caído, tipo de
       * cambio sin configurar). El webhook lo traduce en un 5xx para que PayPal
       * reentregue el evento; con `false` responde 200 y deja de insistir,
       * porque el problema no se arregla repitiendo (importe que no cuadra,
       * orden inexistente).
       */
      retryable: boolean;
    };

/**
 * Captura (si procede) y confirma un pago de PayPal por id de orden de PayPal.
 */
export async function captureAndConfirmPaypalOrder(
  paypalOrderId: string
): Promise<ConfirmResult> {
  // Estado actual en PayPal (evita doble captura en carrera retorno/webhook).
  let info: PaypalOrderInfo | null = await getPaypalOrder(paypalOrderId);
  if (!info) {
    return { ok: false, error: "No se pudo verificar la orden en PayPal", retryable: true };
  }

  const orderId = info.customId;
  if (!orderId) {
    log.error({ paypalOrderId }, "PayPal order without custom_id");
    return { ok: false, error: "Orden de PayPal sin referencia", retryable: false };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    log.error({ paypalOrderId, orderId }, "Order not found for PayPal order");
    return { ok: false, error: "Orden no encontrada", retryable: false };
  }

  /**
   * Idempotencia — y detección del segundo cobro distinto.
   *
   * La página puente crea una orden de PayPal nueva en cada visita, así que un
   * cliente puede tener dos aprobadas para el mismo pedido y completar las dos.
   * Antes ambas caían aquí y se respondía `ignored`: el segundo importe quedaba
   * capturado en PayPal sin rastro en el sistema y nadie lo devolvía.
   *
   * Sólo cuenta como duplicado si la captura EXISTE: una orden de PayPal creada y
   * abandonada no cobró nada, y anotarla como huérfana llenaría los pedidos de
   * avisos falsos.
   */
  if (order.paymentStatus === "PAID") {
    const incomingPaymentId = info.captureId ?? info.id;
    const capturedForReal =
      info.status === "COMPLETED" && info.captureStatus === "COMPLETED";

    if (capturedForReal && isDuplicateProviderPayment(order.paymentId, incomingPaymentId)) {
      await recordOrphanPayment({
        orderId,
        orderNumber: order.orderNumber,
        provider: "PayPal",
        providerPaymentId: incomingPaymentId,
        amount: info.amountValue,
        currency: info.currencyCode,
        status: order.status,
        paymentStatus: order.paymentStatus,
        kind: "duplicate",
        appliedPaymentId: order.paymentId,
      });
      revalidatePath("/admin/ordenes");
      return { ok: true, orderId, status: "orphaned" };
    }

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
      return { ok: false, error: "La divisa del pago no coincide con la configurada", retryable: false };
    }

    // Importe: hasta ahora sólo se comparaba la divisa, así que cualquier
    // cantidad capturada cerraba la orden como pagada. PayPal cobra en divisa
    // internacional, no en soles, así que el importe esperado es el total del
    // pedido convertido con el tipo de cambio vigente.
    //
    // A diferencia de MercadoPago (igualdad exacta, misma divisa) aquí se exige
    // "no menos de lo esperado": la conversión redondea a 2 decimales y el tipo
    // de cambio es editable, de modo que una igualdad estricta rechazaría pagos
    // legítimos ya capturados y dejaría al cliente con el dinero cobrado y sin
    // pedido. Un pago de más se acepta y queda registrado en paymentDetails.
    const expectedCharge = convertPenToCharge(Number(order.total), settings.exchangeRate);

    if (expectedCharge === null) {
      log.error(
        { paypalOrderId, orderId, exchangeRate: settings.exchangeRate },
        "PayPal exchange rate not configured — cannot validate captured amount"
      );
      return { ok: false, error: "No se pudo validar el importe del pago", retryable: true };
    }

    const expectedCents = Math.round(expectedCharge * 100);
    const paidCents = info.amountValue != null ? Math.round(info.amountValue * 100) : null;

    if (paidCents === null || paidCents < expectedCents) {
      log.error(
        { paypalOrderId, orderId, expectedCents, paidCents, totalPen: Number(order.total) },
        "PayPal amount mismatch — refusing to confirm"
      );
      return { ok: false, error: "El monto del pago no coincide con la orden", retryable: false };
    }

    // Claim atómico: la comprobación de idempotencia de arriba es
    // leer-luego-escribir, y además el `update` incondicional aceptaba órdenes
    // CANCELADAS —una cancelación entre la aprobación en PayPal y el retorno
    // dejaba la orden PAID con el stock ya devuelto al inventario—.
    const claim = await claimOrderAsPaid(orderId, {
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
        expectedAmount: expectedCharge,
        processedAt: new Date().toISOString(),
      } satisfies Prisma.InputJsonValue,
      paidAt: new Date(),
    });

    if (claim.outcome === "already-paid") {
      // La captura ya ocurrió (estamos dentro de la rama COMPLETED). Si otro
      // cobro ganó el claim en la ventana de carrera, este dinero sobra.
      const incomingPaymentId = info.captureId ?? info.id;
      if (isDuplicateProviderPayment(claim.paymentId, incomingPaymentId)) {
        await recordOrphanPayment({
          orderId,
          orderNumber: order.orderNumber,
          provider: "PayPal",
          providerPaymentId: incomingPaymentId,
          amount: info.amountValue,
          currency: info.currencyCode,
          status: order.status,
          paymentStatus: "PAID",
          kind: "duplicate",
          appliedPaymentId: claim.paymentId,
        });
        revalidatePath("/admin/ordenes");
        return { ok: true, orderId, status: "orphaned" };
      }

      log.info({ orderId, paypalOrderId }, "Order already marked paid by a concurrent flow");
      return { ok: true, orderId, status: "ignored" };
    }

    if (claim.outcome === "not-payable") {
      // El dinero ya se capturó pero la orden no puede recibirlo. No es un
      // error reintentable: que el webhook deje de insistir y lo vea un humano.
      await recordOrphanPayment({
        orderId,
        orderNumber: order.orderNumber,
        provider: "PayPal",
        providerPaymentId: info.captureId ?? info.id,
        amount: info.amountValue,
        currency: info.currencyCode,
        status: claim.status,
        paymentStatus: claim.paymentStatus,
      });
      return { ok: true, orderId, status: "orphaned" };
    }

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
      const viewOrderLink = `${publicSiteUrl()}/orden/verificar?token=${order.viewToken}&email=${encodeURIComponent(order.customerEmail)}`;
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
  // VOIDED es terminal en PayPal: la autorización ya no puede capturarse, así
  // que el pedido no va a cobrarse nunca. Antes sólo se marcaba FAILED y las
  // unidades descontadas al crear la orden quedaban retenidas para siempre.
  if (info.status === "VOIDED") {
    const result = await cancelOrderForFailedPayment({
      orderId,
      orderNumber: order.orderNumber,
      reason: "Pago anulado en PayPal",
      paymentDetails: {
        paypalOrderId: info.id,
        status: info.status,
        processedAt: new Date().toISOString(),
      } satisfies Prisma.InputJsonValue,
    });

    if (result.cancelled) {
      revalidatePath("/admin/ordenes");
    }

    log.info(
      { orderId, status: info.status, ...result },
      "PayPal order voided — order cancelled and stock released"
    );
    return { ok: true, orderId, status: "failed" };
  }

  // ----- Aún sin completar (CREATED / PAYER_ACTION_REQUIRED) -----
  log.info({ orderId, status: info.status }, "PayPal order not yet completed");
  return { ok: true, orderId, status: "pending" };
}
