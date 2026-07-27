"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createCulqiCharge, solesToCents, formatCardInfo } from "@/lib/culqi";
import { revalidatePath } from "next/cache";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { autoEmitOnPayment } from "@/actions/sunat";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { onOrderPaid } from "@/lib/loyalty/award-purchase";

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

    // 2. Reclamar la orden ANTES de hablar con Culqi.
    //
    // Comprobar `order.paymentStatus !== "PENDING"` y cobrar después es
    // leer-luego-escribir con una llamada que MUEVE DINERO en medio: la ventana
    // entre la comprobación y el UPDATE final es toda la petición HTTP a Culqi
    // (cientos de ms). Dos envíos concurrentes —doble clic, reintento tras un
    // timeout de red— leían ambos PENDING, pasaban ambos la comprobación y
    // generaban DOS cargos reales sobre la misma orden.
    //
    // El claim atómico deja la orden en VERIFYING; sólo un flujo puede
    // ganarlo, y el resto se detiene aquí sin llegar a cobrar.
    const claim = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: "PENDING" },
      data: { paymentStatus: "VERIFYING" },
    });

    if (claim.count === 0) {
      return {
        success: false,
        error: "Esta orden ya fue procesada o tiene un pago en curso.",
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

    // 4. Si el cargo falló, soltar el claim para que el cliente pueda
    // reintentar con otra tarjeta. Sin esto la orden quedaría atascada en
    // VERIFYING y ningún intento posterior podría reclamarla.
    //
    // EXCEPCIÓN: si el resultado es indeterminado (la petición murió por red)
    // no liberamos. El cargo pudo haberse creado en Culqi sin que llegáramos a
    // enterarnos, y permitir el reintento cobraría dos veces. La orden queda
    // en VERIFYING para que un admin la concilie contra el panel de Culqi;
    // si el cargo existía, el webhook la marcará PAID por su cuenta.
    if (!chargeResult.success || !chargeResult.data) {
      console.error("❌ Culqi charge failed:", chargeResult.error);

      if (chargeResult.indeterminate) {
        console.error(
          `⚠️ Orden ${order.orderNumber} queda en VERIFYING: resultado de Culqi indeterminado, requiere conciliación manual.`,
        );
        return {
          success: false,
          error:
            "No pudimos confirmar el estado de tu pago. No vuelvas a intentarlo: revisaremos tu orden y te confirmaremos en breve.",
        };
      }

      await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: "VERIFYING" },
        data: { paymentStatus: "PENDING" },
      });

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
        } satisfies Prisma.InputJsonValue,
        paidAt: new Date(),
      },
    });

    // Contabilizar la compra en el CRM/lealtad (idempotente).
    await onOrderPaid(order.id);

    try {
      await autoEmitOnPayment(order.id);
    } catch (emitError) {
      console.error("SUNAT auto-emission failed (payment still confirmed):", emitError);
    }

    // NOTA: El inventario YA se descontó atómicamente en createOrder (para
    // tarjeta/PayPal el stock se reserva al crear la orden). NO volver a
    // descontar aquí — hacerlo causaba doble/triple descuento (createOrder +
    // processCardPayment + webhook) y stock negativo.

    // 7. Enviar email de confirmación
    try {
      const emailSettings = await getSiteSettings();
      const orderDisplayNumber = displayOrderNumber(order, emailSettings.order_prefix || "PED");
      await sendOrderConfirmationEmail({
        orderNumber: orderDisplayNumber,
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
          customDesignImages: (item.customDesignImages as unknown as Array<{ zoneId: string; url: string }> | null) ?? undefined,
        })),
        shippingAddress: order.shippingAddress as unknown as { address: string; district: string; city: string; department: string },
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