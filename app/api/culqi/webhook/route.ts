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
import { verifyCulqiWebhookSignature } from "@/lib/culqi";
import { revalidatePath } from "next/cache";

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
    // 1. Leer el body
    const rawBody = await request.text();
    const signature = request.headers.get("X-Culqi-Signature");

    console.log("📥 Culqi webhook received");

    // 2. Verificar firma (si Culqi la envía)
    if (signature && !verifyCulqiWebhookSignature(rawBody, signature)) {
      console.error("❌ Invalid Culqi webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 3. Parsear evento
    const event: CulqiWebhookEvent = JSON.parse(rawBody);
    console.log("📦 Culqi event:", event.type, event.id);

    // 4. Procesar según tipo de evento
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
        console.log(`⚠️ Unhandled Culqi event type: ${event.type}`);
    }

    // 5. Retornar 200 OK
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Error processing Culqi webhook:", error);
    
    // Retornar 500 para que Culqi reintente
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

  if (!orderId) {
    console.warn("⚠️ Charge succeeded but no order_id in metadata");
    return;
  }

  console.log(`✅ Charge succeeded for order ${orderId}`);

  // Buscar la orden
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    console.error(`❌ Order ${orderId} not found`);
    return;
  }

  // Si ya está pagada, no hacer nada
  if (order.paymentStatus === "PAID") {
    console.log(`ℹ️ Order ${orderId} already marked as paid`);
    return;
  }

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

  // Reducir inventario si no se ha hecho
  for (const item of order.items) {
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });

      await prisma.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          type: "SALE",
          quantity: -item.quantity,
          reason: `Venta orden #${order.orderNumber} (webhook)`,
          reference: order.id,
        },
      });
    } else if (item.productId) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });

      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: "SALE",
          quantity: -item.quantity,
          reason: `Venta orden #${order.orderNumber} (webhook)`,
          reference: order.id,
        },
      });
    }
  }

  // Revalidar páginas
  revalidatePath("/admin/ordenes");
  revalidatePath(`/orden/${orderId}/confirmacion`);

  console.log(`✅ Order ${order.orderNumber} updated via webhook`);
}

/**
 * Manejar cargo fallido
 */
async function handleChargeFailed(event: CulqiWebhookEvent) {
  const { data } = event;
  const orderId = data.metadata?.order_id;

  if (!orderId) {
    console.warn("⚠️ Charge failed but no order_id in metadata");
    return;
  }

  console.log(`❌ Charge failed for order ${orderId}`);

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

  console.log(`💰 Refund succeeded for charge ${chargeId}`);

  // Buscar orden por chargeId
  const order = await prisma.order.findFirst({
    where: { paymentId: chargeId },
  });

  if (!order) {
    console.error(`❌ Order with chargeId ${chargeId} not found`);
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

  console.log(`✅ Order ${order.orderNumber} refunded via webhook`);
}

// GET no permitido
export async function GET() {
  return NextResponse.json(
    { message: "Culqi webhook endpoint - POST only" },
    { status: 405 }
  );
}