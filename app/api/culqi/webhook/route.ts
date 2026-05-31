/**
 * Webhook de Culqi
 * 
 * Este endpoint recibe notificaciones de Culqi cuando ocurren eventos importantes:
 * - charge.succeeded: Cargo exitoso
 * - charge.failed: Cargo fallido
 * - refund.succeeded: Reembolso exitoso
 * 
 * Documentación: https://docs.culqi.com/es/documentacion/webhooks/
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCulqiCharge } from "@/lib/culqi";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "culqi-webhook" });

// Deshabilitar body parsing para poder leer el raw body
export const runtime = "nodejs";

interface CulqiWebhookEvent {
  object: string;
  id: string;
  type: string; // "charge.succeeded", "charge.failed", "refund.succeeded"
  data: {
    object: string;
    id: string;
    amount: number;
    currency_code: string;
    email: string;
    outcome?: {
      type: string;
      code: string;
      merchant_message: string;
      user_message: string;
    };
    metadata?: {
      order_id?: string;
      order_number?: string;
    };
    reference_code?: string;
    authorization_code?: string;
    source?: {
      card_number: string;
      last_four: string;
      iin: {
        card_brand: string;
        card_type: string;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const event: CulqiWebhookEvent = JSON.parse(rawBody);

    switch (event.type) {
      case "charge.succeeded":
        await handleChargeSucceeded(event);
        break;

      case "charge.failed":
        await handleChargeFailed(event);
        break;

      case "refund.succeeded":
        await handleRefundSucceeded(event);
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error({ err: error }, "Culqi webhook processing failed");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Manejar cargo exitoso
 */
async function handleChargeSucceeded(event: CulqiWebhookEvent) {
  const { data } = event;
  const orderId = data.metadata?.order_id;

  if (!orderId) return;

  // Verificar contra la API de Culqi que el cargo realmente existe y fue exitoso.
  // Culqi no firma webhooks, así que esta llamada de vuelta es la única prueba confiable.
  const isValid = await verifyCulqiCharge(data.id, data.amount, data.currency_code);
  if (!isValid) {
    log.error({ chargeId: data.id }, "Charge failed verification against Culqi API");
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return;

  if (order.paymentStatus === "PAID") return;

  // Actualizar orden
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentStatus: "PAID",
      paymentId: data.id,
      paymentProvider: "culqi",
      paymentDetails: {
        chargeId: data.id,
        authorizationCode: data.authorization_code,
        referenceCode: data.reference_code,
        cardBrand: data.source?.iin?.card_brand,
        cardLastFour: data.source?.last_four,
        cardType: data.source?.iin?.card_type,
        amount: data.amount,
        currency: data.currency_code,
        webhookProcessedAt: new Date().toISOString(),
      } as any,
      paidAt: new Date(),
    },
  });

  // NOTA: El inventario para órdenes con tarjeta YA se descontó atómicamente
  // en createOrder al crear la orden. NO descontar aquí — duplicaba el
  // descuento (createOrder + webhook) y dejaba el stock en negativo.

  // Revalidar páginas
  revalidatePath("/admin/ordenes");
  revalidatePath(`/orden/${orderId}/confirmacion`);

  log.info({ orderNumber: order.orderNumber, orderId: order.id }, "Order updated via webhook");
}

/**
 * Manejar cargo fallido
 */
async function handleChargeFailed(event: CulqiWebhookEvent) {
  const { data } = event;
  const orderId = data.metadata?.order_id;

  if (!orderId) {
    log.warn("Charge failed webhook received without order_id metadata");
    return;
  }

  log.info({ orderId }, "Charge failed for order");

  // Actualizar orden como fallida
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "FAILED",
      paymentDetails: {
        chargeId: data.id,
        failureReason: data.outcome?.user_message,
        failureCode: data.outcome?.code,
        webhookProcessedAt: new Date().toISOString(),
      } as any,
    },
  });

  revalidatePath("/admin/ordenes");
}

/**
 * Manejar reembolso exitoso
 */
async function handleRefundSucceeded(event: CulqiWebhookEvent) {
  const { data } = event;
  const chargeId = data.id;

  log.info({ chargeId }, "Refund succeeded for charge");

  // Buscar orden por chargeId
  const order = await prisma.order.findFirst({
    where: { paymentId: chargeId },
  });

  if (!order) {
    log.error({ chargeId }, "Order with given chargeId not found on refund");
    return;
  }

  // Actualizar orden como reembolsada
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
    },
  });

  revalidatePath("/admin/ordenes");

  log.info({ orderNumber: order.orderNumber, orderId: order.id }, "Order refunded via webhook");
}

// GET no permitido
export async function GET() {
  return NextResponse.json(
    { message: "Culqi webhook endpoint - POST only" },
    { status: 405 }
  );
}