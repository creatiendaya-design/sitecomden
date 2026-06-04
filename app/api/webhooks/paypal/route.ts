/**
 * Webhook de PayPal.
 *
 * Flujo seguro:
 *  1. Verificar la firma del webhook contra la API de PayPal (si hay webhookId).
 *  2. Extraer el id de la orden de PayPal del evento.
 *  3. captureAndConfirmPaypalOrder re-verifica/captura contra la API y marca la
 *     orden (nunca confiamos en el payload del webhook por sí solo).
 *
 * Docs: https://developer.paypal.com/api/rest/webhooks/
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { verifyPaypalWebhookSignature } from "@/lib/paypal/client";
import { captureAndConfirmPaypalOrder } from "@/lib/paypal/confirm-payment";

const log = logger.child({ module: "paypal-webhook" });

export const runtime = "nodejs";

interface PaypalEvent {
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
  };
}

function extractPaypalOrderId(event: PaypalEvent): string | null {
  const type = event.event_type ?? "";
  const resource = event.resource ?? {};

  if (type.startsWith("CHECKOUT.ORDER.")) {
    return resource.id ?? null;
  }
  if (type.startsWith("PAYMENT.CAPTURE.")) {
    return resource.supplementary_data?.related_ids?.order_id ?? null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verificación de firma contra la API de PayPal (si webhookId está configurado).
    const verified = await verifyPaypalWebhookSignature(
      {
        transmissionId: request.headers.get("paypal-transmission-id"),
        transmissionTime: request.headers.get("paypal-transmission-time"),
        certUrl: request.headers.get("paypal-cert-url"),
        authAlgo: request.headers.get("paypal-auth-algo"),
        transmissionSig: request.headers.get("paypal-transmission-sig"),
      },
      rawBody
    );

    if (verified === false) {
      log.warn("Invalid PayPal webhook signature");
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    let event: PaypalEvent = {};
    try {
      event = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      event = {};
    }

    const paypalOrderId = extractPaypalOrderId(event);
    if (paypalOrderId) {
      const result = await captureAndConfirmPaypalOrder(paypalOrderId);
      if (!result.ok) {
        log.error({ paypalOrderId, error: result.error }, "Failed to confirm PayPal payment");
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error({ err: error }, "PayPal webhook processing failed");
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "PayPal webhook endpoint - POST only" },
    { status: 405 }
  );
}
