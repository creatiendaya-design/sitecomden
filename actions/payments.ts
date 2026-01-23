"use server";

import { prisma } from "@/lib/db";
import { createCulqiCharge, solesToCents, formatCardInfo } from "@/lib/culqi";
import { revalidatePath } from "next/cache";
import { sendOrderConfirmationEmail } from "@/lib/email";

/**
 * Procesar pago con tarjeta usando Culqi
 */
export async function processCardPayment(data: {
  orderId: string;
  culqiToken: string;
  email: string;
}) {
  try {
    // 1. Obtener la orden
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });

    if (!order) {
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // 2. Verificar que la orden esté pendiente de pago
    if (order.paymentStatus !== "PENDING") {
      return {
        success: false,
        error: "Esta orden ya fue procesada",
      };
    }

    // 3. Crear cargo en Culqi
    const totalInCents = solesToCents(Number(order.total));

    const chargeResult = await createCulqiCharge({
      amount: totalInCents,
      currency_code: "PEN",
      email: data.email,
      source_id: data.culqiToken,
      description: `Orden #${order.orderNumber}`,
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
      },
    });

    // 4. Si el cargo falló, retornar error
    if (!chargeResult.success || !chargeResult.data) {
      console.error("❌ Culqi charge failed:", chargeResult.error);
      
      return {
        success: false,
        error: chargeResult.error || "Error al procesar el pago",
      };
    }

    const charge = chargeResult.data;
    console.log("✅ Culqi charge successful:", charge.id);

    // 5. Actualizar orden con información del pago
    const cardInfo = formatCardInfo(charge);
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentStatus: "PAID",
        paymentId: charge.id,
        paymentProvider: "culqi",
        paymentDetails: {
          chargeId: charge.id,
          authorizationCode: charge.authorization_code,
          referenceCode: charge.reference_code,
          cardBrand: cardInfo.brand,
          cardLastFour: cardInfo.lastFour,
          cardType: cardInfo.type,
          amount: charge.amount,
          currency: charge.currency_code,
          createdAt: new Date(charge.creation_date * 1000).toISOString(),
        } as any,
        paidAt: new Date(),
      },
    });

    // 6. Reducir inventario de productos
    for (const item of order.items) {
      if (item.variantId) {
        // Producto con variante
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });

        // Registrar movimiento de inventario
        await prisma.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: "SALE",
            quantity: -item.quantity,
            reason: `Venta orden #${order.orderNumber}`,
            reference: order.id,
          },
        });
      } else if (item.productId) {
        // Producto simple
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Registrar movimiento de inventario
        await prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: "SALE",
            quantity: -item.quantity,
            reason: `Venta orden #${order.orderNumber}`,
            reference: order.id,
          },
        });
      }
    }

    // 7. Enviar email de confirmación
    try {
      await sendOrderConfirmationEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: Number(order.total),
        paymentMethod: "CARD",
        viewOrderLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orden/${order.id}/confirmacion?token=${order.viewToken}`,
        items: order.items.map((item) => ({
          name: item.name,
          variantName: item.variantName || undefined,
          quantity: item.quantity,
          price: Number(item.price),
          image: item.image || undefined,
        })),
        shippingAddress: order.shippingAddress as any,
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // No fallar el proceso si el email falla
    }

    // 8. Revalidar páginas
    revalidatePath("/admin/ordenes");
    revalidatePath(`/orden/${order.id}/confirmacion`);

    console.log(`✅ Order ${order.orderNumber} paid successfully with Culqi`);

    return {
      success: true,
      orderId: order.id,
      chargeId: charge.id,
    };
  } catch (error) {
    console.error("❌ Error processing card payment:", error);
    
    return {
      success: false,
      error: "Error inesperado al procesar el pago. Por favor intenta nuevamente.",
    };
  }
}