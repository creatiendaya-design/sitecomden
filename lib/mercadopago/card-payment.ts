/**
 * Cobro con tarjeta vía API de MercadoPago (Checkout API + Card Payment Brick)
 * — server-only.
 *
 * Diferencia con `client.ts` (Checkout Pro): aquí NO se redirige a MercadoPago.
 * El navegador tokeniza la tarjeta con el Brick (los datos de la tarjeta viven
 * en iframes de MercadoPago, nunca tocan nuestro servidor ni nuestro DOM) y este
 * módulo crea el pago con ese token de un solo uso.
 *
 * REGLA DE ORO: el importe SIEMPRE sale de `order.total` leído de nuestra BD.
 * El ejemplo oficial de MercadoPago reenvía el `cardFormData` del navegador tal
 * cual al endpoint de pagos —incluido `transaction_amount`— lo que permitiría a
 * cualquiera cobrarse a sí mismo S/ 1 por un pedido de S/ 1000. Aquí el cliente
 * solo aporta el token y los datos de la tarjeta; el monto no es negociable.
 *
 * Docs: https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/card-payment-brick
 */

import { Payment } from "mercadopago";
import { logger } from "@/lib/logger";
import {
  buildClient,
  buildPayerIdentification,
  extractMpCause,
  extractMpStatus,
  splitFullName,
} from "./client";

const log = logger.child({ module: "mercadopago-card" });

export interface CreateCardPaymentInput {
  orderId: string;
  orderNumber: string;
  orderDisplayNumber: string;
  /** Importe a cobrar. DEBE venir de `order.total`, nunca del navegador. */
  total: number;
  customerName: string;
  customerEmail: string;
  customerDni?: string | null;
  /** URL pública base, ej. https://tienda.pe (sin slash final). */
  baseUrl: string;
  /** Token de un solo uso generado por el Brick en el navegador. */
  token: string;
  /** Ej. "visa", "master", "amex". Lo determina el Brick. */
  paymentMethodId: string;
  /** Emisor detectado por el Brick (opcional según el medio). */
  issuerId?: string | null;
  /** Cuotas elegidas por el comprador. */
  installments: number;
  /** Email que el comprador escribió en el Brick (puede diferir del de la orden). */
  payerEmail?: string | null;
  /** Documento capturado por el Brick (`{ type: "DNI", number }`). */
  payerIdentification?: { type: string; number: string } | null;
}

export type CreateCardPaymentResult =
  | {
      ok: true;
      paymentId: string;
      /** Estado crudo de MercadoPago: approved / rejected / in_process / pending. */
      status: string;
      statusDetail: string;
    }
  | { ok: false; error: string };

/**
 * Crea el pago con tarjeta. Idempotente por token: el mismo token enviado dos
 * veces (doble click, reintento de red) devuelve el MISMO pago en lugar de
 * cobrar dos veces. Un intento nuevo con otra tarjeta genera otro token y, por
 * tanto, otro pago — que es justo lo que queremos tras un rechazo.
 */
