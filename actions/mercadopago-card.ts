"use server";

/**
 * Cobro con tarjeta de MercadoPago SIN redirección (Card Payment Brick).
 *
 * El navegador tokeniza la tarjeta contra MercadoPago y nos manda solo el token;
 * aquí se crea el pago con el importe leído de la BD y se delega la aplicación
 * de efectos a `confirmMercadoPagoPayment`, exactamente la misma función que usan
 * el webhook y el retorno de Checkout Pro. Un solo camino para marcar una orden
 * pagada: si mañana cambia (SUNAT, lealtad, correos), cambia para los tres.
 */

import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { canViewOrder } from "@/lib/orders/order-access";
import { canStartPayment } from "@/lib/payments/order-payable";
import {
  createMercadoPagoCardPayment,
  rejectionMessage,
} from "@/lib/mercadopago/card-payment";
import { confirmMercadoPagoPayment } from "@/lib/mercadopago/confirm-payment";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";

const log = logger.child({ module: "mercadopago-card-action" });

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000";

/**
 * Datos que devuelve `cardPaymentBrickController.getFormData()`.
 *
 * Se validan campo a campo en vez de reenviarlos al endpoint de pagos: el
 * navegador también manda `transaction_amount`, y ese valor NO se usa (ver
 * `lib/mercadopago/card-payment.ts`). Todo lo que no esté en este schema se
 * descarta.
 */
const cardFormSchema = z.object({
  token: z.string().min(1).max(256),
  payment_method_id: z.string().min(1).max(64),
  issuer_id: z.union([z.string(), z.number()]).nullish(),
  installments: z.coerce.number().int().min(1).max(48).default(1),
  payer: z
    .object({
      email: z.string().email().max(254).optional(),
      identification: z
        .object({
          type: z.string().min(1).max(16),
          number: z.string().min(1).max(32),
        })
        .partial()
        .nullish(),
    })
    .optional(),
});

const inputSchema = z.object({
  orderId: z.string().min(1),
  viewToken: z.string().min(1).optional(),
  card: cardFormSchema,
});

export type MercadoPagoCardStatus = "approved" | "pending" | "rejected" | "error";

export interface MercadoPagoCardResult {
  status: MercadoPagoCardStatus;
  /** Mensaje listo para mostrar al comprador (vacío cuando fue aprobado). */
  message?: string;
}

export async function payOrderWithMercadoPagoCard(
  raw: unknown
): Promise<MercadoPagoCardResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    log.warn({ issues: parsed.error.issues }, "Invalid card payment input");
    return {
      status: "error",
      message: "Los datos de la tarjeta no son válidos. Revísalos e intenta otra vez.",
    };
  }

  const { orderId, viewToken, card } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { status: "error", message: "Orden no encontrada." };
  }

  const allowed = await canViewOrder({
    orderId: order.id,
    viewToken: order.viewToken,
    urlToken: viewToken,
  });
  if (!allowed) {
    return { status: "error", message: "No autorizado." };
  }

  // Misma barrera de entrada que el resto de iniciadores de pago: bloquea orden
  // cancelada/reembolsada, cobro en verificación y reserva de stock vencida.
  const payable = canStartPayment(order);
  if (!payable.canStart) {
    return { status: "error", message: payable.message };
  }

  if (order.paymentMethod !== "MERCADOPAGO") {
    return {
      status: "error",
      message: "Este pedido no se puede pagar con tarjeta de MercadoPago.",
    };
  }

  const settings = await getSiteSettings();
  const orderDisplayNumber = displayOrderNumber(order, settings.order_prefix || "PED");

  const identification =
    card.payer?.identification?.type && card.payer.identification.number
      ? {
          type: card.payer.identification.type,
          number: card.payer.identification.number,
        }
      : null;

  const created = await createMercadoPagoCardPayment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderDisplayNumber,
    // El importe sale de la BD, nunca del navegador.
    total: Number(order.total),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerDni: order.customerDni,
    baseUrl: APP_URL,
    token: card.token,
    paymentMethodId: card.payment_method_id,
    issuerId: card.issuer_id != null ? String(card.issuer_id) : null,
    installments: card.installments,
    payerEmail: card.payer?.email ?? null,
    payerIdentification: identification,
  });

  if (!created.ok) {
    return { status: "error", message: created.error };
  }

  // Aplica los efectos (marcar PAID, lealtad, SUNAT, correo) re-verificando el
  // pago contra la API. Es idempotente, así que si el webhook llega primero
  // esto no duplica nada.
  const confirmed = await confirmMercadoPagoPayment(created.paymentId);

  if (!confirmed.ok) {
    // El cobro puede existir aunque la confirmación falle (red caída a mitad).
    // No decimos "rechazado": el webhook reintentará y el pedido se conciliará.
    log.error(
      { orderId, paymentId: created.paymentId, error: confirmed.error },
      "Card payment created but confirmation failed"
    );
    return {
      status: "pending",
      message:
        "Estamos verificando tu pago. No vuelvas a pagar: te confirmaremos por correo en unos minutos.",
    };
  }

  if (confirmed.status === "paid" || confirmed.status === "ignored") {
    return { status: "approved" };
  }

  if (confirmed.status === "failed") {
    return { status: "rejected", message: rejectionMessage(created.statusDetail) };
  }

  // `orphaned` incluido: el dinero entró sobre un pedido que ya no lo admitía.
  // Un humano tiene que resolverlo, pero al comprador no se le puede decir que
  // su pago falló cuando sí se cobró.
  return {
    status: "pending",
    message:
      "Estamos verificando tu pago. No vuelvas a pagar: te confirmaremos por correo en unos minutos.",
  };
}
