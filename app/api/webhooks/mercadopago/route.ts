/**
 * Webhook de MercadoPago (Checkout Pro).
 *
 * Recibe notificaciones cuando cambia el estado de un pago. El flujo seguro es:
 *  1. Validar la firma `x-signature` con el secret del webhook (si está configurado).
 *  2. Extraer el id del pago de la notificación.
 *  3. Re-verificar el pago contra la API de MercadoPago y marcar la orden
 *     (esto lo hace confirmMercadoPagoPayment — nunca confiamos en el payload).
 *
 * Docs: https://www.mercadopago.com.pe/developers/es/docs/your-integrations/notifications/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { logger } from "@/lib/logger";
import { getMercadoPagoWebhookSecret } from "@/lib/mercadopago/config";
import { confirmMercadoPagoPayment } from "@/lib/mercadopago/confirm-payment";

const log = logger.child({ module: "mercadopago-webhook" });

export const runtime = "nodejs";

interface MercadoPagoNotification {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let notification: MercadoPagoNotification = {};
    try {
      notification = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      notification = {};
    }

    const url = new URL(request.url);
    const queryTopic = url.searchParams.get("topic") ?? url.searchParams.get("type");
    const queryDataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

    // Validación de firma (solo si hay secret configurado). El secret se
    // genera en MercadoPago → Tus integraciones → Webhooks.
    const secret = await getMercadoPagoWebhookSecret();
    if (secret) {
      const dataId = queryDataId ?? notification.data?.id;
      try {
        WebhookSignatureValidator.validate({
          xSignature: request.headers.get("x-signature"),
          xRequestId: request.headers.get("x-request-id"),
          dataId: dataId != null ? String(dataId) : null,
          secret,
          toleranceSeconds: 600,
        });
      } catch (sigError) {
        if (sigError instanceof InvalidWebhookSignatureError) {
          log.warn({ reason: sigError.reason }, "Invalid MercadoPago webhook signature");
          return NextResponse.json({ error: "invalid signature" }, { status: 401 });
        }
        throw sigError;
      }
    }

    // Solo nos interesan notificaciones de pago.
    const isPayment =
      notification.type === "payment" || queryTopic === "payment";
    const paymentId = notification.data?.id ?? queryDataId;

    if (isPayment && paymentId != null) {
      const result = await confirmMercadoPagoPayment(String(paymentId));
      if (!result.ok) {
        log.error({ paymentId, error: result.error }, "Failed to confirm MercadoPago payment");
      }
    }

    // Siempre 200 para que MercadoPago no reintente indefinidamente por errores
    // de procesamiento nuestros (la firma inválida sí devuelve 401 arriba).
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error({ err: error }, "MercadoPago webhook processing failed");
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "MercadoPago webhook endpoint - POST only" },
    { status: 405 }
  );
}