export async function createMercadoPagoCardPayment(
  input: CreateCardPaymentInput
): Promise<CreateCardPaymentResult> {
  const mp = await buildClient();
  if (!mp) {
    return {
      ok: false,
      error: "MercadoPago no está configurado. Contacta al administrador.",
    };
  }

  const base = input.baseUrl.replace(/\/$/, "");
  const { name, surname } = splitFullName(input.customerName);

  // El documento del Brick manda (es el que el comprador acaba de teclear junto
  // a la tarjeta); el DNI del pedido queda como respaldo.
  const identification =
    input.payerIdentification ?? buildPayerIdentification(input.customerDni);

  // `issuer_id` es numérico en la API. Un valor no numérico se convertiría en
  // NaN y MercadoPago rechazaría el pago entero por un campo que es opcional:
  // ante la duda, se omite.
  const issuerId = input.issuerId != null ? Number(input.issuerId) : null;
  const hasIssuer = issuerId !== null && Number.isFinite(issuerId);

  try {
    const payment = await new Payment(mp.client).create({
      body: {
        transaction_amount: Number(input.total),
        token: input.token,
        description: `Orden ${input.orderDisplayNumber}`,
        installments: input.installments,
        payment_method_id: input.paymentMethodId,
        ...(hasIssuer ? { issuer_id: issuerId } : {}),
        payer: {
          email: input.payerEmail || input.customerEmail,
          first_name: name,
          last_name: surname,
          ...(identification ? { identification } : {}),
        },
        external_reference: input.orderId,
        notification_url: `${base}/api/webhooks/mercadopago`,
        metadata: {
          order_id: input.orderId,
          order_number: input.orderNumber,
        },
        statement_descriptor: "TIENDA",
      },
      requestOptions: {
        // Ver doc del módulo: la clave incluye el token justamente para que un
        // reintento con OTRA tarjeta no quede bloqueado por el intento anterior.
        idempotencyKey: `mp-card-${input.orderId}-${input.token}`,
      },
    });

    const paymentId = payment.id ? String(payment.id) : null;
    if (!paymentId) {
      log.error({ orderId: input.orderId }, "MercadoPago card payment without id");
      return { ok: false, error: "MercadoPago no devolvió el pago. Intenta nuevamente." };
    }

    log.info(
      {
        orderId: input.orderId,
        paymentId,
        status: payment.status,
        statusDetail: payment.status_detail,
        mode: mp.mode,
      },
      "MercadoPago card payment created"
    );

    return {
      ok: true,
      paymentId,
      status: payment.status ?? "",
      statusDetail: payment.status_detail ?? "",
    };
  } catch (error) {
    log.error(
      {
        err: error,
        orderId: input.orderId,
        mode: mp.mode,
        mpStatus: extractMpStatus(error),
        mpCause: extractMpCause(error),
      },
      "Failed to create MercadoPago card payment"
    );
    return {
      ok: false,
      error:
        "No se pudo procesar el pago con tarjeta. Verifica los datos e intenta nuevamente.",
    };
  }
}

/**
 * Traduce el `status_detail` de MercadoPago a algo accionable en español.
 *
 * Sin esto el cliente ve "cc_rejected_bad_filled_security_code" o, peor, un
 * genérico "pago rechazado" que le hace reintentar la misma tarjeta hasta que
 * el banco se la bloquea. Cada mensaje dice QUÉ hacer a continuación.
 *
 * Docs: https://www.mercadopago.com.pe/developers/es/docs/checkout-api/response-handling/collection-results
 */
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Revisa el número de tarjeta.",
  cc_rejected_bad_filled_date: "Revisa la fecha de vencimiento.",
  cc_rejected_bad_filled_security_code: "Revisa el código de seguridad (CVV).",
  cc_rejected_bad_filled_other: "Revisa los datos de la tarjeta.",
  cc_rejected_call_for_authorize:
    "Tu banco debe autorizar este pago. Llámalo y vuelve a intentar.",
  cc_rejected_card_disabled:
    "Tu tarjeta está inactiva. Llama a tu banco para activarla o usa otra.",
  cc_rejected_card_error: "No pudimos procesar esa tarjeta. Intenta con otra.",
  cc_rejected_duplicated_payment:
    "Ya hiciste un pago por ese monto. Si necesitas pagar de nuevo, usa otra tarjeta.",
  cc_rejected_high_risk:
    "Tu banco rechazó el pago por seguridad. Prueba con otro medio de pago.",
  cc_rejected_insufficient_amount: "Tu tarjeta no tiene fondos suficientes.",
  cc_rejected_invalid_installments:
    "Tu tarjeta no admite esa cantidad de cuotas. Elige otra opción.",
  cc_rejected_max_attempts:
    "Alcanzaste el límite de intentos. Usa otra tarjeta u otro medio de pago.",
  cc_rejected_blacklist: "No pudimos procesar el pago. Usa otro medio de pago.",
  cc_rejected_other_reason: "Tu banco rechazó el pago. Intenta con otra tarjeta.",
};

/** Mensaje para el comprador a partir del `status_detail` del pago rechazado. */
export function rejectionMessage(statusDetail: string): string {
  return (
    REJECTION_MESSAGES[statusDetail] ??
    "Tu banco rechazó el pago. Intenta con otra tarjeta u otro medio de pago."
  );
}
